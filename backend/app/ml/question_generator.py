"""
AI Question Generator — LLM pipeline with parallel provider racing.

Wave 1: Ollama + OpenAI full prompts run concurrently; first valid JSON wins (other cancelled).
Wave 2: Same for simplified prompts if wave 1 fails.

Uses a shared httpx.AsyncClient (connection pooling) for scale under many users.

Difficulty tiers: easy → intermediate → pro → mastery
Each generated question includes:
  - question_text, options (4), correct_answer
  - hint  — a nudge without giving away the answer
  - explanation — plain-language "why" written like a teacher
"""
import asyncio
import json
import re
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.http_client import get_http_client
from app.services.quiz_service import get_recent_question_stems, get_question_texts_by_ids
from app.domain_mapping import domain_scope_blurb, resolve_quiz_domain
from app.ml.history_learning import (
    fetch_style_examples_any_source,
    fetch_style_examples_openai,
    format_few_shot_block,
)

# ─── Difficulty guidance injected into every prompt ──────────────────────────
_DIFF_GUIDANCE: dict[str, str] = {
    "easy":
        "Beginner-friendly. Test basic definitions and fundamental 'what is' knowledge. "
        "Avoid trick questions — one answer should be clearly correct.",
    "intermediate":
        "Mid-level. Test understanding of HOW things work and WHY, including realistic trade-offs. "
        "Distractors should be plausible but distinguishably wrong.",
    "pro":
        "Advanced. Involve nuanced design decisions, edge cases, or multi-step reasoning. "
        "All four options should look reasonable; the correct one requires deeper knowledge.",
    "mastery":
        "Expert-level. Require deep system insight, subtle gotchas, and synthesis across multiple concepts. "
        "This should be challenging even for senior engineers.",
}

# ─── Interview / Rapid-fire mode header ──────────────────────────────────────
_INTERVIEW_HEADER = """\
You are a senior engineer at a top-tier tech company (Google / Meta / Amazon / Apple / Microsoft / Netflix).
Write a technical interview question that would genuinely appear in a MAANG phone screen or onsite loop.

The question MUST:
- Test a concept that comes up repeatedly in real interviews at these companies
- Require reasoning about trade-offs, production implications, or real-world edge cases — NOT textbook recall
- Have plausible wrong answers that a mid-level engineer might choose without sufficient depth
- Be answerable as MCQ in ~30 seconds (no whiteboard needed)

Good question angles: "Why does X behave this way in production?", "What breaks when you scale Y?",
"Which design choice is correct here and why?", "What is the hidden cost of Z?", "What subtle bug does this introduce?"\
"""

# ─── JSON field spec ─────────────────────────────────────────────────────────
_JSON_SPEC = """\
Return ONLY a valid JSON object (no markdown, no code fences) with exactly these keys:
  "question_text" : string — the question (specific, concrete, no filler)
  "options"       : array of exactly 4 distinct strings
  "correct_answer": string — must match one of the options exactly (copy-paste)
  "hint"          : string — one sentence that nudges the learner without giving the answer away
                    (e.g. "Think about what happens to memory when a function returns…")
  "explanation"   : string — 2–4 sentences explaining WHY the answer is correct, written like a
                    friendly teacher using plain language and analogies; avoid jargon dumps"""


def _full_prompt(difficulty: str, focus: str, scope_line: str, few_shot: str) -> str:
    guidance = _DIFF_GUIDANCE.get(difficulty, _DIFF_GUIDANCE["easy"])
    style_block = (
        f"Style reference — format only, DO NOT reuse these question ideas:\n{few_shot}"
        if few_shot else ""
    )
    return f"""You write concise, realistic quiz questions for a developer learning platform.

Difficulty: {difficulty} — {guidance}
Topic / focus: {focus}
Scope: {scope_line}

IMPORTANT: Generate a completely original question. Do NOT repeat or paraphrase any previously seen questions. Pick a specific sub-angle, edge case, or concept within the topic that has not been asked before.

{style_block}

{_JSON_SPEC}"""


def _interview_prompt(focus: str, scope_line: str, few_shot: str) -> str:
    """Prompt for MAANG-grade rapid-fire interview questions."""
    style_block = (
        f"Style reference — format only, DO NOT reuse these question ideas:\n{few_shot}"
        if few_shot else ""
    )
    return f"""{_INTERVIEW_HEADER}

Topic / focus: {focus}
Scope: {scope_line}

IMPORTANT: Generate a completely original question targeting a specific production scenario or common interview gotcha. Do NOT ask generic definitions.

{style_block}

{_JSON_SPEC}"""


def _simple_prompt(difficulty: str, focus: str, interview: bool = False) -> str:
    """Stripped-down prompt used as a fallback if the full prompt fails."""
    if interview:
        return f"""Write a MAANG-style technical interview question about a production scenario or trade-off in: {focus}.
The question should distinguish senior engineers from juniors. Make it concrete, not generic.

{_JSON_SPEC}"""
    return f"""Write a completely original {difficulty}-level multiple-choice quiz question about a specific aspect of: {focus}.
Do not use generic or obvious question angles. Pick something concrete and practical.

{_JSON_SPEC}"""


# ─── Duplicate detection (vs session + history stems) ───────────────────────
def _norm_question_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _is_duplicate_of_forbidden(new_text: str, forbidden_norms: set[str]) -> bool:
    """True if the generated question matches or is a near-duplicate of a forbidden stem."""
    n = _norm_question_text(new_text)
    if len(n) < 8:
        return False
    for f in forbidden_norms:
        if not f or len(f) < 8:
            continue
        if n == f:
            return True
        # Long questions: substring overlap counts as repeat
        if len(n) >= 45 and len(f) >= 45 and (n in f or f in n):
            return True
    return False


# ─── JSON parser ─────────────────────────────────────────────────────────────
def _parse_mcq(raw: str) -> Optional[Dict[str, Any]]:
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return None
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return None
    if not all(k in data for k in ("question_text", "options", "correct_answer", "explanation")):
        return None
    if len(data.get("options", [])) != 4:
        return None
    if data.get("correct_answer") not in data.get("options", []):
        return None
    return data


# ─── Ollama ───────────────────────────────────────────────────────────────────
async def _call_ollama(
    client: httpx.AsyncClient,
    prompt: str,
    temperature: float = 0.65,
) -> Optional[dict]:
    models: list[str] = []
    primary = (settings.ollama_model or "").strip()
    if primary:
        models.append(primary)
    fallbacks = [m.strip() for m in (settings.ollama_fallback_models or "").split(",") if m.strip()]
    for m in fallbacks:
        if m not in models:
            models.append(m)

    for model_name in models:
        try:
            r = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": 900},
                },
            )
            if r.status_code != 200:
                continue
            parsed = _parse_mcq(r.json().get("response", ""))
            if parsed:
                parsed.update(
                    question_type="mcq",
                    is_ai_generated=True,
                    generation_source="ollama",
                    provider_model=model_name,
                )
                return parsed
        except Exception:
            continue
    return None


# ─── OpenAI ───────────────────────────────────────────────────────────────────
async def _call_openai(
    client: httpx.AsyncClient,
    prompt: str,
    temperature: float = 0.55,
) -> Optional[dict]:
    if not settings.openai_api_key:
        return None
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.openai_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert developer educator writing quiz questions. "
                    "Reply with a single JSON object only — no markdown, no code fences."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    try:
        r = await client.post(
            f"{settings.openai_base_url.rstrip('/')}/chat/completions",
            headers=headers,
            json=body,
        )
        if r.status_code != 200:
            return None
        raw = r.json()["choices"][0]["message"]["content"]
        parsed = _parse_mcq(raw)
        if parsed:
            parsed.update(
                question_type="mcq",
                is_ai_generated=True,
                generation_source="openai",
                provider_model=settings.openai_model,
            )
        return parsed
    except Exception:
        return None


async def _race_ollama_openai(
    client: httpx.AsyncClient,
    prompt: str,
    temp_ollama: float,
    temp_openai: float,
) -> Optional[dict]:
    """Run both providers; return the first valid result and cancel the slower task."""
    t_o = asyncio.create_task(_call_ollama(client, prompt, temp_ollama))
    t_openai = asyncio.create_task(_call_openai(client, prompt, temp_openai))
    pending = {t_o, t_openai}
    try:
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for finished in done:
                try:
                    out = finished.result()
                    if out:
                        for p in pending:
                            p.cancel()
                        if pending:
                            await asyncio.gather(*pending, return_exceptions=True)
                        return out
                except Exception:
                    pass
        return None
    finally:
        for p in pending:
            if not p.done():
                p.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)


# ─── Public entry point ───────────────────────────────────────────────────────
async def get_question(
    db: AsyncSession,
    topic: str,
    difficulty: str = "easy",
    domain_hint: Optional[str] = None,
    mode: str = "learn",
    user_id: Optional[int] = None,
    exclude_ids: Optional[list[int]] = None,
) -> dict:
    """
    Generate a quiz question using the AI pipeline.

    mode='learn'     — standard adaptive quiz questions
    mode='interview' — MAANG-grade rapid-fire interview questions (ignores difficulty,
                       always targets pro/mastery level production scenarios)

    Attempts (in order):
      1. Ollama  — full prompt
      2. OpenAI  — full prompt with JSON mode
      3. Ollama  — simplified prompt (lower temperature)
      4. OpenAI  — simplified prompt

    Raises RuntimeError if generation fails or cannot produce a non-duplicate question.
    """
    canonical, focus = resolve_quiz_domain(topic, domain_hint)
    scope_line = domain_scope_blurb(canonical, focus)

    examples = await fetch_style_examples_openai(db, canonical, limit=2)
    if not examples:
        extra = await fetch_style_examples_any_source(db, canonical, limit=2)
        examples = extra
    few_shot = format_few_shot_block(examples[:2])

    is_interview = mode == "interview"
    effective_difficulty = "mastery" if is_interview else difficulty

    full_base = _interview_prompt(focus, scope_line, few_shot) if is_interview else _full_prompt(
        difficulty, focus, scope_line, few_shot
    )
    simple_base = _simple_prompt(difficulty, focus, interview=is_interview)

    # Stems from DB history + current session (exclude_ids); used in prompts + duplicate checks
    all_stems: list[str] = []
    if user_id:
        db_stems = await get_recent_question_stems(db, user_id, canonical, limit=24)
        all_stems.extend(db_stems)
    if exclude_ids:
        session_stems = await get_question_texts_by_ids(db, exclude_ids)
        all_stems = session_stems + [s for s in all_stems if s not in session_stems]

    forbidden_norms: set[str] = {_norm_question_text(s) for s in all_stems if s}

    client = get_http_client()
    retry_extra = (
        "\n\nCRITICAL: Your previous output was still too similar to an existing question. "
        "You MUST generate a completely different question on a different subtopic or scenario."
    )

    for gen_round in range(3):
        dedup_block = ""
        if all_stems:
            dedup_block = (
                "\n\nThe following questions have ALREADY been shown to the learner in this "
                "domain — your new question MUST cover a DIFFERENT concept, angle, or "
                "scenario. Do NOT repeat or closely rephrase any of them:\n"
                + "\n".join(f"— {s[:220]}" for s in all_stems[:35])
            )
        round_hint = retry_extra if gen_round > 0 else ""

        full_p = full_base + dedup_block + round_hint
        simple_p = simple_base + dedup_block + round_hint

        result = await _race_ollama_openai(
            client,
            full_p,
            temp_ollama=0.7 if is_interview else 0.65,
            temp_openai=0.6 if is_interview else 0.55,
        )
        if result:
            if not _is_duplicate_of_forbidden(result["question_text"], forbidden_norms):
                result.update(topic=focus, domain=canonical, difficulty=effective_difficulty)
                return result
            t = result["question_text"]
            all_stems.append(t)
            forbidden_norms.add(_norm_question_text(t))
            continue

        result = await _race_ollama_openai(client, simple_p, temp_ollama=0.5, temp_openai=0.4)
        if result:
            if not _is_duplicate_of_forbidden(result["question_text"], forbidden_norms):
                result.update(topic=focus, domain=canonical, difficulty=effective_difficulty)
                return result
            t = result["question_text"]
            all_stems.append(t)
            forbidden_norms.add(_norm_question_text(t))
            continue

    raise RuntimeError(
        f"Could not generate a unique question for topic='{focus}', mode='{mode}' "
        "(pool exhausted and AI kept matching prior questions, or providers unavailable). "
        "Ensure Ollama is running (`ollama serve`) or set OPENAI_API_KEY in .env."
    )

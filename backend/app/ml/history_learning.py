"""
Uses past AI-generated questions (especially OpenAI) as few-shot style anchors.

This is lightweight "training": we do not fine-tune a model here; we retrieve
recent successful question texts per domain and inject them into prompts so
new questions stay consistent with what already worked for learners.

For analytics, we also expose aggregate stats per domain/source.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import Question, QuizAttempt


async def fetch_style_examples_openai(
    db: AsyncSession,
    domain: str,
    limit: int = 4,
) -> List[str]:
    """
    Pull recent question stems generated via OpenAI for this domain.
    Prefer questions that learners answered correctly at least once (weak signal).
    """
    q = (
        select(Question)
        .where(
            Question.domain == domain,
            Question.generation_source == "openai",
        )
        .order_by(desc(Question.id))
        .limit(limit * 3)
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    if not rows:
        return []

    preferred: List[Question] = []
    rest: List[Question] = []
    correct_set: set = set()
    candidate_ids = [r.id for r in rows]
    cr = await db.execute(
        select(QuizAttempt.question_id)
        .where(
            QuizAttempt.question_id.in_(candidate_ids),
            QuizAttempt.is_correct.is_(True),
        )
        .distinct()
    )
    for (qid,) in cr.fetchall():
        correct_set.add(qid)

    for row in rows:
        if row.id in correct_set:
            preferred.append(row)
        else:
            rest.append(row)

    ordered = (preferred + rest)[:limit]
    return [r.question_text[:500] for r in ordered if r.question_text]


async def fetch_style_examples_any_source(
    db: AsyncSession,
    domain: str,
    limit: int = 3,
) -> List[str]:
    """Any AI-tagged question for the domain (Ollama or OpenAI)."""
    q = (
        select(Question)
        .where(
            Question.domain == domain,
            Question.is_ai_generated.is_(True),
        )
        .order_by(desc(Question.id))
        .limit(limit)
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    return [r.question_text[:450] for r in rows if r.question_text]


def format_few_shot_block(examples: List[str]) -> str:
    if not examples:
        return ""
    lines = []
    for i, ex in enumerate(examples, 1):
        lines.append(f"Example {i} (tone and difficulty only; write a NEW question, do not copy): {ex}")
    return "\n".join(lines)


async def domain_openai_success_rate(db: AsyncSession, domain: str) -> Optional[float]:
    """Share of attempts on openai-sourced questions that were correct."""
    stmt = (
        select(
            func.sum(case((QuizAttempt.is_correct.is_(True), 1), else_=0)),
            func.count(QuizAttempt.id),
        )
        .join(Question, Question.id == QuizAttempt.question_id)
        .where(Question.domain == domain, Question.generation_source == "openai")
    )
    result = await db.execute(stmt)
    row = result.one()
    num_correct, total = row[0] or 0, row[1] or 0
    if not total:
        return None
    return round(100.0 * float(num_correct) / float(total), 1)

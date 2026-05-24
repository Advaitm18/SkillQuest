from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.config import settings
from app.db.database import get_db
from app.schemas.quiz import QuestionResponse, AnswerSubmit, AnswerFeedback
from app.models.quiz import Question, QuizAttempt
from app.services.quiz_service import (
    get_question_for_topic,
    save_ai_question,
    process_answer_submission,
)
from app.ml.question_generator import get_question
from app.routes.auth import get_current_user
from app.services.recommendation_service import get_recommendations
from app.ml.history_learning import domain_openai_success_rate

router = APIRouter()

# Static paths must be registered before `/{topic}` so they are not captured as topics.


def _parse_exclude_ids(raw: Optional[str]) -> list[int]:
    """Comma-separated question IDs from the current client session to avoid repeats."""
    if not raw:
        return []
    out: list[int] = []
    for part in raw.split(",")[:100]:
        p = part.strip()
        if p.isdigit():
            out.append(int(p))
    return out


class ResumePoint(BaseModel):
    domain: str
    topic: str
    last_attempted_at: str


@router.get("/resume", response_model=List[ResumePoint])
async def get_resume_points(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the most-recently-attempted topic per domain for the current user,
    so the frontend can offer a direct "continue" shortcut.
    """
    stmt = (
        select(QuizAttempt.topic, Question.domain, QuizAttempt.created_at)
        .join(Question, QuizAttempt.question_id == Question.id)
        .where(QuizAttempt.user_id == current_user.id)
        .where(Question.domain.isnot(None))
        .order_by(QuizAttempt.created_at.desc())
        .limit(200)
    )
    rows = (await db.execute(stmt)).all()

    # Deduplicate: keep the first (most-recent) row per domain
    seen: dict = {}
    for topic, domain, ts in rows:
        if domain not in seen:
            seen[domain] = ResumePoint(
                domain=domain,
                topic=topic,
                last_attempted_at=ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            )

    # Return sorted by most-recent first (insertion order = already sorted)
    return list(seen.values())


@router.get("/recommendations/next")
async def get_next_recommendations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-powered topic recommendations based on user's history."""
    recs = await get_recommendations(db, current_user.id)
    return {"recommendations": recs}


@router.get("/domains/openai-accuracy")
async def openai_domain_accuracy(
    domain: str = Query(..., description="Canonical domain, e.g. Machine Learning"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approximate learner success rate on OpenAI-generated questions for this domain."""
    pct = await domain_openai_success_rate(db, domain)
    return {"domain": domain, "correct_rate_percent": pct}


@router.post("/submit-answer", response_model=AnswerFeedback)
async def submit_answer(
    payload: AnswerSubmit,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit an answer and get evaluated feedback with XP."""
    from sqlalchemy import select
    result = await db.execute(select(Question).where(Question.id == payload.question_id))
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    feedback = await process_answer_submission(
        db=db,
        user=current_user,
        question=question,
        user_answer=payload.user_answer,
        time_taken=payload.time_taken_seconds,
    )
    return AnswerFeedback(**feedback)


@router.get("/{topic}", response_model=QuestionResponse)
async def get_quiz_question(
    topic: str,
    difficulty: str = Query(default="easy", pattern="^(easy|intermediate|pro|mastery)$"),
    domain: Optional[str] = Query(default=None),
    mode: str = Query(default="learn", pattern="^(learn|interview)$"),
    source: Literal["auto", "pool", "ai"] = Query(
        default="auto",
        description="auto: DB pool first (fast), then AI if empty. pool: DB only. ai: always generate.",
    ),
    exclude_ids: Optional[str] = Query(
        default=None,
        description="Comma-separated question IDs to never return (e.g. current rapid-fire session).",
    ),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Questions are served from the seeded/DB pool first (milliseconds) when `source=auto`
    and QUESTION_POOL_FIRST=true, then fall back to parallel Ollama+OpenAI generation.
    mode='interview' uses mastery difficulty for pooling and MAANG-style AI prompts.
    """
    effective_difficulty = "mastery" if mode == "interview" else difficulty
    use_pool = source in ("auto", "pool") and (source == "pool" or settings.question_pool_first)
    session_exclude = _parse_exclude_ids(exclude_ids)

    if use_pool:
        pooled = await get_question_for_topic(
            db,
            topic,
            effective_difficulty,
            user_id=current_user.id,
            domain_hint=domain,
            extra_exclude_ids=session_exclude,
        )
        if pooled:
            return QuestionResponse.model_validate(pooled)
        if source == "pool":
            raise HTTPException(
                status_code=404,
                detail="No question in pool for this topic/difficulty. Try source=auto or ai.",
            )

    try:
        question_data = await get_question(
            db,
            topic,
            difficulty,
            domain_hint=domain,
            mode=mode,
            user_id=current_user.id,
            exclude_ids=session_exclude if session_exclude else None,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Question generation unavailable. "
                "Make sure Ollama is running (`ollama serve`) or set OPENAI_API_KEY. "
                f"Details: {exc}"
            ),
        )

    question = await save_ai_question(db, question_data)
    return QuestionResponse.model_validate(question)

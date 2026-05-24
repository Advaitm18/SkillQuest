from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from typing import List, Optional, Sequence
from app.models.quiz import Question, QuizAttempt
from app.domain_mapping import resolve_quiz_domain
from app.models.user import User
from app.ml.answer_evaluator import evaluate_answer
from app.ml.adaptive_learning import predict_next_difficulty, calculate_xp_reward
from app.services.gamification_service import award_xp, check_and_award_achievements


RECENT_ATTEMPT_LOOKBACK = 120


async def get_question_for_topic(
    db: AsyncSession,
    topic: str,
    difficulty: str = "medium",
    user_id: Optional[int] = None,
    domain_hint: Optional[str] = None,
    extra_exclude_ids: Optional[Sequence[int]] = None,
) -> Optional[Question]:
    """Fetch a question from DB for this domain/focus, avoiding recent repeats."""
    canonical, focus = resolve_quiz_domain(topic, domain_hint)

    domain_match = or_(
        Question.domain == canonical,
        Question.topic == focus,
        Question.topic == topic,
    )

    # Build the full exclusion set once and reuse in every query
    exclude: set[int] = set()
    if extra_exclude_ids:
        exclude.update(int(x) for x in extra_exclude_ids if x is not None)
    if user_id:
        recent_result = await db.execute(
            select(QuizAttempt.question_id)
            .where(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.created_at.desc())
            .limit(RECENT_ATTEMPT_LOOKBACK)
        )
        exclude.update(r[0] for r in recent_result.fetchall())
    ex_list = list(exclude)[:500]

    def _apply_exclude(q):
        return q.where(Question.id.notin_(ex_list)) if ex_list else q

    # Attempt 1: exact domain + exact difficulty + exclusions
    result = await db.execute(
        _apply_exclude(
            select(Question).where(domain_match, Question.difficulty == difficulty)
        ).order_by(func.random()).limit(1)
    )
    question = result.scalar_one_or_none()
    if question:
        return question

    # Attempt 2: any difficulty within canonical domain + exclusions
    result = await db.execute(
        _apply_exclude(
            select(Question).where(Question.domain == canonical)
        ).order_by(func.random()).limit(1)
    )
    question = result.scalar_one_or_none()
    if question:
        return question

    # Attempt 3: broader domain match + exclusions
    result = await db.execute(
        _apply_exclude(
            select(Question).where(domain_match)
        ).order_by(func.random()).limit(1)
    )
    question = result.scalar_one_or_none()
    if question:
        return question

    # Never return a pooled question that was excluded (session / recent attempts).
    # Caller falls through to AI generation; only on generation failure does the user see an error.
    return None


async def get_question_texts_by_ids(
    db: AsyncSession,
    question_ids: Sequence[int],
) -> List[str]:
    """Fetch question texts for a list of IDs — used to build LLM dedup hints."""
    if not question_ids:
        return []
    rows = (await db.execute(
        select(Question.question_text)
        .where(Question.id.in_(list(question_ids)[:50]))
    )).scalars().all()
    return [t.strip()[:240].replace("\n", " ") for t in rows if t]


async def get_recent_question_stems(
    db: AsyncSession,
    user_id: int,
    domain: str,
    limit: int = 10,
) -> List[str]:
    """Short snippets of questions this user already saw (same domain) — for LLM de-duplication."""
    stmt = (
        select(Question.question_text)
        .join(QuizAttempt, QuizAttempt.question_id == Question.id)
        .where(
            QuizAttempt.user_id == user_id,
            Question.domain == domain,
        )
        .order_by(desc(QuizAttempt.created_at))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    stems: List[str] = []
    for t in rows:
        if not t:
            continue
        stems.append(t.strip()[:240].replace("\n", " "))
    return stems


async def save_ai_question(db: AsyncSession, question_data: dict) -> Question:
    """Persist an AI-generated question to the database."""
    question = Question(
        topic=question_data["topic"],
        question_text=question_data["question_text"],
        question_type=question_data.get("question_type", "mcq"),
        options=question_data.get("options"),
        correct_answer=question_data["correct_answer"],
        explanation=question_data.get("explanation"),
        hint=question_data.get("hint"),
        difficulty=question_data.get("difficulty", "easy"),
        is_ai_generated=question_data.get("is_ai_generated", True),
        domain=question_data.get("domain"),
        generation_source=question_data.get("generation_source", "seed"),
        provider_model=question_data.get("provider_model"),
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


async def process_answer_submission(
    db: AsyncSession,
    user: User,
    question: Question,
    user_answer: str,
    time_taken: float,
) -> dict:
    """
    Full answer processing pipeline:
    1. Evaluate answer (ML)
    2. Determine XP reward (adaptive)
    3. Update user stats
    4. Record attempt
    5. Compute next difficulty
    """
    # Step 1: Evaluate answer
    score, is_correct = evaluate_answer(user_answer, question.correct_answer, question.question_type)

    # Step 2: Calculate XP
    xp_earned = calculate_xp_reward(
        is_correct=is_correct,
        difficulty=question.difficulty,
        time_taken=time_taken,
        streak=user.total_correct_answers % 10,  # Rolling streak approximation
    )

    # Step 3: Update user stats
    user.total_questions_answered += 1
    if is_correct:
        user.total_correct_answers += 1

    # Step 4: Record the attempt
    attempt = QuizAttempt(
        user_id=user.id,
        question_id=question.id,
        topic=question.topic,
        user_answer=user_answer,
        is_correct=is_correct,
        score=score,
        time_taken_seconds=time_taken,
        xp_earned=xp_earned,
        difficulty=question.difficulty,
    )
    db.add(attempt)

    # Step 5: Award XP and check level up
    old_level = user.level
    xp_result = await award_xp(db, user, xp_earned)
    leveled_up = xp_result["leveled_up"]

    # Check achievements
    await check_and_award_achievements(db, user)

    # Step 6: Compute adaptive next difficulty
    recent_result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user.id, QuizAttempt.topic == question.topic)
        .order_by(QuizAttempt.created_at.desc())
        .limit(10)
    )
    recent_attempts = recent_result.scalars().all()
    if recent_attempts:
        recent_accuracy = sum(1 for a in recent_attempts if a.is_correct) / len(recent_attempts)
        avg_time = sum(a.time_taken_seconds for a in recent_attempts) / len(recent_attempts)
        streak = sum(1 for a in recent_attempts if a.is_correct)
    else:
        recent_accuracy, avg_time, streak = 0.5, 30.0, 0

    next_difficulty, _ = predict_next_difficulty(
        recent_accuracy=recent_accuracy,
        avg_time_seconds=avg_time,
        streak=streak,
        current_difficulty=question.difficulty,
    )

    await db.flush()

    return {
        "is_correct": is_correct,
        "score": score,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "xp_earned": xp_earned,
        "new_total_xp": user.xp,
        "new_level": user.level,
        "leveled_up": leveled_up,
        "next_difficulty": next_difficulty,
    }

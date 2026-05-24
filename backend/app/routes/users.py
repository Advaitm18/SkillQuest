from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.gamification import AnalyticsResponse
from app.routes.auth import get_current_user
from app.models.quiz import QuizAttempt
from app.models.achievement import UserAchievement, Achievement

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user=Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.username:
        current_user.username = payload.username
    if payload.avatar is not None:
        current_user.avatar = payload.avatar
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch recent quiz attempts
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(100)
    )
    attempts = result.scalars().all()

    # Aggregate accuracy by topic
    topic_stats: dict = {}
    for attempt in attempts:
        topic = attempt.topic
        if topic not in topic_stats:
            topic_stats[topic] = {"correct": 0, "total": 0}
        topic_stats[topic]["total"] += 1
        if attempt.is_correct:
            topic_stats[topic]["correct"] += 1

    accuracy_by_topic = {
        t: round(v["correct"] / v["total"] * 100, 1)
        for t, v in topic_stats.items()
        if v["total"] > 0
    }

    # Identify weak (<50%) and strong (>=80%) topics
    weak_topics = [t for t, a in accuracy_by_topic.items() if a < 50]
    strong_topics = [t for t, a in accuracy_by_topic.items() if a >= 80]

    # Build XP history (last 7 days grouped)
    xp_history = [
        {"day": f"Day {i+1}", "xp": 0} for i in range(7)
    ]

    # Build recent attempts summary
    recent_attempts = [
        {
            "topic": a.topic,
            "is_correct": a.is_correct,
            "difficulty": a.difficulty,
            "xp_earned": a.xp_earned,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in attempts[:10]
    ]

    return AnalyticsResponse(
        total_xp=current_user.xp,
        current_level=current_user.level,
        streak=current_user.streak,
        accuracy=current_user.accuracy,
        total_questions=current_user.total_questions_answered,
        topics_studied=list(topic_stats.keys()),
        weak_topics=weak_topics,
        strong_topics=strong_topics,
        xp_history=xp_history,
        accuracy_by_topic=accuracy_by_topic,
        recent_attempts=recent_attempts,
    )


@router.get("/achievements")
async def get_achievements(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserAchievement, Achievement)
        .join(Achievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == current_user.id)
    )
    rows = result.all()
    return [
        {
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon,
            "category": ach.category,
            "xp_bonus": ach.xp_bonus,
            "is_rare": ach.is_rare,
            "earned_at": ua.earned_at.isoformat() if ua.earned_at else None,
        }
        for ua, ach in rows
    ]

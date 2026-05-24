from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.models.quiz import QuizAttempt
from app.ml.recommendation import recommendation_engine


async def get_recommendations(db: AsyncSession, user_id: int) -> List[dict]:
    """
    Get personalized topic recommendations for a user.
    Fetches their attempt history and feeds it to the recommendation engine.
    """
    # Recent attempts only — enough for recommendations, avoids loading huge histories
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user_id)
        .order_by(desc(QuizAttempt.created_at))
        .limit(800)
    )
    attempts = result.scalars().all()

    if not attempts:
        # New user: recommend beginner topics
        return [
            {"topic": "Python", "reason": "Great starting point", "category": "Programming", "score": 10},
            {"topic": "DSA", "reason": "Core CS skills", "category": "CS Fundamentals", "score": 9},
            {"topic": "Web Development", "reason": "Highly in demand", "category": "Web", "score": 8},
        ]

    # Aggregate accuracy per topic
    topic_stats: dict = {}
    for attempt in attempts:
        t = attempt.topic
        if t not in topic_stats:
            topic_stats[t] = {"correct": 0, "total": 0}
        topic_stats[t]["total"] += 1
        if attempt.is_correct:
            topic_stats[t]["correct"] += 1

    completed_topics = [
        t for t, s in topic_stats.items() if s["total"] >= 5
    ]
    weak_topics = [
        t for t, s in topic_stats.items()
        if s["total"] >= 3 and s["correct"] / s["total"] < 0.5
    ]

    # Most recent topic studied
    most_recent = max(attempts, key=lambda a: a.created_at).topic if attempts else None

    return recommendation_engine.recommend(
        completed_topics=completed_topics,
        weak_topics=weak_topics,
        current_topic=most_recent,
    )

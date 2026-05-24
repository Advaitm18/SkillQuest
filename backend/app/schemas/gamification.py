from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    category: str
    xp_bonus: int
    is_rare: bool
    earned_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    xp: int
    level: int
    streak: int
    avatar: Optional[str] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    current_user_rank: Optional[int] = None


class XPUpdateRequest(BaseModel):
    xp_to_add: int
    reason: str = "quiz_correct"


class XPUpdateResponse(BaseModel):
    new_xp: int
    new_level: int
    leveled_up: bool
    xp_to_next_level: int


class AnalyticsResponse(BaseModel):
    total_xp: int
    current_level: int
    streak: int
    accuracy: float
    total_questions: int
    topics_studied: List[str]
    weak_topics: List[str]
    strong_topics: List[str]
    xp_history: List[dict]
    accuracy_by_topic: dict
    recent_attempts: List[dict]

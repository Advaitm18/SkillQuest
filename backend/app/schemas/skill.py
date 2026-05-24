from pydantic import BaseModel
from typing import Optional, List


class SkillNodeResponse(BaseModel):
    id: int
    skill_id: int
    parent_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    order_index: int
    required_xp: int
    xp_reward: int
    is_boss_level: bool
    is_unlocked: bool = False
    is_completed: bool = False

    model_config = {"from_attributes": True}


class SkillResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    icon: Optional[str] = None
    color: str
    difficulty: str
    total_nodes: int
    completed_nodes: int = 0
    user_xp_in_skill: int = 0

    model_config = {"from_attributes": True}


class SkillTreeResponse(BaseModel):
    skill: SkillResponse
    nodes: List[SkillNodeResponse]


class UserProgressResponse(BaseModel):
    skill_id: int
    skill_node_id: Optional[int] = None
    is_completed: bool
    score: float
    attempts: int
    xp_earned: int

    model_config = {"from_attributes": True}

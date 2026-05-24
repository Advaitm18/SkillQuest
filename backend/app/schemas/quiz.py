from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuestionResponse(BaseModel):
    id: int
    topic: str
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    difficulty: str
    hint: Optional[str] = None
    # Note: correct_answer is NOT exposed here — only returned after submission

    model_config = {"from_attributes": True}


class AnswerSubmit(BaseModel):
    question_id: int
    user_answer: str
    time_taken_seconds: float = 0.0
    topic: str


class AnswerFeedback(BaseModel):
    is_correct: bool
    score: float
    correct_answer: str
    explanation: Optional[str] = None
    xp_earned: int
    new_total_xp: int
    new_level: int
    leveled_up: bool
    next_difficulty: str


class QuizAttemptResponse(BaseModel):
    id: int
    question_id: int
    topic: str
    user_answer: Optional[str] = None
    is_correct: bool
    score: float
    time_taken_seconds: float
    xp_earned: int
    difficulty: str
    created_at: datetime

    model_config = {"from_attributes": True}

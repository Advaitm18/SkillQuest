from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, Float, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    skill_node_id = Column(Integer, ForeignKey("skill_nodes.id"), nullable=True)
    topic = Column(String(100), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), default="mcq")  # mcq | text | code
    options = Column(JSON, nullable=True)                # list of strings for MCQ
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    hint = Column(Text, nullable=True)                   # gentle clue shown on request
    difficulty = Column(String(20), default="easy")      # easy | intermediate | pro | mastery
    tags = Column(JSON, nullable=True)                   # ["python", "basics"]
    is_ai_generated = Column(Boolean, default=False)
    # Canonical track, e.g. "Machine Learning" — used for bank lookup + OpenAI few-shot history
    domain = Column(String(100), nullable=True, index=True)
    generation_source = Column(String(32), default="seed")  # seed | ollama | openai | fallback
    provider_model = Column(String(80), nullable=True)      # e.g. gpt-4o-mini, llama3

    # Relationships
    skill_node = relationship("SkillNode", back_populates="questions")
    attempts = relationship("QuizAttempt", back_populates="question")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, default=False)
    score = Column(Float, default=0.0)  # 0.0 - 1.0 (for partial credit on text answers)
    time_taken_seconds = Column(Float, default=0.0)
    xp_earned = Column(Integer, default=0)
    difficulty = Column(String(20), default="medium")
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    question = relationship("Question", back_populates="attempts")

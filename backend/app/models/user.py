from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    avatar = Column(String(200), nullable=True)

    # Gamification fields
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)

    # Stats
    total_questions_answered = Column(Integer, default=0)
    total_correct_answers = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    quiz_attempts = relationship("QuizAttempt", back_populates="user", lazy="dynamic")
    achievements = relationship("UserAchievement", back_populates="user")
    skill_progress = relationship("UserSkillProgress", back_populates="user")

    @property
    def accuracy(self) -> float:
        if self.total_questions_answered == 0:
            return 0.0
        return round(self.total_correct_answers / self.total_questions_answered * 100, 1)

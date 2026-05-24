from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.db.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # e.g. "AI/ML", "Web Dev", "DSA"
    icon = Column(String(50), nullable=True)        # emoji or icon name
    color = Column(String(20), default="#8b5cf6")   # brand color per skill
    difficulty = Column(String(20), default="beginner")  # beginner/intermediate/advanced
    total_nodes = Column(Integer, default=0)

    # Relationships
    nodes = relationship("SkillNode", back_populates="skill", cascade="all, delete-orphan")
    user_progress = relationship("UserSkillProgress", back_populates="skill")


class SkillNode(Base):
    __tablename__ = "skill_nodes"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("skill_nodes.id"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    required_xp = Column(Integer, default=0)
    xp_reward = Column(Integer, default=50)
    is_boss_level = Column(Boolean, default=False)

    # Relationships
    skill = relationship("Skill", back_populates="nodes")
    parent = relationship("SkillNode", remote_side=[id], backref="children")
    questions = relationship("Question", back_populates="skill_node")
    user_progress = relationship("UserSkillProgress", back_populates="skill_node")


class UserSkillProgress(Base):
    __tablename__ = "user_skill_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    skill_node_id = Column(Integer, ForeignKey("skill_nodes.id"), nullable=True)
    is_completed = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="skill_progress")
    skill = relationship("Skill", back_populates="user_progress")
    skill_node = relationship("SkillNode", back_populates="user_progress")

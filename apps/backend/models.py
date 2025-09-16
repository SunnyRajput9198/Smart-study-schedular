# apps/backend/models.py

from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    timezone = Column(String, default="UTC")
    
    # THE FIX: Added back_populates to all relationships for two-way linking
    subjects = relationship("Subject", back_populates="user")
    tasks = relationship("Task", back_populates="user")
    study_sessions = relationship("StudySession", back_populates="user")
    pomodoro_sessions = relationship("PomodoroSession", back_populates="user")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False)

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    date = Column(DateTime, nullable=False,server_default=func.now())
    color_tag = Column(String, default="#3B82F6")
    
    # THE FIX: Changed 'owner' to 'user' for consistency and added back_populates
    user = relationship("User", back_populates="subjects")
    tasks = relationship("Task", back_populates="subject")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    estimated_time = Column(Integer)
    deadline = Column(DateTime, nullable=True)
    status = Column(String, default="pending")
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    task_type = Column(String, default="general")
    
    # THE FIX: Added back_populates to all relationships
    subject = relationship("Subject", back_populates="tasks")
    user = relationship("User", back_populates="tasks")
    study_sessions = relationship("StudySession", back_populates="task")
    pomodoro_sessions = relationship("PomodoroSession", back_populates="task")

class StudySession(Base):
    __tablename__ = "study_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actual_duration = Column(Integer)
    user_difficulty_rating = Column(Integer)
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    # THE FIX: Changed 'owner' to 'user' and added back_populates
    task = relationship("Task", back_populates="study_sessions")
    user = relationship("User", back_populates="study_sessions")

class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    # THE FIX: Changed 'owner' to 'user' and added back_populates
    user = relationship("User", back_populates="pomodoro_sessions")
    task = relationship("Task", back_populates="pomodoro_sessions")
    
class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    urgency_weight = Column(Float, default=0.4)
    difficulty_weight = Column(Float, default=0.3)
    forgetting_weight = Column(Float, default=0.3)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # THE FIX: Changed 'owner' to 'user' for consistency
    user = relationship("User", back_populates="preferences")

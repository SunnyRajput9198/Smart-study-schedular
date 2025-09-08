# backend/models.py (Final Merged Version for ML Integration)
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey, Float, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base # Import Base from our central database.py

# ==============================================================================
# 1. Core Models (User, Subject, Task)
# ==============================================================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # ML-related fields
    timezone = Column(String, default="UTC")
    
    # Relationships
    subjects = relationship("Subject", back_populates="owner")
    tasks = relationship("Task", back_populates="owner")
    study_sessions = relationship("StudySession", back_populates="owner")
    preferences = relationship("UserPreferences", back_populates="owner", uselist=False)
    streaks = relationship("StudyStreak", back_populates="owner")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # ML/UI-related fields
    color_tag = Column(String, default="#3B82F6")
    
    # Relationships
    owner = relationship("User", back_populates="subjects")
    tasks = relationship("Task", back_populates="subject")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False) # Renamed from 'name' for clarity
    estimated_time = Column(Integer)  # in minutes
    deadline = Column(DateTime)
    status = Column(String, default="pending")  # pending, complete, cancelled
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Keep direct link to user
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ML-related fields
    task_type = Column(String, default="general")  # reading, assignment, etc.
    
    # Relationships
    subject = relationship("Subject", back_populates="tasks")
    owner = relationship("User", back_populates="tasks")
    study_sessions = relationship("StudySession", back_populates="task")

# ==============================================================================
# 2. Data Logging & Gamification Models
# ==============================================================================

class StudySession(Base):
    __tablename__ = "study_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actual_duration = Column(Integer)  # in minutes
    user_difficulty_rating = Column(Integer)  # 1-5 scale
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="study_sessions")
    owner = relationship("User", back_populates="study_sessions")

class StudyStreak(Base):
    __tablename__ = "study_streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    streak_date = Column(DateTime, nullable=False)
    daily_minutes_studied = Column(Integer, default=0)
    
    # Relationships
    owner = relationship("User", back_populates="streaks")

# ==============================================================================
# 3. ML System & User Configuration Models
# ==============================================================================

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Priority weights for customizing ML algorithm
    urgency_weight = Column(Float, default=0.4)
    difficulty_weight = Column(Float, default=0.3)
    forgetting_weight = Column(Float, default=0.3)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="preferences")

class MLModel(Base):
    __tablename__ = "ml_models"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, index=True, nullable=False) # e.g., "time_predictor"
    version = Column(String, nullable=False)
    description = Column(Text)
    path = Column(String, nullable=False) # Path to the saved model file
    trained_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)
    performance_metrics = Column(Text)  # JSON object with metrics like MSE, R2, etc.
    
    
class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer)  # Duration in minutes

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True) # Can be null if it's a general session

    owner = relationship("User")
    task = relationship("Task")
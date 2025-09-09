# backend/schemas.py (Final Merged Version for ML Integration)

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

# ==============================================================================
# 1. Enums for Type Safety
# ==============================================================================
# Using Enums prevents typos and ensures that fields like 'status' can only
# have predefined values (e.g., "pending", "complete").

class TaskStatus(str, Enum):
    pending = "pending"
    complete = "complete"
    cancelled = "cancelled"
    in_progress = "in_progress" # <-- ADD THIS LINE

class TaskType(str, Enum):
    reading = "reading"
    assignment = "assignment"
    practice = "practice"
    exam = "exam"
    project = "project"
    review = "review"
    general = "general"


# Add this new class at the end of the Task Schemas section
class TaskStatusUpdate(BaseModel):
    status: TaskStatus
# ==============================================================================
# 2. Core Schemas (User, Auth, Subject, Task)
# ==============================================================================
# These are the foundational data structures for the main application.
# The Config class with from_attributes = True allows Pydantic to easily
# convert SQLAlchemy database objects into these JSON-friendly schemas.

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Kept from your original file for the existing login endpoint
class UserLogin(BaseModel):
    username: str
    password: str

# Kept from your original file for the existing login endpoint
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Subject Schemas ---
class SubjectBase(BaseModel):
    name: str
    color_tag: Optional[str] = "#3B82F6" # Renamed from color to color_tag for consistency

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Task Schemas ---
# TaskBase serves as a common template to avoid repeating fields.
class TaskBase(BaseModel):
    title: str
    estimated_time: int = Field(gt=0, description="Estimated time in minutes")
    deadline: Optional[datetime] = None # Changed to datetime for better type handling
    task_type: TaskType = TaskType.general

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    estimated_time: Optional[int] = Field(default=None, gt=0)
    deadline: Optional[datetime] = None

    status: Optional[TaskStatus] = None
    task_type: Optional[TaskType] = None

class Task(TaskBase):
    id: int
    subject_id: int
    status: TaskStatus
    created_at: datetime
    subject: Optional[Subject] = None
    
    class Config:
        from_attributes = True

# ==============================================================================
# 3. Study Session Schemas (for Data Logging)
# ==============================================================================
# These are crucial for collecting the data needed to train the ML models.

class StudySessionBase(BaseModel):
    actual_duration: int = Field(gt=0, description="Actual study time in minutes")
    user_difficulty_rating: int = Field(ge=1, le=5, description="Difficulty rating 1-5")


class TaskBatchUpdate(BaseModel):
    task_ids: List[int]
class StudySessionCreate(StudySessionBase):
    pass # The endpoint will get task_id from the URL, not the body

class StudySession(StudySessionBase):
    id: int
    task_id: int
    user_id: int
    completed_at: datetime
    task: Task
    
    class Config:
        from_attributes = True

# ==============================================================================
# 4. ML Feature Schemas (for Predictions and Insights)
# ==============================================================================
# These define the structure of the data returned by the new ML endpoints.

class ScheduleTask(BaseModel):
    task_id: int
    task_name: str
    subject_name: str
    estimated_time: int
    predicted_time: int
    priority_score: float
    recommendation_reason: str

class DailySchedule(BaseModel):
    schedule: List[ScheduleTask]
    insights: List[str]
    generated_at: datetime

class TimePrediction(BaseModel):
    task_id: int
    predicted_time_minutes: int
    confidence_score: float

class TimePredictionResponse(BaseModel):
    predictions: List[TimePrediction]
    model_version: str

class StudyInsights(BaseModel):
    total_study_time_hours: float
    best_productivity_hour: int
    most_productive_day: str
    estimation_accuracy: float
    recommendations: List[str]

class MLStatus(BaseModel):
    services_available: bool
    last_training_time: Optional[datetime] = None
    active_model_version: Optional[str] = None
    
# ==============================================================================
# 5. Analytics Schemas (for Dashboard Charts)
# ==============================================================================

class SubjectAnalytics(BaseModel):
    subject_name: str
    total_minutes_studied: int

class DailyAnalytics(BaseModel):
    tasks_planned: int
    tasks_completed: int

class WeeklyStreak(BaseModel):
    streak_days: int
    longest_streak: int
    # This will be a dictionary like {"2025-09-01": 120, "2025-09-02": 90}
    daily_summary: Dict[str, int]
    
# ==============================================================================
# 6. Pomodoro Schemas
# ==============================================================================

class PomodoroSessionCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    duration: int
    task_id: Optional[int] = None
    
# Add this new class to the end of apps/backend/schemas.py

class InsightsResponse(BaseModel):
    recommendations: List[str]
    
# Add this new section to the end of apps/backend/schemas.py

# ==============================================================================
# 7. History & Analytics Summary Schemas
# ==============================================================================

class HistoryStats(BaseModel):
    total_sessions: int
    total_hours: float
    avg_difficulty: float
    avg_duration: float

class TimelinePoint(BaseModel):
    date: str
    duration: int
    difficulty: int

class SubjectDistribution(BaseModel):
    subject: str
    duration: int
    sessions: int

class DifficultyDistribution(BaseModel):
    difficulty: str
    count: int

class HistorySummary(BaseModel):
    stats: HistoryStats
    timeline_data: List[TimelinePoint]
    subject_chart_data: List[SubjectDistribution]
    difficulty_chart_data: List[DifficultyDistribution]
    recent_sessions: List[StudySession] # Re-use the existing StudySession schema
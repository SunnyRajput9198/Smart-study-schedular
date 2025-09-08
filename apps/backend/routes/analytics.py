# apps/backend/routers/analytics.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func,Date
from typing import List, Dict
from datetime import datetime, timedelta
import models, schema, security
from database import get_db

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

@router.get("/subjects", response_model=List[schema.SubjectAnalytics])
def get_subject_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Calculates the total study time (in minutes) for each subject
    for the logged-in user. This is used for the bar chart on the dashboard.
    """
    analytics_data = (
        db.query(
            models.Subject.name,
            func.sum(models.StudySession.actual_duration).label("total_minutes")
        )
        .join(models.Task, models.Subject.id == models.Task.subject_id)
        .join(models.StudySession, models.Task.id == models.StudySession.task_id)
        .filter(models.Subject.user_id == current_user.id)
        .group_by(models.Subject.name)
        .order_by(func.sum(models.StudySession.actual_duration).desc())
        .all()
    )

    # Format the data to match our Pydantic schema
    return [
        schema.SubjectAnalytics(
            subject_name=name,
            total_minutes_studied=minutes if minutes is not None else 0
        )
        for name, minutes in analytics_data
    ]
    
# THE FIX: ADD THIS NEW FUNCTION
@router.get("/daily", response_model=schema.DailyAnalytics)
def get_daily_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Calculates the number of tasks planned vs completed for today.
    """
    today = datetime.utcnow().date()

    tasks_completed = (
        db.query(func.count(models.Task.id))
        .join(models.StudySession, models.Task.id == models.StudySession.task_id)
        .filter(models.Task.user_id == current_user.id)
        .filter(func.cast(models.StudySession.completed_at, Date) == today)
        .scalar()
    )

    tasks_planned = (
        db.query(func.count(models.Task.id))
        .filter(models.Task.user_id == current_user.id)
        .filter(models.Task.status == 'pending')
        .scalar()
    )

    return schema.DailyAnalytics(
        tasks_planned=(tasks_planned or 0) + (tasks_completed or 0),
        tasks_completed=tasks_completed or 0
    )

# THE FIX: ADD THIS NEW FUNCTION
@router.get("/weekly", response_model=schema.WeeklyStreak)
def get_weekly_streak(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Calculates the user's current study streak and daily summary for the last 7 days.
    """
    seven_days_ago = datetime.utcnow().date() - timedelta(days=6)

    daily_summary_query = (
        db.query(
            func.cast(models.StudySession.completed_at, Date).label("study_day"),
            func.sum(models.StudySession.actual_duration).label("total_minutes")
        )
        .filter(models.StudySession.user_id == current_user.id)
        .filter(func.cast(models.StudySession.completed_at, Date) >= seven_days_ago)
        .group_by("study_day")
        .order_by("study_day")
        .all()
    )
    
    # Create a dictionary of the last 7 days with 0 minutes studied
    daily_summary = {
        (datetime.utcnow().date() - timedelta(days=i)).isoformat(): 0
        for i in range(7)
    }
    # Fill in the actual minutes studied
    for day, minutes in daily_summary_query:
        if day:
            daily_summary[day.isoformat()] = minutes or 0

    # Calculate streak
    streak_days = 0
    today = datetime.utcnow().date()
    for i in range(7):
        day_to_check = today - timedelta(days=i)
        if daily_summary.get(day_to_check.isoformat(), 0) > 0:
            streak_days += 1
        else:
            # Break streak if a day is missed (unless it's today and we're looking at past days)
            if i > 0:
                break
    
    # In a real app, longest_streak would be stored and updated in the user profile
    longest_streak = streak_days 

    return schema.WeeklyStreak(
        streak_days=streak_days,
        longest_streak=longest_streak,
        daily_summary=daily_summary
    )
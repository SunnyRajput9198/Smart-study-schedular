# apps/backend/routers/analytics.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func,Date,text
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
    
    
# Add this new function to the end of apps/backend/routers/analytics.py

# In apps/backend/routers/analytics.py, replace the get_recommendations function with this:

@router.get("/recommendations", response_model=schema.InsightsResponse)
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Analyzes the user's study history to generate personalized AI insights
    and recommendations.
    """
    recommendations = []
    
    # --- Insight 1: Productivity by Time of Day ---
    try:
        time_of_day_query = db.execute(text(f"""
            SELECT
                CASE
                    WHEN EXTRACT(hour FROM ss.completed_at) BETWEEN 7 AND 12 THEN 'Morning'
                    WHEN EXTRACT(hour FROM ss.completed_at) BETWEEN 13 AND 17 THEN 'Afternoon'
                    ELSE 'Evening'
                END as period,
                AVG(t.estimated_time::float / NULLIF(ss.actual_duration, 0)::float) as efficiency
            FROM study_sessions ss
            JOIN tasks t ON ss.task_id = t.id
            WHERE ss.user_id = {current_user.id} AND ss.actual_duration > 0
            GROUP BY period
            ORDER BY efficiency DESC
            LIMIT 1;
        """)).first()

        if time_of_day_query and time_of_day_query.efficiency > 1.1:
            recommendations.append(
                f"You're most efficient in the {time_of_day_query.period.lower()}. Try scheduling your hardest tasks then!"
            )
    except Exception as e:
        print(f"Could not generate time-of-day insight: {e}")

    # --- Insight 2: Estimation Accuracy by Subject ---
    try:
        # THE FIX: Replaced the alias 'avg_difference' in ORDER BY with the full calculation.
        estimation_accuracy_query = db.execute(text(f"""
            SELECT
                s.name as subject_name,
                AVG(ss.actual_duration::float - t.estimated_time::float) as avg_difference
            FROM study_sessions ss
            JOIN tasks t ON ss.task_id = t.id
            JOIN subjects s ON t.subject_id = s.id
            WHERE ss.user_id = {current_user.id}
            GROUP BY s.name
            ORDER BY ABS(AVG(ss.actual_duration::float - t.estimated_time::float)) DESC
            LIMIT 1;
        """)).first()

        if estimation_accuracy_query:
            if estimation_accuracy_query.avg_difference > 15:
                recommendations.append(
                    f"You tend to underestimate your time for '{estimation_accuracy_query.subject_name}'. Try adding a 15-minute buffer."
                )
            elif estimation_accuracy_query.avg_difference < -15:
                recommendations.append(
                    f"You are faster than you think at '{estimation_accuracy_query.subject_name}'! You might be overestimating."
                )
    except Exception as e:
        print(f"Could not generate estimation accuracy insight: {e}")
            
    # --- Insight 3: Spaced Repetition (Forgetting Curve) ---
    try:
        spaced_repetition_query = db.execute(text(f"""
            SELECT s.name as subject_name, MAX(ss.completed_at) as last_studied
            FROM subjects s
            JOIN tasks t ON s.id = t.subject_id
            JOIN study_sessions ss ON t.id = ss.task_id
            WHERE s.user_id = {current_user.id}
            GROUP BY s.name
            HAVING (NOW() - MAX(ss.completed_at)) > INTERVAL '5 days'
            ORDER BY last_studied ASC
            LIMIT 1;
        """)).first()

        if spaced_repetition_query:
            recommendations.append(
                f"You haven't reviewed '{spaced_repetition_query.subject_name}' in a while. Consider studying it soon."
            )
    except Exception as e:
        print(f"Could not generate spaced repetition insight: {e}")

    if not recommendations:
        recommendations.append("Keep completing tasks to unlock more personalized insights!")

    return schema.InsightsResponse(recommendations=recommendations)
# apps/backend/routers/analytics.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, text
from typing import List, Dict
from datetime import datetime, timedelta
import models, schema, security
from database import get_db

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

@router.get("/summary", response_model=schema.AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Calculates a comprehensive summary of all user analytics for the main dashboard.
    """
    user_id = current_user.id
    today = datetime.utcnow().date()
    seven_days_ago = today - timedelta(days=6)

    # --- 1. Subject Analytics ---
    subject_query = db.query(
        models.Subject.name,
        func.sum(models.StudySession.actual_duration).label("total_minutes"),
        func.count(models.StudySession.id).label("session_count"),
        func.avg(models.StudySession.actual_duration).label("avg_duration")
    ).select_from(models.StudySession).join(models.Task).join(models.Subject).filter(
        models.Subject.user_id == user_id
    ).group_by(models.Subject.name).all()
    
    subject_data = [schema.SubjectAnalytics(
        subject_name=name,
        total_minutes_studied=minutes or 0,
        sessions_count=count or 0,
        avg_session_duration=round(avg_dur or 0, 1)
    ) for name, minutes, count, avg_dur in subject_query]

    # --- 2. Daily Analytics ---
    tasks_completed_today = db.query(func.count(models.Task.id)).join(models.StudySession).filter(
        models.Task.user_id == user_id,
        func.cast(models.StudySession.completed_at, Date) == today
    ).scalar() or 0
    
    tasks_pending = db.query(func.count(models.Task.id)).filter(
        models.Task.user_id == user_id, models.Task.status == 'pending'
    ).scalar() or 0
    
    total_planned_today = tasks_completed_today + tasks_pending
    completion_rate = (tasks_completed_today / total_planned_today * 100) if total_planned_today > 0 else 0
    
    focus_time_today = db.query(func.sum(models.PomodoroSession.duration)).filter(
        models.PomodoroSession.user_id == user_id,
        func.cast(models.PomodoroSession.start_time, Date) == today
    ).scalar() or 0

    daily_data = schema.DailyAnalytics(
        tasks_planned=total_planned_today,
        tasks_completed=tasks_completed_today,
        completion_rate=round(completion_rate, 1),
        focus_time=focus_time_today
    )

    # --- 3. Weekly Streak & Goal ---
    daily_summary_query = db.query(
        func.cast(models.StudySession.completed_at, Date).label("study_day"),
        func.sum(models.StudySession.actual_duration).label("total_minutes")
    ).filter(
        models.StudySession.user_id == user_id,
        func.cast(models.StudySession.completed_at, Date) >= seven_days_ago
    ).group_by("study_day").all()

    daily_summary_map = {day.isoformat(): minutes for day, minutes in daily_summary_query}
    
    streak_days = 0
    for i in range(7):
        day_to_check = today - timedelta(days=i)
        if daily_summary_map.get(day_to_check.isoformat(), 0) > 0:
            streak_days += 1
        elif i > 0:
            break

    total_weekly_minutes = sum(daily_summary_map.values())
    weekly_data = schema.WeeklyStreak(
        streak_days=streak_days,
        daily_summary=daily_summary_map,
        weekly_goal=350,  # NOTE: Hardcoded goal, can be made a user setting later
        total_weekly_minutes=total_weekly_minutes
    )
    # --- YEH NAYA BLOCK PASTE KAREIN ---
# --- 3.5. Task Distribution by Subject ---
    task_dist_query = db.query(
        models.Subject.name,
        func.count(models.Task.id).label("task_count")
    ).join(models.Task, models.Subject.id == models.Task.subject_id).filter(
        models.Subject.user_id == user_id
    ).group_by(models.Subject.name).order_by(func.count(models.Task.id).desc()).all()
    
    task_distribution_data = [
        schema.TaskDistribution(subject_name=name, task_count=count or 0)
        for name, count in task_dist_query
    ]
# --- YAHAN TAK PASTE KAREIN ---
    # --- 4. Performance Metrics (Calculated) ---
    total_focus_sessions = db.query(func.count(models.PomodoroSession.id)).filter(models.PomodoroSession.user_id == user_id).scalar() or 0
    
    avg_quality = db.query(func.avg(models.StudySession.user_difficulty_rating)).filter(
        models.StudySession.user_id == user_id
    ).scalar() or 0
    
    # Simple productivity score based on completion and consistency
    productivity_score = int((completion_rate * 0.7) + (min(streak_days, 7) / 7 * 100 * 0.3))

    performance_data = schema.PerformanceMetrics(
        productivity_score=productivity_score,
        focus_sessions=total_focus_sessions,
        average_session_quality=round(5 - avg_quality, 1) if avg_quality > 0 else 0, # Invert so higher is better
        improvement_trend=12.0 # NOTE: Simulated trend, a real trend needs historical data
    )

    return schema.AnalyticsSummary(
        subjects=subject_data,
        daily=daily_data,
        weekly=weekly_data,
        performance=performance_data,
        task_distribution=task_distribution_data
    )

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
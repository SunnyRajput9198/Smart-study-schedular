# apps/backend/routers/history.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

import models, schema, security
from database import get_db

router = APIRouter(
    prefix="/history",
    tags=["History & Analytics Summary"]
)

@router.get("/summary", response_model=schema.HistorySummary)
def get_history_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetches a complete, pre-calculated summary of the user's study history
    for the new, enhanced history page.
    """
    user_id = current_user.id
    
    # Query 1: Calculate core statistics
    stats_query = db.query(
        func.count(models.StudySession.id),
        func.sum(models.StudySession.actual_duration),
        func.avg(models.StudySession.user_difficulty_rating),
        func.avg(models.StudySession.actual_duration)
    ).filter(models.StudySession.user_id == user_id).first()

    stats = schema.HistoryStats(
        total_sessions=stats_query[0] or 0,
        total_hours=round((stats_query[1] or 0) / 60, 1),
        avg_difficulty=round(stats_query[2] or 0, 1),
        avg_duration=round(stats_query[3] or 0)
    )

    # Query 2: Get data for the timeline chart (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    timeline_query = db.query(models.StudySession).filter(
        models.StudySession.user_id == user_id,
        models.StudySession.completed_at >= seven_days_ago
    ).order_by(models.StudySession.completed_at.asc()).all()
    
    timeline_data = [
        schema.TimelinePoint(
            date=s.completed_at.strftime("%b %d"),
            duration=s.actual_duration,
            difficulty=s.user_difficulty_rating
        ) for s in timeline_query
    ]

    # Query 3: Get data for subject distribution chart
    # Replace the old query with this one
    subject_dist_query = db.query(
    models.Subject.name,
    func.sum(models.StudySession.actual_duration),
    func.count(models.StudySession.id)
).select_from(models.StudySession).join(models.Task).join(models.Subject).filter(models.Subject.user_id == user_id).group_by(models.Subject.name).all()

    subject_chart_data = [
        schema.SubjectDistribution(subject=name, duration=duration or 0, sessions=count or 0)
        for name, duration, count in subject_dist_query
    ]

    # Query 4: Get data for difficulty distribution chart
    difficulty_dist_query = db.query(
        models.StudySession.user_difficulty_rating,
        func.count(models.StudySession.id)
    ).filter(models.StudySession.user_id == user_id).group_by(models.StudySession.user_difficulty_rating).all()
    
    difficulty_chart_data = [
        schema.DifficultyDistribution(difficulty=f"Level {rating}", count=count)
        for rating, count in difficulty_dist_query
    ]
    # Ensure all 5 levels are present for the chart
    existing_ratings = {f"Level {r}" for r,c in difficulty_dist_query}
    for i in range(1, 6):
        if f"Level {i}" not in existing_ratings:
            difficulty_chart_data.append(schema.DifficultyDistribution(difficulty=f"Level {i}", count=0))
    difficulty_chart_data.sort(key=lambda x: x.difficulty)


    # Query 5: Get the 5 most recent sessions
    recent_sessions = db.query(models.StudySession).options(
        joinedload(models.StudySession.task).joinedload(models.Task.subject)
    ).filter(models.StudySession.user_id == user_id).order_by(models.StudySession.completed_at.desc()).limit(5).all()

    return schema.HistorySummary(
        stats=stats,
        timeline_data=timeline_data,
        subject_chart_data=subject_chart_data,
        difficulty_chart_data=difficulty_chart_data,
        recent_sessions=recent_sessions
    )
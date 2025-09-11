# apps/backend/routers/notifications.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, Date
from typing import List
from datetime import datetime, timedelta
import models, schema, security
from database import get_db

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get("/", response_model=List[schema.Notification])
def get_upcoming_task_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Finds all pending tasks that are due tomorrow for the logged-in user
    to be displayed in the notification center.
    """
    tomorrow_date = datetime.utcnow().date() + timedelta(days=1)

    tasks_due_tomorrow = (
        db.query(models.Task)
        .join(models.Subject)
        .filter(
            models.Task.user_id == current_user.id,
            models.Task.status == 'pending',
            func.cast(models.Task.deadline, Date) == tomorrow_date
        )
        .all()
    )

    # Format the data into our Notification schema
    notifications = [
        schema.Notification(
            task_id=task.id,
            task_title=task.title,
            subject_name=task.subject.name,
            due_date=task.deadline,
            subject_id=task.subject_id
        ) for task in tasks_due_tomorrow
    ]

    return notifications
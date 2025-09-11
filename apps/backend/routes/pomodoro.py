# apps/backend/routers/pomodoro.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import models, schema, security
from database import get_db
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/pomodoro",
    tags=["Pomodoro"]
)

@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_pomodoro_session(
    session_data: schema.PomodoroSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Logs a completed Pomodoro session to the database.
    """
    new_session = models.PomodoroSession(
        **session_data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_session)
    db.commit()
    
    return {"message": "Pomodoro session logged successfully."}

# --- YEH NAYA FUNCTION ADD KAREIN ---
@router.get("/recent-count", response_model=dict)
def get_recent_pomodoro_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Counts the number of Pomodoro sessions completed in the last hour.
    """
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    count = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == current_user.id,
        models.PomodoroSession.end_time >= one_hour_ago
    ).count()

    return {"active_sessions": count}
# --- END FUNCTION ---
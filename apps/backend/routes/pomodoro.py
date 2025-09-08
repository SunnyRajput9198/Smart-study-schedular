# apps/backend/routers/pomodoro.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import models, schema, security
from database import get_db

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
# backend/routers/sessions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Note the relative imports to work with our organized structure
import schema, models, security
from database import get_db

router = APIRouter(
    prefix="/sessions",
    tags=["Study Sessions"]
)

@router.post("/{task_id}/complete", response_model=schema.StudySession)
def complete_task_and_log_session(
    task_id: int,
    session_data: schema.StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Mark a task as complete and log the study session data.
    This is the primary endpoint for collecting ML training data.
    """
    # 1. Find the task and verify it belongs to the logged-in user.
    # This is a critical security check.
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.status == "complete":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is already marked as complete")

    # 2. Create the new study session entry in the database.
    new_session = models.StudySession(
        **session_data.model_dump(),
        task_id=task_id,
        user_id=current_user.id
    )
    db.add(new_session)

    # 3. Update the task's status from "pending" to "complete".
    task.status = "complete"
    
    # 4. Commit all changes to the database.
    db.commit()
    db.refresh(new_session)
    
    return new_session
# backend/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import schema, models, security
from database import get_db

# All endpoints here will start with /tasks.
# In FastAPI docs (Swagger UI), these routes will show under the Tasks section.
router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)
# . Create a Task for a Subject
@router.post("/{subject_id}", response_model=schema.Task, status_code=status.HTTP_201_CREATED)
def create_task_for_subject(
    subject_id: int,
    task: schema.TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    # First, verify the subject belongs to the current user
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id, 
        models.Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_task = models.Task(
        **task.model_dump(), 
        subject_id=subject_id, 
        user_id=current_user.id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task
# Get Tasks for a Subject
@router.get("/{subject_id}", response_model=List[schema.Task])
def get_tasks_for_subject(
    subject_id: int,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    # Verify the subject belongs to the current user before showing tasks
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id, 
        models.Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    tasks = db.query(models.Task).filter(models.Task.subject_id == subject_id).all()
    return tasks

# Add this new function to the end of apps/backend/routers/tasks.py

@router.patch("/{task_id}/status", response_model=schema.Task)
def update_task_status(
    task_id: int,
    status_update: schema.TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update the status of a single task (e.g., from 'pending' to 'in_progress').
    This will be used by the Kanban board drag-and-drop.
    """
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update the status, commit to the database, and refresh
    task.status = status_update.status
    db.commit()
    db.refresh(task)
    
    return task

# Add this new function to apps/backend/routers/tasks.py

@router.get("/", response_model=List[schema.Task])
def get_all_user_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetches all tasks for the logged-in user, across all subjects.
    This is used to populate the Kanban board.
    """
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    return tasks
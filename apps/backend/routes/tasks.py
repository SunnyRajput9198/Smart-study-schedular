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
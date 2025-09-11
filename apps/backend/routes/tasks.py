# backend/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import timedelta, datetime
import schema, models, security
from database import get_db

# All endpoints here will start with /tasks.
# In FastAPI docs (Swagger UI), these routes will show under the Tasks section.
router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

@router.get("/rescheduled", response_model=List[schema.Task])
def get_rescheduled_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetches all pending tasks that are scheduled for future review
    for the logged-in user.
    """
    # Yeh query sirf un tasks ko dhoondhegi jinka type 'review' hai
    rescheduled_tasks = db.query(models.Task).filter(
    models.Task.user_id == current_user.id,
    models.Task.status == 'pending',
    models.Task.task_type == 'review'
).options(joinedload(models.Task.subject)).order_by(models.Task.deadline.asc()).all()

    return rescheduled_tasks
# --- YAHAN TAK PASTE KAREIN ---
# . Create a Task for a Subject

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


# --- REPLACE THE OLD FUNCTION WITH THIS ONE ---
@router.post("/{task_id}/reschedule", response_model=schema.Task)
def reschedule_task_for_revision(
    task_id: int,
    reschedule_data: schema.RescheduleRequest, # <-- THE CHANGE: Accept new data
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Creates a new, pending task to revise a completed task after a specified number of days.
    """
    original_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id
    ).first()

    if not original_task:
        raise HTTPException(status_code=404, detail="Original task not found")

    # THE CHANGE: Use the delay from the frontend instead of a hardcoded 7 days
    new_deadline = datetime.utcnow() + timedelta(days=reschedule_data.delay_days)

    new_revision_task = models.Task(
        title=f"Revise: {original_task.title}",
        estimated_time=original_task.estimated_time,
        deadline=new_deadline, 
        status="pending",
        subject_id=original_task.subject_id,
        user_id=current_user.id,
        task_type="review"
    )

    db.add(new_revision_task)
    db.commit()
    db.refresh(new_revision_task)

    return new_revision_task
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



# --- YEH NAYA FUNCTION PASTE KAREIN ---

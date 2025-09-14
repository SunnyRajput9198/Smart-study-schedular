# apps/backend/routers/workspaces.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
import models, schema, security
from database import get_db

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"]
)

@router.post("/", response_model=schema.Workspace, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_data: schema.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Creates a new Workspace for a specific date for the logged-in user.
    """
    new_workspace = models.Workspace(
        **workspace_data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)
    return new_workspace

@router.get("/", response_model=List[schema.Workspace])
def get_all_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Retrieves all Workspaces for the logged-in user.
    """
    workspaces = db.query(models.Workspace).filter(
        models.Workspace.user_id == current_user.id
    ).order_by(models.Workspace.date.desc()).all()
    return workspaces

@router.get("/{workspace_id}", response_model=schema.WorkspaceDetail)
def get_single_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Retrieves a single Workspace and all of its associated Tasks.
    """
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()

    # We don't need a special query for tasks because our `models.py`
    # relationships will handle it automatically!

    return workspace
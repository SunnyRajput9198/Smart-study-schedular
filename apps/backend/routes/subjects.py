# backend/routers/subjects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import schema, models, security
from database import get_db

# All routes in this file will start with /subjects.
# In docs (Swagger UI), these endpoints will appear under the tag Subjects.
router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"]
)
# Depends(get_db) → gives you a database session.
# Depends(security.get_current_user) → gives you the logged-in user.
@router.post("/", response_model=schema.Subject, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: schema.SubjectCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    new_subject = models.Subject(**subject.model_dump(), user_id=current_user.id)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@router.get("/", response_model=List[schema.Subject])
def get_all_subjects(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    subjects = db.query(models.Subject).filter(models.Subject.user_id == current_user.id).all()
    return subjects

@router.get("/{subject_id}", response_model=schema.Subject)
def get_single_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.user_id == current_user.id
    ).first()

    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    return subject
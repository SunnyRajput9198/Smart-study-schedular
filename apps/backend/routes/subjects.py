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
    # --- START OF DEBUGGING CODE ---
    print(f"\n--- DEBUGGING: get_single_subject ---")
    print(f"Requested subject_id: {subject_id} (Type: {type(subject_id)})")
    print(f"Current user_id: {current_user.id} (Type: {type(current_user.id)})")
    print(f"Current user email: {current_user.email}")
    
    # Check if subject exists at all (regardless of user)
    subject_exists = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if subject_exists:
        print(f"Subject {subject_id} exists, belongs to user_id: {subject_exists.user_id}")
        if subject_exists.user_id != current_user.id:
            print("ERROR: Subject belongs to different user!")
        else:
            print("SUCCESS: Subject belongs to current user")
    else:
        print(f"ERROR: Subject {subject_id} does not exist in database")
    print("--- END DEBUGGING ---\n")
    # --- END OF DEBUGGING CODE ---

    # Validate subject_id is positive
    if subject_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid subject ID"
        )

    # Query for the subject
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.user_id == current_user.id
    ).first()

    if not subject:
        # More specific error messages
        subject_exists = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
        if subject_exists:
            # Subject exists but belongs to different user
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found or you don't have permission to access it"
            )
        else:
            # Subject doesn't exist at all
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )

    return subject
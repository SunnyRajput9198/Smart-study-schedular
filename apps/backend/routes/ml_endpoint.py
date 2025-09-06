# backend/routers/ml_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import pandas as pd

# Corrected imports to match project structure
from database import get_db
from security import get_current_user
import models
import schema

# Import ML components
from ml.time_prediction import TimePredictionModel
from ml.feature_engineering import FeatureEngineer
from ml.priority_scorer import PriorityScorer

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning"]
)

# Global ML components (will be initialized on server startup)
time_predictor: Optional[TimePredictionModel] = None
feature_engineer: Optional[FeatureEngineer] = None
priority_scorer: Optional[PriorityScorer] = None

def initialize_ml_components():
    """Initialize ML components and load models. Called on server startup."""
    global time_predictor, feature_engineer, priority_scorer
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ FATAL: DATABASE_URL not found. ML components cannot be initialized.")
        return False
    
    try:
        print("Initializing ML components...")
        time_predictor = TimePredictionModel()
        feature_engineer = FeatureEngineer(DATABASE_URL)
        priority_scorer = PriorityScorer(DATABASE_URL)
        
        print("Loading trained models and encoders...")
        models_loaded = time_predictor.load_model()
        encoders_loaded = feature_engineer.load_encoders()
        
        if not models_loaded or not encoders_loaded:
            print("⚠️  Warning: Pre-trained models not found. API endpoints will work but may be limited until models are trained.")
        
        print("✅ ML components initialized successfully.")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize ML components: {e}")
        return False

# ... (Helper functions from your file go here, no changes needed) ...
def get_recommendation_reason(task: dict) -> str:
    reasons = []
    if task["urgency_score"] > 0.7: reasons.append("deadline approaching")
    if task["difficulty_score"] > 0.6: reasons.append("challenging subject")
    if task["forgetting_score"] > 0.7: reasons.append("needs review")
    if not reasons: reasons.append("good time to work on this")
    return "Recommended because: " + ", ".join(reasons)

@router.get("/schedule/generate", response_model=schema.DailySchedule)
async def generate_schedule(
    max_tasks: int = Query(default=10, ge=1, le=20),
    current_user: models.User = Depends(get_current_user)
):
    """Generate an AI-powered daily study schedule for the current user."""
    if not priority_scorer:
        raise HTTPException(status_code=503, detail="ML services are not available.")
    
    try:
        schedule_data = await priority_scorer.generate_daily_schedule(
            user_id=current_user.id,
            max_tasks=max_tasks
        )
        
        # Prepare response using Pydantic models
        formatted_schedule = [
            schema.ScheduleTask(
                task_id=task["task_id"],
                task_name=task["task_name"],
                subject_name=task["subject_name"],
                estimated_time=task["estimated_time"],
                predicted_time=0, # Placeholder, prediction is a separate step
                priority_score=task["priority_score"],
                recommendation_reason=get_recommendation_reason(task)
            ) for task in schedule_data
        ]
        
        insights = priority_scorer.get_schedule_insights(schedule_data)

        return schema.DailySchedule(
            schedule=formatted_schedule,
            insights=insights,
            generated_at=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@router.post("/predict-time", response_model=schema.TimePredictionResponse)
async def predict_task_time(
    tasks_to_predict: schema.TaskBatchUpdate, # Using a schema for the body
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Predict actual completion time for a list of specific tasks."""
    if not time_predictor or not feature_engineer:
        raise HTTPException(status_code=503, detail="ML prediction services are not available.")

    try:
        tasks = db.query(models.Task).filter(
            models.Task.id.in_(tasks_to_predict.task_ids),
            models.Task.user_id == current_user.id
        ).all()

        if not tasks:
            raise HTTPException(status_code=404, detail="No valid tasks found for prediction.")

        tasks_for_prediction = [{
            'task_id': task.id, 'estimated_time': task.estimated_time,
            'subject_id': task.subject_id, 'deadline': task.deadline,
            'user_id': current_user.id
        } for task in tasks]

        prediction_features = await feature_engineer.prepare_prediction_features(tasks_for_prediction)
        predictions = time_predictor.predict(prediction_features)

        results = [
            schema.TimePrediction(
                task_id=task.id,
                predicted_time_minutes=max(5, int(pred)),
                confidence_score=0.85 # Placeholder confidence
            ) for task, pred in zip(tasks, predictions)
        ]
        
        return schema.TimePredictionResponse(
            predictions=results,
            model_version="1.0.0" # Placeholder version
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to predict task times: {str(e)}")

# Add other endpoints like /insights and /status similarly if needed
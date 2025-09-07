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

# Import ML components with error handling
try:
    from ml.time_prediction import TimePredictionModel
    from ml.feature_engineering import FeatureEngineer
    ML_AVAILABLE = True
except ImportError as e:
    print(f"ML components not available: {e}")
    ML_AVAILABLE = False

# Try to import PriorityScorer, create fallback if not available
try:
    from ml.priority_scorer import PriorityScorer
    PRIORITY_SCORER_AVAILABLE = True
except ImportError:
    print("PriorityScorer not available, using fallback")
    PRIORITY_SCORER_AVAILABLE = False

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning"]
)

# Global ML components (will be initialized on server startup)
time_predictor: Optional[TimePredictionModel] = None
feature_engineer: Optional[FeatureEngineer] = None
priority_scorer: Optional['PriorityScorer'] = None

def initialize_ml_components():
    """Initialize ML components and load models. Called on server startup."""
    global time_predictor, feature_engineer, priority_scorer
    
    if not ML_AVAILABLE:
        print("❌ ML components not available due to import errors")
        return False
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")
    if not DATABASE_URL:
        print("❌ FATAL: DATABASE_URL not found. ML components cannot be initialized.")
        return False
    
    try:
        print("Initializing ML components...")
        time_predictor = TimePredictionModel()
        feature_engineer = FeatureEngineer(DATABASE_URL)
        
        if PRIORITY_SCORER_AVAILABLE:
            priority_scorer = PriorityScorer(DATABASE_URL)
        
        print("Loading trained models and encoders...")
        models_loaded = time_predictor.load_model()
        feature_engineer.load_encoders()
        
        if not models_loaded:
            print("⚠️  Warning: Pre-trained models not found. Training basic models...")
            # Try to train with existing data or create dummy model
            
        print("✅ ML components initialized successfully.")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize ML components: {e}")
        return False

# Fallback Priority Scorer for when the actual one isn't available
class FallbackPriorityScorer:
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    async def generate_daily_schedule(self, user_id: int, max_tasks: int = 10):
        """Generate a simple schedule using database queries"""
        import asyncpg
        
        try:
            conn = await asyncpg.connect(self.database_url)
            
            # Simple query to get user's pending tasks
            query = """
            SELECT 
                t.id as task_id,
                t.title as task_name,
                t.estimated_time,
                t.deadline,
                s.name as subject_name,
                CASE 
                    WHEN t.deadline < NOW() + INTERVAL '1 day' THEN 0.9
                    WHEN t.deadline < NOW() + INTERVAL '3 days' THEN 0.7
                    WHEN t.deadline < NOW() + INTERVAL '7 days' THEN 0.5
                    ELSE 0.3
                END as priority_score
            FROM tasks t
            JOIN subjects s ON t.subject_id = s.id
            WHERE s.user_id = $1 
            AND t.completed = FALSE
            ORDER BY priority_score DESC, t.deadline ASC
            LIMIT $2
            """
            
            rows = await conn.fetch(query, user_id, max_tasks)
            await conn.close()
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            print(f"Database error in fallback scheduler: {e}")
            # Return empty schedule if database fails
            return []
    
    def get_schedule_insights(self, schedule_data):
        """Generate basic insights"""
        if not schedule_data:
            return ["No tasks available for scheduling"]
        
        total_time = sum(task.get('estimated_time', 0) for task in schedule_data)
        high_priority_count = sum(1 for task in schedule_data if task.get('priority_score', 0) > 0.7)
        
        insights = [
            f"Total estimated time: {total_time} minutes",
            f"High priority tasks: {high_priority_count}",
            f"Tasks scheduled: {len(schedule_data)}"
        ]
        
        return insights

def get_recommendation_reason(task: dict) -> str:
    """Generate recommendation reason based on task data"""
    priority = task.get("priority_score", 0)
    
    if priority > 0.8:
        return "High priority - deadline approaching soon"
    elif priority > 0.6:
        return "Medium priority - should be completed this week"
    elif priority > 0.4:
        return "Normal priority - good time to work on this"
    else:
        return "Low priority - can be scheduled flexibly"

@router.get("/schedule/generate", response_model=schema.DailySchedule)
async def generate_schedule(
    max_tasks: int = Query(default=7, ge=1, le=20),
    current_user: models.User = Depends(get_current_user)
):
    """Generate an AI-powered daily study schedule for the current user."""
    
    print(f"🔍 Generating schedule for user {current_user.id}, max_tasks: {max_tasks}")
    
    # Use fallback if priority_scorer is not available
    active_scorer = priority_scorer
    if not active_scorer:
        print("Using fallback priority scorer...")
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")
        active_scorer = FallbackPriorityScorer(DATABASE_URL)
    
    try:
        print("📊 Calling generate_daily_schedule...")
        schedule_data = await active_scorer.generate_daily_schedule(
            user_id=current_user.id,
            max_tasks=max_tasks
        )
        
        print(f"📋 Got {len(schedule_data)} tasks from scheduler")
        print(f"📋 Sample data: {schedule_data[:1] if schedule_data else 'No data'}")
        
        # Prepare response using Pydantic models
        formatted_schedule = []
        for task in schedule_data:
            print(f"🔧 Processing task: {task}")
            formatted_task = schema.ScheduleTask(
                task_id=task["task_id"],
                task_name=task["task_name"],
                subject_name=task["subject_name"],
                estimated_time=task.get("estimated_time", 30),
                predicted_time=task.get("estimated_time", 30), # Use estimated as predicted for now
                priority_score=float(task.get("priority_score", 0.5)),
                recommendation_reason=get_recommendation_reason(task)
            )
            formatted_schedule.append(formatted_task)
        
        print("📈 Getting insights...")
        insights = active_scorer.get_schedule_insights(schedule_data)
        print(f"💡 Insights: {insights}")

        return schema.DailySchedule(
    schedule=formatted_schedule,
    insights={"insights": insights},  # Wrap the list in a dict
    generated_at=datetime.now()
)
        
        print("✅ Schedule generated successfully")
        return result
        
    except Exception as e:
        print(f"❌ Error generating schedule: {e}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@router.post("/predict-time", response_model=schema.TimePredictionResponse)
async def predict_task_time(
    tasks_to_predict: schema.TaskBatchUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Predict actual completion time for a list of specific tasks."""
    if not time_predictor or not feature_engineer:
        # Use simple fallback prediction
        tasks = db.query(models.Task).filter(
            models.Task.id.in_(tasks_to_predict.task_ids),
            models.Task.user_id == current_user.id
        ).all()

        if not tasks:
            raise HTTPException(status_code=404, detail="No valid tasks found for prediction.")

        # Simple fallback: use estimated time with some variation
        results = [
            schema.TimePrediction(
                task_id=task.id,
                predicted_time_minutes=max(5, int(task.estimated_time * 1.2)),  # Add 20% buffer
                confidence_score=0.6  # Lower confidence for fallback
            ) for task in tasks
        ]
        
        return schema.TimePredictionResponse(
            predictions=results,
            model_version="fallback-1.0"
        )

    try:
        tasks = db.query(models.Task).filter(
            models.Task.id.in_(tasks_to_predict.task_ids),
            models.Task.user_id == current_user.id
        ).all()

        if not tasks:
            raise HTTPException(status_code=404, detail="No valid tasks found for prediction.")

        tasks_for_prediction = [{
            'task_id': task.id, 
            'estimated_time': task.estimated_time,
            'subject_id': task.subject_id, 
            'due_date': task.deadline,  # Changed from 'deadline' to 'due_date'
            'user_id': current_user.id
        } for task in tasks]

        prediction_features = await feature_engineer.prepare_prediction_features(tasks_for_prediction)
        predictions = time_predictor.predict(prediction_features)

        results = [
            schema.TimePrediction(
                task_id=task.id,
                predicted_time_minutes=max(5, int(pred)),
                confidence_score=0.85
            ) for task, pred in zip(tasks, predictions)
        ]
        
        return schema.TimePredictionResponse(
            predictions=results,
            model_version="1.0.0"
        )
    except Exception as e:
        print(f"Error in time prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to predict task times: {str(e)}")

@router.get("/status")
async def get_ml_status():
    """Get the status of ML components"""
    return {
        "ml_available": ML_AVAILABLE,
        "time_predictor_loaded": time_predictor is not None,
        "feature_engineer_loaded": feature_engineer is not None,
        "priority_scorer_available": PRIORITY_SCORER_AVAILABLE,
        "priority_scorer_loaded": priority_scorer is not None
    }
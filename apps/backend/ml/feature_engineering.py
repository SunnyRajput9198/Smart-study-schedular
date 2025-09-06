# ml/feature_engineering.py
import pandas as pd 
import numpy as np 
from datetime import datetime, timedelta
from typing import List, Dict, Any
import asyncpg
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pickle
import os
# $ source venv/scripts/activate
class FeatureEngineer:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.models_dir = "ml/models"
        os.makedirs(self.models_dir, exist_ok=True)
        
    async def fetch_training_data(self) -> pd.DataFrame:
        """Fetch training data from database"""
        conn = await asyncpg.connect(self.database_url)
        
        try:
            query = """
            SELECT 
                ss.task_id,
                ss.actual_duration,
                ss.user_difficulty_rating,
                ss.completed_at,
                t.estimated_time,
                t.title as task_name,
                t.deadline as due_date,
                s.name as subject_name,
                s.id as subject_id,
                u.id as user_id
            FROM study_sessions ss
            JOIN tasks t ON ss.task_id = t.id
            JOIN subjects s ON t.subject_id = s.id
            JOIN users u ON s.user_id = u.id
            ORDER BY ss.completed_at DESC
            """
            
            rows = await conn.fetch(query)
            df = pd.DataFrame([dict(row) for row in rows])
            
            return df
            
        finally:
            await conn.close()
    
    def extract_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract time-based features from datetime columns"""
        df = df.copy()
        
        # Convert to datetime if not already
        df['completed_at'] = pd.to_datetime(df['completed_at'])
        df['due_date'] = pd.to_datetime(df['due_date'])
        
        # Extract time features
        df['hour_of_day'] = df['completed_at'].dt.hour
        df['day_of_week'] = df['completed_at'].dt.dayofweek  # 0=Monday, 6=Sunday
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['month'] = df['completed_at'].dt.month
        
        # Time of day categories
        def categorize_time_of_day(hour):
            if 6 <= hour < 12:
                return 'morning'
            elif 12 <= hour < 17:
                return 'afternoon'
            elif 17 <= hour < 21:
                return 'evening'
            else:
                return 'night'
        
        df['time_of_day_category'] = df['hour_of_day'].apply(categorize_time_of_day)
        
        # Days until due date (at completion time)
        df['days_until_due'] = (df['due_date'] - df['completed_at']).dt.days
        
        return df
    
    def create_subject_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create subject-specific features"""
        df = df.copy()
        
        # Subject difficulty (average user rating for this subject)
        subject_difficulty = df.groupby('subject_id')['user_difficulty_rating'].mean()
        df['subject_avg_difficulty'] = df['subject_id'].map(subject_difficulty)
        
        # Subject completion time ratio (actual vs estimated)
        df['time_ratio'] = df['actual_duration'] / df['estimated_time']
        subject_time_ratio = df.groupby('subject_id')['time_ratio'].mean()
        df['subject_avg_time_ratio'] = df['subject_id'].map(subject_time_ratio)
        
        return df
    
    def create_user_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create user-specific features"""
        df = df.copy()
        
        # User's average performance
        user_stats = df.groupby('user_id').agg({
            'actual_duration': 'mean',
            'user_difficulty_rating': 'mean',
            'time_ratio': 'mean'
        }).rename(columns={
            'actual_duration': 'user_avg_duration',
            'user_difficulty_rating': 'user_avg_difficulty',
            'time_ratio': 'user_avg_time_ratio'
        })
        
        df = df.merge(user_stats, left_on='user_id', right_index=True, how='left')
        
        return df
    
    def prepare_features_for_time_prediction(self, df: pd.DataFrame) -> tuple:
        """Prepare features specifically for time prediction model"""
        df = df.copy()
        
        # Select features for time prediction
        feature_columns = [
            'estimated_time',
            'subject_id',
            'hour_of_day',
            'day_of_week',
            'is_weekend',
            'subject_avg_difficulty',
            'subject_avg_time_ratio',
            'user_avg_time_ratio',
            'days_until_due'
        ]
        
        # Handle categorical features
        if 'subject_id' not in self.label_encoders:
            self.label_encoders['subject_id'] = LabelEncoder()
            df['subject_id_encoded'] = self.label_encoders['subject_id'].fit_transform(df['subject_id'])
        else:
            df['subject_id_encoded'] = self.label_encoders['subject_id'].transform(df['subject_id'])
        
        # Replace subject_id with encoded version
        feature_columns = [col if col != 'subject_id' else 'subject_id_encoded' for col in feature_columns]
        
        X = df[feature_columns].copy()
        y = df['actual_duration'].copy()
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        return X, y
    
    async def prepare_all_features(self) -> tuple:
        """Complete feature engineering pipeline"""
        print("Fetching training data...")
        df = await self.fetch_training_data()
        
        if df.empty:
            raise ValueError("No training data available. Please generate some data first.")
        
        print(f"Loaded {len(df)} training samples")
        
        print("Extracting time features...")
        df = self.extract_time_features(df)
        
        print("Creating subject features...")
        df = self.create_subject_features(df)
        
        print("Creating user features...")
        df = self.create_user_features(df)
        
        print("Preparing features for time prediction...")
        X, y = self.prepare_features_for_time_prediction(df)
        
        return X, y, df
    
    def save_encoders(self):
        """Save label encoders and scalers"""
        with open(f"{self.models_dir}/label_encoders.pkl", 'wb') as f:
            pickle.dump(self.label_encoders, f)
        
        with open(f"{self.models_dir}/scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)
    
    def load_encoders(self):
        """Load saved encoders and scalers"""
        try:
            with open(f"{self.models_dir}/label_encoders.pkl", 'rb') as f:
                self.label_encoders = pickle.load(f)
            
            with open(f"{self.models_dir}/scaler.pkl", 'rb') as f:
                self.scaler = pickle.load(f)
        except FileNotFoundError:
            print("No saved encoders found. Will create new ones during training.")
    
    async def prepare_prediction_features(self, tasks_data: List[Dict]) -> pd.DataFrame:
        """Prepare features for prediction on new tasks"""
        df = pd.DataFrame(tasks_data)
        
        # Add current time features
        now = datetime.now()
        df['hour_of_day'] = now.hour
        df['day_of_week'] = now.weekday()
        df['is_weekend'] = (now.weekday() >= 5).astype(int)
        
        # Calculate days until due
        df['due_date'] = pd.to_datetime(df['due_date'])
        df['days_until_due'] = (df['due_date'] - now).dt.days
        
        # Get subject statistics from training data
        training_df = await self.fetch_training_data()
        if not training_df.empty:
            training_df = self.create_subject_features(training_df)
            training_df = self.create_user_features(training_df)
            
            subject_stats = training_df.groupby('subject_id').agg({
                'user_difficulty_rating': 'mean',
                'time_ratio': 'mean'
            }).rename(columns={
                'user_difficulty_rating': 'subject_avg_difficulty',
                'time_ratio': 'subject_avg_time_ratio'
            })
            
            user_stats = training_df.groupby('user_id').agg({
                'time_ratio': 'mean'
            }).rename(columns={
                'time_ratio': 'user_avg_time_ratio'
            })
            
            # Merge stats
            df = df.merge(subject_stats, left_on='subject_id', right_index=True, how='left')
            df = df.merge(user_stats, left_on='user_id', right_index=True, how='left')
        
        # Fill missing values with defaults
        df['subject_avg_difficulty'] = df['subject_avg_difficulty'].fillna(3.0)
        df['subject_avg_time_ratio'] = df['subject_avg_time_ratio'].fillna(1.0)
        df['user_avg_time_ratio'] = df['user_avg_time_ratio'].fillna(1.0)
        
        # Encode categorical features
        if 'subject_id' in self.label_encoders:
            # Handle unknown subjects
            known_subjects = set(self.label_encoders['subject_id'].classes_)
            df['subject_id_encoded'] = df['subject_id'].apply(
                lambda x: self.label_encoders['subject_id'].transform([x])[0] if x in known_subjects else -1
            )
        else:
            df['subject_id_encoded'] = df['subject_id']
        
        # Select prediction features
        feature_columns = [
            'estimated_time',
            'subject_id_encoded',
            'hour_of_day',
            'day_of_week',
            'is_weekend',
            'subject_avg_difficulty',
            'subject_avg_time_ratio',
            'user_avg_time_ratio',
            'days_until_due'
        ]
        
        return df[feature_columns].fillna(0)
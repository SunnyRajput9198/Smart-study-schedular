# ml/time_predictor.py
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import os
import json
from typing import List, Dict, Any
import asyncio

class TimePredictionModel:
    def __init__(self, models_dir: str = "ml/models"):
        self.models_dir = models_dir
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.is_trained = False
        
        # Create models directory
        os.makedirs(models_dir, exist_ok=True)
        
    def build_model(self, input_dim: int) -> keras.Model:
        """Build neural network for time prediction"""
        model = keras.Sequential([
            keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.1),
            keras.layers.Dense(16, activation='relu'),
            keras.layers.Dense(1, activation='linear')  # Output: predicted time in minutes
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='huber',  # Robust to outliers
            metrics=['mae', 'mse']
        )
        
        return model
    
    def train(self, X: pd.DataFrame, y: pd.Series, validation_split: float = 0.2) -> Dict[str, Any]:
        """Train the time prediction model"""
        print(f"Training model with {len(X)} samples and {len(X.columns)} features")
        
        # Store feature names
        self.feature_names = list(X.columns)
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=validation_split, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Build model
        self.model = self.build_model(X_train_scaled.shape[1])
        
        # Callbacks
        early_stopping = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=20,
            restore_best_weights=True
        )
        
        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=10,
            min_lr=1e-7
        )
        
        # Train model
        history = self.model.fit(
            X_train_scaled, y_train,
            validation_data=(X_val_scaled, y_val),
            epochs=200,
            batch_size=32,
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        # Evaluate model
        train_pred = self.model.predict(X_train_scaled)
        val_pred = self.model.predict(X_val_scaled)
        
        train_metrics = {
            'mae': mean_absolute_error(y_train, train_pred),
            'mse': mean_squared_error(y_train, train_pred),
            'r2': r2_score(y_train, train_pred)
        }
        
        val_metrics = {
            'mae': mean_absolute_error(y_val, val_pred),
            'mse': mean_squared_error(y_val, val_pred),
            'r2': r2_score(y_val, val_pred)
        }
        
        print(f"Training Results:")
        print(f"Train MAE: {train_metrics['mae']:.2f} minutes")
        print(f"Train R²: {train_metrics['r2']:.3f}")
        print(f"Val MAE: {val_metrics['mae']:.2f} minutes")
        print(f"Val R²: {val_metrics['r2']:.3f}")
        
        self.is_trained = True
        
        return {
            'train_metrics': train_metrics,
            'val_metrics': val_metrics,
            'history': history.history
        }
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make time predictions"""
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")
        
        # Ensure correct feature order
        if self.feature_names:
            X = X[self.feature_names]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        
        # Ensure predictions are positive
        predictions = np.maximum(predictions, 5)  # Minimum 5 minutes
        
        return predictions.flatten()
    
    def save_model(self):
        """Save the trained model and preprocessing objects"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        # Save Keras model
        self.model.save(f"{self.models_dir}/time_predictor.keras")
        
        # Save scaler
        joblib.dump(self.scaler, f"{self.models_dir}/time_predictor_scaler.pkl")
        
        # Save metadata
        metadata = {
            'feature_names': self.feature_names,
            'is_trained': self.is_trained
        }
        
        with open(f"{self.models_dir}/time_predictor_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Model saved to {self.models_dir}/")
    
    def load_model(self):
        """Load a previously trained model"""
        try:
            # Load Keras model
            self.model = keras.models.load_model(f"{self.models_dir}/time_predictor.keras")
            
            # Load scaler
            self.scaler = joblib.load(f"{self.models_dir}/time_predictor_scaler.pkl")
            
            # Load metadata
            with open(f"{self.models_dir}/time_predictor_metadata.json", 'r') as f:
                metadata = json.load(f)
            
            self.feature_names = metadata['feature_names']
            self.is_trained = metadata['is_trained']
            
            print("Time prediction model loaded successfully")
            return True
            
        except Exception as e:
            print(f"Failed to load model: {e}")
            return False
    
    def get_feature_importance(self) -> pd.DataFrame:
        """Get approximate feature importance using permutation"""
        if not self.is_trained:
            raise ValueError("Model must be trained first")
        
        # This is a simplified importance calculation
        # For more accurate results, you'd use libraries like SHAP
        weights = []
        for layer in self.model.layers:
            if hasattr(layer, 'get_weights') and layer.get_weights():
                layer_weights = layer.get_weights()[0]
                if len(layer_weights.shape) == 2:
                    # Take mean absolute weight for each input feature
                    feature_weights = np.mean(np.abs(layer_weights), axis=1)
                    weights.append(feature_weights)
                    break
        
        if weights and self.feature_names:
            importance_df = pd.DataFrame({
                'feature': self.feature_names,
                'importance': weights[0] / np.sum(weights[0])  # Normalize
            }).sort_values('importance', ascending=False)
            
            return importance_df
        
        return pd.DataFrame()

# Example usage and training script
async def train_time_predictor():
    """Train the time prediction model"""
    from .feature_engineering import FeatureEngineer
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Initialize components
    feature_engineer = FeatureEngineer(DATABASE_URL)
    time_predictor = TimePredictionModel()
    
    try:
        # Prepare features
        X, y, _ = await feature_engineer.prepare_all_features()
        
        print(f"Dataset shape: {X.shape}")
        print(f"Features: {list(X.columns)}")
        
        # Train model
        results = time_predictor.train(X, y)
        
        # Save model and encoders
        time_predictor.save_model()
        feature_engineer.save_encoders()
        
        print("Training completed successfully!")
        
        # Show feature importance
        importance = time_predictor.get_feature_importance()
        if not importance.empty:
            print("\nTop 5 Most Important Features:")
            print(importance.head())
        
        return results
        
    except Exception as e:
        print(f"Training failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(train_time_predictor())
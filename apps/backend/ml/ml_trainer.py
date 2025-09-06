# ml/trainer.py
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from scripts.data_generator import SyntheticDataGenerator
from ml.feature_engineering import FeatureEngineer
from ml.time_prediction import TimePredictionModel
from ml.priority_scorer import PriorityScorer

class MLTrainer:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.data_generator = SyntheticDataGenerator(database_url)
        self.feature_engineer = FeatureEngineer(database_url)
        self.time_predictor = TimePredictionModel()
        self.priority_scorer = PriorityScorer(database_url)
        
    async def generate_synthetic_data(self, regenerate: bool = False):
        """Generate synthetic training data"""
        print("=== DATA GENERATION ===")
        
        if regenerate:
            print("Regenerating all synthetic data...")
            await self.data_generator.generate_all_data()
        else:
            # Check if we have existing data
            try:
                training_df = await self.feature_engineer.fetch_training_data()
                if len(training_df) > 100:  # Enough data exists
                    print(f"Found {len(training_df)} existing training samples. Skipping data generation.")
                    return
            except:
                pass
            
            print("No sufficient training data found. Generating synthetic data...")
            await self.data_generator.generate_all_data()
    
    async def train_time_prediction_model(self):
        """Train the time prediction model"""
        print("\n=== TIME PREDICTION MODEL TRAINING ===")
        
        try:
            # Prepare features
            print("Preparing features for time prediction...")
            X, y, raw_df = await self.feature_engineer.prepare_all_features()
            
            print(f"Training dataset: {len(X)} samples, {len(X.columns)} features")
            print(f"Target variable statistics:")
            print(f"  Mean duration: {y.mean():.1f} minutes")
            print(f"  Std duration: {y.std():.1f} minutes")
            print(f"  Min duration: {y.min():.1f} minutes")
            print(f"  Max duration: {y.max():.1f} minutes")
            
            # Train model
            results = self.time_predictor.train(X, y, validation_split=0.2)
            
            # Save model and encoders
            self.time_predictor.save_model()
            self.feature_engineer.save_encoders()
            
            print(f"✅ Time prediction model trained successfully!")
            print(f"   Validation MAE: {results['val_metrics']['mae']:.2f} minutes")
            print(f"   Validation R²: {results['val_metrics']['r2']:.3f}")
            
            # Show feature importance
            try:
                importance = self.time_predictor.get_feature_importance()
                if not importance.empty:
                    print("\n📊 Top 5 Most Important Features:")
                    for _, row in importance.head().iterrows():
                        print(f"   {row['feature']}: {row['importance']:.3f}")
            except Exception as e:
                print(f"Could not compute feature importance: {e}")
            
            return results
            
        except Exception as e:
            print(f"❌ Time prediction model training failed: {e}")
            raise
    
    async def test_priority_scoring(self, user_id: int = 1):
        """Test the priority scoring system"""
        print(f"\n=== PRIORITY SCORING TEST (User {user_id}) ===")
        
        try:
            # Generate schedule
            schedule = await self.priority_scorer.generate_daily_schedule(
                user_id, max_tasks=8
            )
            
            if not schedule:
                print("❌ No pending tasks found for this user")
                return
            
            print(f"✅ Generated schedule with {len(schedule)} tasks")
            
            # Display top 5 tasks
            print(f"\n📅 Top 5 Recommended Tasks:")
            print("-" * 80)
            
            for i, task in enumerate(schedule[:5], 1):
                print(f"{i}. {task['task_name']} ({task['subject_name']})")
                print(f"   🎯 Priority: {task['priority_score']:.3f}")
                print(f"   ⏰ Due in {task['days_until_due']} days | "
                      f"Est: {task['estimated_time']}min")
                print(f"   📊 U:{task['urgency_score']:.2f} "
                      f"D:{task['difficulty_score']:.2f} "
                      f"F:{task['forgetting_score']:.2f} "
                      f"P:{task['productivity_score']:.2f}")
                if task['days_since_last_study'] is not None:
                    print(f"   📚 Last studied: {task['days_since_last_study']} days ago")
                else:
                    print(f"   📚 Never studied this subject")
                print()
            
            # Show insights
            insights = self.priority_scorer.get_schedule_insights(schedule)
            print("💡 Schedule Insights:")
            print(f"   • Total: {insights['total_tasks']} tasks "
                  f"({insights['total_time_hours']} hours)")
            for insight in insights['insights']:
                print(f"   • {insight}")
            
            return schedule
            
        except Exception as e:
            print(f"❌ Priority scoring test failed: {e}")
            raise
    
    async def test_time_prediction(self, user_id: int = 1, num_tasks: int = 5):
        """Test time prediction on user's pending tasks"""
        print(f"\n=== TIME PREDICTION TEST (User {user_id}) ===")
        
        try:
            # Load trained model
            if not self.time_predictor.load_model():
                print("❌ No trained model found. Please train first.")
                return
            
            # Load encoders
            self.feature_engineer.load_encoders()
            
            # Get user's pending tasks
            pending_tasks = await self.priority_scorer.get_pending_tasks(user_id)
            if not pending_tasks:
                print("❌ No pending tasks found for this user")
                return
            
            # Prepare tasks for prediction
            tasks_for_prediction = []
            for task in pending_tasks[:num_tasks]:
                tasks_for_prediction.append({
                    'task_id': task['id'],
                    'estimated_time': task['estimated_time'],
                    'subject_id': task['subject_id'],
                    'due_date': task['due_date'],
                    'user_id': user_id
                })
            
            # Prepare features
            prediction_features = await self.feature_engineer.prepare_prediction_features(
                tasks_for_prediction
            )
            
            # Make predictions
            predictions = self.time_predictor.predict(prediction_features)
            
            print(f"✅ Generated predictions for {len(predictions)} tasks")
            print(f"\n🔮 Time Predictions vs Estimates:")
            print("-" * 60)
            
            total_estimated = 0
            total_predicted = 0
            
            for i, (task, predicted_time) in enumerate(zip(pending_tasks[:num_tasks], predictions)):
                estimated = task['estimated_time']
                predicted = max(5, int(predicted_time))  # Minimum 5 minutes
                difference = predicted - estimated
                
                print(f"{i+1}. {task['name'][:40]}...")
                print(f"   Subject: {task['subject_name']}")
                print(f"   Estimated: {estimated} min | Predicted: {predicted} min")
                print(f"   Difference: {difference:+d} min "
                      f"({(difference/estimated)*100:+.1f}%)")
                print()
                
                total_estimated += estimated
                total_predicted += predicted
            
            total_difference = total_predicted - total_estimated
            print(f"📊 Summary:")
            print(f"   Total Estimated: {total_estimated} min ({total_estimated/60:.1f}h)")
            print(f"   Total Predicted: {total_predicted} min ({total_predicted/60:.1f}h)")
            print(f"   Total Difference: {total_difference:+d} min "
                  f"({(total_difference/total_estimated)*100:+.1f}%)")
            
        except Exception as e:
            print(f"❌ Time prediction test failed: {e}")
            raise
    
    async def full_pipeline(self, regenerate_data: bool = False, test_user_id: int = 1):
        """Run the complete ML pipeline"""
        print("🚀 Starting Complete ML Pipeline")
        print("=" * 50)
        
        start_time = datetime.now()
        
        try:
            # Step 1: Generate/check data
            await self.generate_synthetic_data(regenerate_data)
            
            # Step 2: Train time prediction model
            await self.train_time_prediction_model()
            
            # Step 3: Test priority scoring
            await self.test_priority_scoring(test_user_id)
            
            # Step 4: Test time prediction
            await self.test_time_prediction(test_user_id)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print(f"\n🎉 PIPELINE COMPLETED SUCCESSFULLY!")
            print(f"   Total time: {duration:.1f} seconds")
            print(f"   Models saved in: ml/models/")
            print(f"\n✅ Your Smart Study Scheduler ML system is ready!")
            
        except Exception as e:
            print(f"\n❌ PIPELINE FAILED: {e}")
            raise

def main():
    """Main entry point"""
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        return
    
    trainer = MLTrainer(DATABASE_URL)
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Train Smart Study Scheduler ML models")
    parser.add_argument("--regenerate-data", action="store_true", 
                       help="Regenerate synthetic training data")
    parser.add_argument("--user-id", type=int, default=1,
                       help="User ID for testing (default: 1)")
    parser.add_argument("--data-only", action="store_true",
                       help="Only generate data, don't train models")
    parser.add_argument("--train-only", action="store_true",
                       help="Only train models, don't generate data")
    parser.add_argument("--test-only", action="store_true",
                       help="Only run tests, don't train")
    
    args = parser.parse_args()
    
    async def run():
        if args.data_only:
            await trainer.generate_synthetic_data(args.regenerate_data)
        elif args.train_only:
            await trainer.train_time_prediction_model()
        elif args.test_only:
            await trainer.test_priority_scoring(args.user_id)
            await trainer.test_time_prediction(args.user_id)
        else:
            await trainer.full_pipeline(args.regenerate_data, args.user_id)
    
    asyncio.run(run())

if __name__ == "__main__":
    main()
import asyncio
import os
import sys
from datetime import datetime, timedelta
from faker import Faker
import random
import asyncpg
from passlib.context import CryptContext
from pathlib import Path

# Add parent directory to path to allow sibling imports
sys.path.append(str(Path(__file__).parent.parent))

import models
from database import engine

# Hashing utility
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class SyntheticDataGenerator:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.fake = Faker()

    async def get_password_hash(self, password):
        return pwd_context.hash(password)

    async def clear_existing_data(self, conn):
        print("Clearing existing synthetic data...")
        await conn.execute("DELETE FROM study_sessions;")
        await conn.execute("DELETE FROM tasks;")
        await conn.execute("DELETE FROM subjects;")
        await conn.execute("DELETE FROM users;")
        print("Data cleared.")

    async def generate_users(self, conn, num_users=5):
        print(f"Generating {num_users} users...")
        users_data = []
        for i in range(num_users):
            username = self.fake.user_name() + str(i)
            hashed_password = await self.get_password_hash("password123")
            user = {
                'username': username,
                'email': self.fake.email(),
                'password_hash': hashed_password,
                'created_at': self.fake.date_time_this_year(),
                'timezone': 'UTC'
            }
            users_data.append(user)
        
        await conn.copy_records_to_table('users', records=users_data, columns=list(users_data[0].keys()))
        user_ids = await conn.fetch("SELECT id FROM users ORDER BY id")
        return [user['id'] for user in user_ids]

    # ... (generate_subjects, generate_tasks, generate_study_sessions functions remain the same) ...
    async def generate_subjects(self, conn, user_ids, subjects_per_user=5):
        print(f"Generating {subjects_per_user} subjects for each user...")
        subjects_data = []
        subject_names = ["Quantum Mechanics", "Data Structures", "Organic Chemistry", "World History", "Literary Analysis", "Calculus II", "Microbiology", "Art History"]
        for user_id in user_ids:
            for _ in range(subjects_per_user):
                subject = {
                    'name': random.choice(subject_names),
                    'user_id': user_id,
                    'created_at': self.fake.date_time_this_year(),
                    'color_tag': self.fake.hex_color()
                }
                subjects_data.append(subject)
        await conn.copy_records_to_table('subjects', records=subjects_data, columns=list(subjects_data[0].keys()))
        subject_ids_map = await conn.fetch("SELECT id, user_id FROM subjects")
        return {user_id: [s['id'] for s in subject_ids_map if s['user_id'] == user_id] for user_id in user_ids}

    async def generate_tasks(self, conn, subject_ids_map, tasks_per_subject=10):
        print(f"Generating {tasks_per_subject} tasks for each subject...")
        tasks_data = []
        task_types = ["reading", "assignment", "practice", "exam_prep"]
        for user_id, user_subjects in subject_ids_map.items():
            for subject_id in user_subjects:
                for _ in range(tasks_per_subject):
                    created_at = self.fake.date_time_between(start_date='-6m', end_date='now')
                    task = {
                        'title': self.fake.sentence(nb_words=4),
                        'estimated_time': random.choice([30, 45, 60, 90, 120]),
                        'deadline': created_at + timedelta(days=random.randint(3, 30)),
                        'status': 'complete',
                        'subject_id': subject_id,
                        'user_id': user_id,
                        'created_at': created_at,
                        'task_type': random.choice(task_types)
                    }
                    tasks_data.append(task)
        await conn.copy_records_to_table('tasks', records=tasks_data, columns=list(tasks_data[0].keys()))
        task_ids_map = await conn.fetch("SELECT id, subject_id, user_id, estimated_time FROM tasks")
        return [dict(task) for task in task_ids_map]

    async def generate_study_sessions(self, conn, tasks):
        print(f"Generating study sessions for {len(tasks)} tasks...")
        sessions_data = []
        for task in tasks:
            duration_variance = int(task['estimated_time'] * random.uniform(-0.3, 0.4))
            actual_duration = max(10, task['estimated_time'] + duration_variance)
            difficulty = random.randint(1, 5)
            session = {
                'task_id': task['id'],
                'user_id': task['user_id'],
                'actual_duration': actual_duration,
                'user_difficulty_rating': difficulty,
                'completed_at': self.fake.date_time_between(start_date='-6m', end_date='now')
            }
            sessions_data.append(session)
        await conn.copy_records_to_table('study_sessions', records=sessions_data, columns=list(sessions_data[0].keys()))


    async def generate_all_data(self, clear_data=True):
        conn = None
        try:
            conn = await asyncpg.connect(self.database_url)
            if clear_data:
                await self.clear_existing_data(conn)
            
            user_ids = await self.generate_users(conn)
            subject_ids_map = await self.generate_subjects(conn, user_ids)
            tasks = await self.generate_tasks(conn, subject_ids_map)
            await self.generate_study_sessions(conn, tasks)
            
            print("\n✅ Synthetic data generation complete!")
        except Exception as e:
            # THE FIX: This now provides a much more detailed error message
            print(f"\n❌ An error occurred during data generation.")
            print(f"   Error Type: {type(e).__name__}")
            print(f"   Error Details: {e}")
            raise # Re-raise the exception to stop the setup script
        finally:
            if conn:
                await conn.close()

# ... (The main function to run the script remains the same) ...
async def main():
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found.")
        return
    
    generator = SyntheticDataGenerator(DATABASE_URL)
    await generator.generate_all_data()

if __name__ == "__main__":
    asyncio.run(main())
import asyncio
import os
import sys
from datetime import datetime, timedelta
from faker import Faker
import random
import asyncpg
from passlib.context import CryptContext
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path to allow sibling imports
sys.path.append(str(Path(__file__).parent.parent))

import models
from database import engine

# Hashing utility - pbkdf2_sha256 is pure Python and reliable
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class SyntheticDataGenerator:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.fake = Faker()

    async def get_password_hash(self, password):
        return pwd_context.hash(password)

    async def generate_users(self, conn, num_users=5):
        print(f"Generating {num_users} users...")
        users_data = []
        for i in range(num_users):
            username = self.fake.user_name() + str(i)
            hashed_password = await self.get_password_hash("password123")
            users_data.append({
                'username': username, 'email': self.fake.email(),
                'password_hash': hashed_password, 'created_at': self.fake.date_time_this_year(),
                'timezone': 'UTC'
            })
        
        # THE FIX: Convert list of dictionaries to list of tuples in the correct order
        columns = list(users_data[0].keys())
        records_as_tuples = [tuple(d[col] for col in columns) for d in users_data]
        await conn.copy_records_to_table('users', records=records_as_tuples, columns=columns)
        
        user_ids = await conn.fetch("SELECT id FROM users ORDER BY id")
        return [user['id'] for user in user_ids]

    async def generate_subjects(self, conn, user_ids, subjects_per_user=5):
        print(f"Generating {subjects_per_user} subjects for each user...")
        subjects_data = []
        subject_names = ["Quantum Mechanics", "Data Structures", "Organic Chemistry", "World History"]
        for user_id in user_ids:
            for _ in range(subjects_per_user):
                subjects_data.append({
                    'name': random.choice(subject_names), 'user_id': user_id,
                    'created_at': self.fake.date_time_this_year(), 'color_tag': self.fake.hex_color()
                })

        # THE FIX: Convert list of dictionaries to list of tuples
        columns = list(subjects_data[0].keys())
        records_as_tuples = [tuple(d[col] for col in columns) for d in subjects_data]
        await conn.copy_records_to_table('subjects', records=records_as_tuples, columns=columns)
        
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
                    tasks_data.append({
                        'title': self.fake.sentence(nb_words=4), 'estimated_time': random.choice([30, 60, 90]),
                        'deadline': created_at + timedelta(days=random.randint(3, 30)), 'status': 'complete',
                        'subject_id': subject_id, 'user_id': user_id,
                        'created_at': created_at, 'task_type': random.choice(task_types)
                    })
        
        # THE FIX: Convert list of dictionaries to list of tuples
        columns = list(tasks_data[0].keys())
        records_as_tuples = [tuple(d[col] for col in columns) for d in tasks_data]
        await conn.copy_records_to_table('tasks', records=records_as_tuples, columns=columns)
        
        task_ids_map = await conn.fetch("SELECT id, subject_id, user_id, estimated_time FROM tasks")
        return [dict(task) for task in task_ids_map]

    async def generate_study_sessions(self, conn, tasks):
        print(f"Generating study sessions for {len(tasks)} tasks...")
        sessions_data = []
        for task in tasks:
            duration_variance = int(task['estimated_time'] * random.uniform(-0.3, 0.4))
            sessions_data.append({
                'task_id': task['id'], 'user_id': task['user_id'],
                'actual_duration': max(10, task['estimated_time'] + duration_variance),
                'user_difficulty_rating': random.randint(1, 5),
                'completed_at': self.fake.date_time_between(start_date='-6m', end_date='now')
            })
        
        # THE FIX: Convert list of dictionaries to list of tuples
        columns = list(sessions_data[0].keys())
        records_as_tuples = [tuple(d[col] for col in columns) for d in sessions_data]
        await conn.copy_records_to_table('study_sessions', records=records_as_tuples, columns=columns)

    async def generate_all_data(self, clear_data=True):
        conn = None
        try:
            conn = await asyncpg.connect(self.database_url)
            if clear_data:
                await conn.execute("DELETE FROM study_sessions; DELETE FROM tasks; DELETE FROM subjects; DELETE FROM users;")
            
            user_ids = await self.generate_users(conn)
            subject_ids_map = await self.generate_subjects(conn, user_ids)
            tasks = await self.generate_tasks(conn, subject_ids_map)
            await self.generate_study_sessions(conn, tasks)
            
            print("\n✅ Synthetic data generation complete!")
        except Exception as e:
            print(f"\n❌ An error occurred during data generation.")
            print(f"   Error Type: {type(e).__name__}")
            print(f"   Error Details: {e}")
            raise
        finally:
            if conn:
                await conn.close()

async def main():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found.")
        return
    
    generator = SyntheticDataGenerator(DATABASE_URL)
    await generator.generate_all_data(clear_data=True)

if __name__ == "__main__":
    asyncio.run(main())
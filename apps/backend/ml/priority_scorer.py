# ml/priority_scorer.py
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncpg
import json
import os

class PriorityScorer:
    def __init__(self, database_url: str):
        self.database_url = database_url
        
        # Configurable weights for priority scoring
        self.weights = {
            'urgency': 0.35,           # How close to deadline
            'difficulty': 0.25,        # Subject difficulty based on past ratings
            'forgetting_curve': 0.25,  # Time since last study of this subject
            'productivity': 0.15       # Current time productivity factor
        }
        
        # Productivity hours (when user is most productive)
        self.productivity_hours = {
            'high': [9, 10, 11, 14, 15, 16, 19, 20],  # Peak hours
            'medium': [8, 12, 13, 17, 18, 21],         # Good hours
            'low': [7, 22, 23, 0, 1, 2, 3, 4, 5, 6]   # Low productivity hours
        }
        
    async def get_user_subject_stats(self, user_id: int) -> Dict[int, Dict[str, float]]:
        """Get historical statistics for user's subjects"""
        conn = await asyncpg.connect(self.database_url)
        
        try:
            query = """
            SELECT 
                s.id as subject_id,
                s.name as subject_name,
                AVG(ss.user_difficulty_rating) as avg_difficulty,
                AVG(ss.actual_duration / NULLIF(t.estimated_time, 0)) as avg_time_ratio,
                COUNT(ss.id) as session_count,
                MAX(ss.completed_at) as last_studied,
                AVG(CASE WHEN ss.completed_at >= NOW() - INTERVAL '7 days' 
                     THEN ss.user_difficulty_rating END) as recent_difficulty
            FROM subjects s
            LEFT JOIN tasks t ON s.id = t.subject_id
            LEFT JOIN study_sessions ss ON t.id = ss.task_id
            WHERE s.user_id = $1
            GROUP BY s.id, s.name
            """
            
            rows = await conn.fetch(query, user_id)
            
            subject_stats = {}
            for row in rows:
                subject_stats[row['subject_id']] = {
                    'name': row['subject_name'],
                    'avg_difficulty': float(row['avg_difficulty'] or 3.0),
                    'avg_time_ratio': float(row['avg_time_ratio'] or 1.0),
                    'session_count': int(row['session_count'] or 0),
                    'last_studied': row['last_studied'],
                    'recent_difficulty': float(row['recent_difficulty'] or row['avg_difficulty'] or 3.0)
                }
            
            return subject_stats
            
        finally:
            await conn.close()
    
    async def get_pending_tasks(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all pending tasks for a user"""
        conn = await asyncpg.connect(self.database_url)
        
        try:
            query = """
            SELECT 
                t.id,
                t.name,
                t.description,
                t.estimated_time,
                t.due_date,
                t.created_at,
                s.id as subject_id,
                s.name as subject_name
            FROM tasks t
            JOIN subjects s ON t.subject_id = s.id
            WHERE s.user_id = $1 AND t.status = 'pending'
            ORDER BY t.due_date ASC
            """
            
            rows = await conn.fetch(query, user_id)
            
            tasks = []
            for row in rows:
                tasks.append({
                    'id': row['id'],
                    'name': row['name'],
                    'description': row['description'],
                    'estimated_time': row['estimated_time'],
                    'due_date': row['due_date'],
                    'created_at': row['created_at'],
                    'subject_id': row['subject_id'],
                    'subject_name': row['subject_name']
                })
            
            return tasks
            
        finally:
            await conn.close()
    
    def calculate_urgency_score(self, due_date: datetime, current_time: datetime = None) -> float:
        """Calculate urgency score based on time until due date"""
        if current_time is None:
            current_time = datetime.now()
        
        time_until_due = (due_date - current_time).total_seconds() / 3600  # Hours until due
        
        if time_until_due <= 0:
            return 1.0  # Overdue - maximum urgency
        elif time_until_due <= 24:
            return 0.9  # Due within 24 hours
        elif time_until_due <= 72:
            return 0.7  # Due within 3 days
        elif time_until_due <= 168:
            return 0.5  # Due within a week
        elif time_until_due <= 336:
            return 0.3  # Due within 2 weeks
        else:
            return 0.1  # More than 2 weeks away
    
    def calculate_difficulty_score(self, subject_stats: Dict[str, Any]) -> float:
        """Calculate difficulty score based on historical user ratings"""
        avg_difficulty = subject_stats.get('avg_difficulty', 3.0)
        recent_difficulty = subject_stats.get('recent_difficulty', avg_difficulty)
        
        # Weight recent difficulty more heavily
        weighted_difficulty = (recent_difficulty * 0.7) + (avg_difficulty * 0.3)
        
        # Normalize to 0-1 scale (difficulty 1-5 maps to 0.0-1.0)
        return (weighted_difficulty - 1) / 4
    
    def calculate_forgetting_curve_score(self, last_studied: Optional[datetime], 
                                       current_time: datetime = None) -> float:
        """Calculate forgetting curve score based on time since last study"""
        if current_time is None:
            current_time = datetime.now()
        
        if last_studied is None:
            return 1.0  # Never studied - highest priority
        
        days_since_study = (current_time - last_studied).total_seconds() / (24 * 3600)
        
        if days_since_study <= 1:
            return 0.1  # Recently studied
        elif days_since_study <= 3:
            return 0.3  # Study again soon
        elif days_since_study <= 7:
            return 0.6  # Spaced repetition interval
        elif days_since_study <= 14:
            return 0.8  # Important to review
        else:
            return 1.0  # Long time since study - high priority
    
    def calculate_productivity_score(self, current_time: datetime = None) -> float:
        """Calculate productivity score based on current time of day"""
        if current_time is None:
            current_time = datetime.now()
        
        hour = current_time.hour
        
        if hour in self.productivity_hours['high']:
            return 1.0  # Peak productivity time
        elif hour in self.productivity_hours['medium']:
            return 0.6  # Good productivity time
        else:
            return 0.3  # Low productivity time
    
    def calculate_task_priority(self, task: Dict[str, Any], 
                              subject_stats: Dict[str, Any],
                              current_time: datetime = None) -> Dict[str, Any]:
        """Calculate overall priority score for a task"""
        if current_time is None:
            current_time = datetime.now()
        
        # Calculate individual scores
        urgency_score = self.calculate_urgency_score(task['due_date'], current_time)
        difficulty_score = self.calculate_difficulty_score(subject_stats)
        forgetting_score = self.calculate_forgetting_curve_score(
            subject_stats.get('last_studied'), current_time
        )
        productivity_score = self.calculate_productivity_score(current_time)
        
        # Calculate weighted priority score
        priority_score = (
            urgency_score * self.weights['urgency'] +
            difficulty_score * self.weights['difficulty'] +
            forgetting_score * self.weights['forgetting_curve'] +
            productivity_score * self.weights['productivity']
        )
        
        return {
            'task_id': task['id'],
            'task_name': task['name'],
            'subject_name': task['subject_name'],
            'estimated_time': task['estimated_time'],
            'due_date': task['due_date'],
            'priority_score': round(priority_score, 3),
            'urgency_score': round(urgency_score, 3),
            'difficulty_score': round(difficulty_score, 3),
            'forgetting_score': round(forgetting_score, 3),
            'productivity_score': round(productivity_score, 3),
            'days_until_due': (task['due_date'] - current_time).days,
            'subject_avg_difficulty': subject_stats.get('avg_difficulty', 3.0),
            'days_since_last_study': (
                (current_time - subject_stats['last_studied']).days 
                if subject_stats.get('last_studied') else None
            )
        }
    
    async def generate_daily_schedule(self, user_id: int, 
                                    max_tasks: int = 10,
                                    current_time: datetime = None) -> List[Dict[str, Any]]:
        """Generate prioritized daily schedule for user"""
        if current_time is None:
            current_time = datetime.now()
        
        print(f"Generating schedule for user {user_id}")
        
        # Get user's subject statistics
        subject_stats = await self.get_user_subject_stats(user_id)
        print(f"Found stats for {len(subject_stats)} subjects")
        
        # Get pending tasks
        pending_tasks = await self.get_pending_tasks(user_id)
        print(f"Found {len(pending_tasks)} pending tasks")
        
        if not pending_tasks:
            return []
        
        # Calculate priority for each task
        prioritized_tasks = []
        for task in pending_tasks:
            task_subject_stats = subject_stats.get(task['subject_id'], {
                'avg_difficulty': 3.0,
                'recent_difficulty': 3.0,
                'last_studied': None
            })
            
            priority_info = self.calculate_task_priority(task, task_subject_stats, current_time)
            prioritized_tasks.append(priority_info)
        
        # Sort by priority score (descending)
        prioritized_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
        
        # Return top tasks
        return prioritized_tasks[:max_tasks]
    
    def optimize_schedule_by_time(self, prioritized_tasks: List[Dict[str, Any]], 
                                available_hours: float = 8.0) -> List[Dict[str, Any]]:
        """Optimize schedule to fit within available time"""
        optimized_schedule = []
        total_time = 0
        
        for task in prioritized_tasks:
            estimated_minutes = task['estimated_time']
            estimated_hours = estimated_minutes / 60
            
            if total_time + estimated_hours <= available_hours:
                optimized_schedule.append(task)
                total_time += estimated_hours
            else:
                break
        
        return optimized_schedule
    
    def get_schedule_insights(self, schedule: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate insights about the recommended schedule"""
        if not schedule:
            return {'total_tasks': 0, 'total_time': 0, 'insights': []}
        
        total_tasks = len(schedule)
        total_time = sum(task['estimated_time'] for task in schedule) / 60  # hours
        avg_priority = np.mean([task['priority_score'] for task in schedule])
        
        # Subject distribution
        subjects = {}
        for task in schedule:
            subject = task['subject_name']
            subjects[subject] = subjects.get(subject, 0) + 1
        
        # Urgency analysis
        urgent_tasks = len([t for t in schedule if t['urgency_score'] > 0.7])
        difficult_tasks = len([t for t in schedule if t['difficulty_score'] > 0.6])
        
        insights = []
        
        if urgent_tasks > 0:
            insights.append(f"{urgent_tasks} urgent task(s) with approaching deadlines")
        
        if difficult_tasks > 0:
            insights.append(f"{difficult_tasks} challenging task(s) scheduled for high productivity time")
        
        most_common_subject = max(subjects, key=subjects.get)
        insights.append(f"Focus area: {most_common_subject} ({subjects[most_common_subject]} tasks)")
        
        return {
            'total_tasks': total_tasks,
            'total_time_hours': round(total_time, 1),
            'avg_priority': round(avg_priority, 3),
            'subject_distribution': subjects,
            'urgent_tasks': urgent_tasks,
            'difficult_tasks': difficult_tasks,
            'insights': insights
        }
    
    def update_weights(self, new_weights: Dict[str, float]):
        """Update scoring weights"""
        total_weight = sum(new_weights.values())
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")
        
        self.weights.update(new_weights)
        print(f"Updated weights: {self.weights}")

# Example usage
async def test_priority_scorer():
    """Test the priority scoring system"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    scorer = PriorityScorer(DATABASE_URL)
    
    # Test with user ID 1
    user_id = 1
    schedule = await scorer.generate_daily_schedule(user_id, max_tasks=5)
    
    print(f"\nDaily Schedule for User {user_id}:")
    print("-" * 80)
    
    for i, task in enumerate(schedule, 1):
        print(f"{i}. {task['task_name']} ({task['subject_name']})")
        print(f"   Priority: {task['priority_score']:.3f} | "
              f"Due: {task['days_until_due']} days | "
              f"Est. Time: {task['estimated_time']} min")
        print(f"   Urgency: {task['urgency_score']:.2f} | "
              f"Difficulty: {task['difficulty_score']:.2f} | "
              f"Forgetting: {task['forgetting_score']:.2f}")
        print()
    
    # Get insights
    insights = scorer.get_schedule_insights(schedule)
    print("Schedule Insights:")
    print(f"- Total: {insights['total_tasks']} tasks, {insights['total_time_hours']} hours")
    for insight in insights['insights']:
        print(f"- {insight}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_priority_scorer())
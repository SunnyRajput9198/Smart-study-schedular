# priority_scorer.py
import asyncpg
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import numpy as np

class PriorityScorer:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None

    async def init(self):
        if self.pool is None:
            self.pool = await asyncpg.create_pool(self.database_url)
        
    async def get_pending_tasks(self, user_id: int):
        """Get pending tasks for user matching the actual database schema."""
        try:
            query = """
                SELECT 
                    t.id AS task_id,
                    t.title AS task_name,
                    s.name AS subject_name,
                    t.estimated_time,
                    t.deadline,
                    t.status,
                    t.task_type,
                    s.id AS subject_id,
                    s.color_tag
                FROM tasks t
                JOIN subjects s ON t.subject_id = s.id
                WHERE t.user_id = $1 
                AND t.status = 'pending'
                AND (t.deadline IS NULL OR t.deadline >= CURRENT_DATE)
                ORDER BY t.deadline ASC NULLS LAST
                LIMIT 50
            """
            
            await self.init()
            async with self.pool.acquire() as conn:

                rows = await conn.fetch(query, user_id)
                
                tasks = []
                for row in rows:
                    # Calculate days until due
                    if row['deadline']:
                        # Convert deadline to date if it's datetime
                        deadline_date = row['deadline'].date() if hasattr(row['deadline'], 'date') else row['deadline']
                        days_until_due = (deadline_date - datetime.now().date()).days
                    else:
                        days_until_due = 30  # Default if no deadline
                    
                    tasks.append({
                        'task_id': row['task_id'],
                        'task_name': row['task_name'],
                        'subject_name': row['subject_name'],
                        'subject_id': row['subject_id'],
                        'estimated_time': row['estimated_time'] or 60,  # Default to 60 minutes
                        'days_until_due': max(0, days_until_due),
                        'task_type': row['task_type'] or 'general',
                        'status': row['status']
                    })
                
                return tasks
                
        except Exception as e:
            print(f"Error in get_pending_tasks: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def get_user_stats(self, user_id: int):
        """Get user performance statistics by subject."""
        try:
            query = """
                SELECT 
                    s.id AS subject_id,
                    s.name AS subject_name,
                    COUNT(DISTINCT ss.task_id) AS completed_tasks,
                    AVG(ss.actual_duration) AS avg_actual_duration,
                    AVG(ss.user_difficulty_rating) AS avg_difficulty,
                    COUNT(DISTINCT DATE(ss.completed_at)) AS study_days
                FROM subjects s
                LEFT JOIN tasks t ON s.id = t.subject_id
                LEFT JOIN study_sessions ss ON t.id = ss.task_id
                WHERE s.user_id = $1
                GROUP BY s.id, s.name
            """
            
            await self.init()
            async with self.pool.acquire() as conn:

                rows = await conn.fetch(query, user_id)
                
                stats = {}
                for row in rows:
                    stats[row['subject_id']] = {
                        'subject_name': row['subject_name'],
                        'completed_tasks': row['completed_tasks'] or 0,
                        'avg_actual_duration': float(row['avg_actual_duration'] or 60),
                        'avg_difficulty': float(row['avg_difficulty'] or 3),
                        'study_days': row['study_days'] or 0
                    }
                
                return stats
                
        except Exception as e:
            print(f"Error in get_user_stats: {e}")
            return {}
    
    def calculate_priority_score(self, task: Dict, user_stats: Dict) -> float:
        """Calculate priority score for a task."""
        score = 0.0
        
        # 1. Urgency factor (40% weight)
        days_until_due = task.get('days_until_due', 30)
        if days_until_due <= 1:
            urgency_score = 1.0
        elif days_until_due <= 3:
            urgency_score = 0.9
        elif days_until_due <= 7:
            urgency_score = 0.7
        elif days_until_due <= 14:
            urgency_score = 0.5
        else:
            urgency_score = 0.3
        score += urgency_score * 0.4
        
        # 2. Task type importance (20% weight)
        task_type_weights = {
            'exam': 1.0,
            'assignment': 0.9,
            'project': 0.85,
            'practice': 0.6,
            'reading': 0.5,
            'review': 0.4,
            'general': 0.3
        }
        task_type = task.get('task_type', 'general')
        type_score = task_type_weights.get(task_type, 0.3)
        score += type_score * 0.2
        
        # 3. Subject performance factor (20% weight)
        subject_id = task.get('subject_id')
        if subject_id and subject_id in user_stats:
            stats = user_stats[subject_id]
            # If user struggles with this subject (high difficulty), prioritize it
            avg_difficulty = stats.get('avg_difficulty', 3)
            if avg_difficulty >= 4:
                performance_score = 0.9
            elif avg_difficulty >= 3:
                performance_score = 0.7
            else:
                performance_score = 0.5
            
            # Boost if subject hasn't been studied recently
            study_days = stats.get('study_days', 0)
            if study_days == 0:
                performance_score = 1.0
            elif study_days < 3:
                performance_score = min(1.0, performance_score + 0.2)
        else:
            performance_score = 0.7  # New subject, moderate priority
        score += performance_score * 0.2
        
        # 4. Estimated time factor (10% weight)
        estimated_time = task.get('estimated_time', 60)
        if estimated_time <= 30:
            time_score = 0.8  # Quick tasks are good for momentum
        elif estimated_time <= 60:
            time_score = 0.6
        elif estimated_time <= 120:
            time_score = 0.4
        else:
            time_score = 0.3  # Very long tasks might need to be broken down
        score += time_score * 0.1
        
        # 5. Random small factor to break ties (10% weight)
        score += np.random.uniform(0, 0.3) * 0.1
        
        return min(1.0, score)  # Cap at 1.0
    
    def generate_recommendation_reason(self, task: Dict, score: float) -> str:
        """Generate a human-readable reason for task recommendation."""
        reasons = []
        
        # Check urgency
        days_until_due = task.get('days_until_due', 30)
        if days_until_due <= 1:
            reasons.append("⚠️ Due tomorrow!")
        elif days_until_due <= 3:
            reasons.append("📅 Due in " + str(days_until_due) + " days")
        elif days_until_due <= 7:
            reasons.append("📆 Due this week")
        
        # Check task type
        task_type = task.get('task_type', 'general')
        if task_type == 'exam':
            reasons.append("📝 Exam preparation")
        elif task_type == 'assignment':
            reasons.append("📚 Assignment deadline")
        elif task_type == 'project':
            reasons.append("🎯 Project work")
        
        # Check estimated time
        estimated_time = task.get('estimated_time', 60)
        if estimated_time <= 30:
            reasons.append("⚡ Quick win (~" + str(estimated_time) + " min)")
        elif estimated_time >= 120:
            reasons.append("⏰ Needs dedicated time block")
        
        # Add score-based reason if no other reasons
        if not reasons:
            if score >= 0.8:
                reasons.append("🔥 High priority task")
            elif score >= 0.6:
                reasons.append("✨ Important for progress")
            else:
                reasons.append("📌 Good to complete soon")
        
        return " • ".join(reasons)
    
    async def generate_daily_schedule(self, user_id: int, max_tasks: int = 5):
        """Generate optimized daily schedule."""
        print(f"Generating schedule for user {user_id}")
        
        try:
            # Get pending tasks
            pending_tasks = await self.get_pending_tasks(user_id)
            
            if not pending_tasks:
                print("No pending tasks found")
                return []
            
            # Get user stats for personalization
            user_stats = await self.get_user_stats(user_id)
            print(f"Found stats for {len(user_stats)} subjects")
            
            # Calculate priority scores
            scored_tasks = []
            for task in pending_tasks:
                score = self.calculate_priority_score(task, user_stats)
                reason = self.generate_recommendation_reason(task, score)
                
                # Calculate predicted time (for now, use estimated time with small adjustment)
                estimated_time = task.get('estimated_time', 60)
                subject_id = task.get('subject_id')
                
                # Adjust based on user's historical performance
                if subject_id and subject_id in user_stats:
                    avg_actual = user_stats[subject_id].get('avg_actual_duration', estimated_time)
                    # Weighted average: 70% estimated, 30% historical
                    predicted_time = int(0.7 * estimated_time + 0.3 * avg_actual)
                else:
                    predicted_time = estimated_time
                
                scored_tasks.append({
                    'task_id': task['task_id'],
                    'task_name': task['task_name'],
                    'subject_name': task['subject_name'],
                    'estimated_time': estimated_time,
                    'predicted_time': predicted_time,
                    'priority_score': round(score, 3),
                    'recommendation_reason': reason
                })
            
            # Sort by priority score and select top tasks
            scored_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
            schedule = scored_tasks[:max_tasks]
            
            # Log generated schedule
            print(f"Generated schedule with {len(schedule)} tasks")
            for i, task in enumerate(schedule, 1):
                print(f"  {i}. {task['task_name']} - Score: {task['priority_score']:.3f}")
            
            return schedule
            
        except Exception as e:
            print(f"Error in generate_daily_schedule: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def get_study_insights(self, user_id: int) -> Dict:
        """Generate study insights for a user."""
        try:
            insights_query = """
                SELECT 
                    COUNT(DISTINCT ss.id) AS total_sessions,
                    SUM(ss.actual_duration) AS total_minutes,
                    AVG(ss.actual_duration) AS avg_session_duration,
                    AVG(ss.user_difficulty_rating) AS avg_difficulty,
                    EXTRACT(HOUR FROM ss.completed_at) AS study_hour,
                    EXTRACT(DOW FROM ss.completed_at) AS study_day,
                    COUNT(DISTINCT DATE(ss.completed_at)) AS total_study_days
                FROM study_sessions ss
                WHERE ss.user_id = $1
                AND ss.completed_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY EXTRACT(HOUR FROM ss.completed_at), EXTRACT(DOW FROM ss.completed_at)
                ORDER BY COUNT(*) DESC
            """
            
            await self.init()
            async with self.pool.acquire() as conn:
 
                rows = await conn.fetch(insights_query, user_id)
                
                if not rows:
                    return {
                        'total_study_time_hours': 0,
                        'best_productivity_hour': 14,  # Default to 2 PM
                        'most_productive_day': 'Monday',
                        'estimation_accuracy': 0.5,
                        'recommendations': ['Start tracking your study sessions to get personalized insights!']
                    }
                
                # Calculate insights
                total_minutes = sum(row['total_minutes'] or 0 for row in rows)
                best_hour = rows[0]['study_hour'] if rows else 14
                best_day = rows[0]['study_day'] if rows else 1
                
                day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                
                recommendations = []
                if total_minutes < 300:  # Less than 5 hours in 30 days
                    recommendations.append("Try to increase your study time gradually")
                if best_hour < 9 or best_hour > 21:
                    recommendations.append("Consider studying during peak focus hours (9 AM - 9 PM)")
                
                return {
                    'total_study_time_hours': round(total_minutes / 60, 1),
                    'best_productivity_hour': int(best_hour),
                    'most_productive_day': day_names[int(best_day)],
                    'estimation_accuracy': 0.75,  # Placeholder
                    'recommendations': recommendations if recommendations else ['Keep up the great work!']
                }
                
        except Exception as e:
            print(f"Error getting study insights: {e}")
            return {
                'total_study_time_hours': 0,
                'best_productivity_hour': 14,
                'most_productive_day': 'Monday',
                'estimation_accuracy': 0.5,
                'recommendations': ['Unable to generate insights at this time']
            }
            
    def get_schedule_insights(self, schedule_data):
        if not schedule_data:
            return ["No tasks available for scheduling"]

        total_time = sum(task.get('estimated_time', 0) for task in schedule_data)
        high_priority_count = sum(1 for task in schedule_data if task.get('priority_score', 0) > 0.7)

        return [
            f"Total estimated time: {total_time} minutes",
            f"High priority tasks: {high_priority_count}",
            f"Tasks scheduled: {len(schedule_data)}"
        ]
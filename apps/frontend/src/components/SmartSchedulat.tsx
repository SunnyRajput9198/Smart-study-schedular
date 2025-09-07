'use client';

import { useState } from 'react';
import apiClient from '../api/axios';

interface ScheduleTask {
  task_id: number;
  task_name: string;
  subject_name: string;
  priority_score: number;
  recommendation_reason: string;
}

export default function SmartSchedule() {
  const [schedule, setSchedule] = useState<ScheduleTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/ml/schedule/generate?max_tasks=7');
      setSchedule(response.data.schedule);
    } catch (err) {
      console.error("Failed to generate schedule:", err);
      setError("Could not generate a smart schedule. Ensure the backend is running and you are logged in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 mb-8 bg-gray-800 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h3 className="text-xl font-semibold text-center sm:text-left">Your AI-Powered Daily Focus</h3>
        <button
          onClick={fetchSchedule}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : '✨ Generate Today\'s Schedule'}
        </button>
      </div>

      {error && <p className="text-red-500 text-center">{error}</p>}

      <div className="space-y-3 mt-4">
        {schedule.length > 0 ? (
          schedule.map((task, index) => (
            <div key={task.task_id} className="p-4 bg-gray-700 rounded-lg border-l-4 border-indigo-500 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg font-bold text-indigo-300">#{index + 1} {task.task_name}</span>
                  <p className="text-sm text-gray-400">Subject: {task.subject_name}</p>
                </div>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-indigo-500 text-white">
                  Priority: {task.priority_score.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-300 italic">
                <strong>Reason:</strong> {task.recommendation_reason}
              </p>
            </div>
          ))
        ) : (
          !isLoading && <p className="text-gray-400 text-center">Click the button to generate your personalized study plan for today.</p>
        )}
      </div>
    </div>
  );
}
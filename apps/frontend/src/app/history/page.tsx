// apps/frontend/src/app/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import apiClient from '../../api/axios';
import { Task } from '../subjects/[subjectId]/page'; // Re-use the Task interface

// Define the shape of our session data
interface StudySession {
  id: number;
  task_id: number;
  actual_duration: number;
  user_difficulty_rating: number;
  completed_at: string;
  task: Task; // Include the full task object
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/sessions/');
        setSessions(response.data);
      } catch (error) {
        console.error("Failed to fetch study history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading history...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-8">
          <Link href="/" className="text-blue-400 hover:underline">&larr; Back to Dashboard</Link>
          <h1 className="text-4xl font-bold mt-2">Study Session History</h1>
        </header>

        <main>
          <div className="bg-gray-800 rounded-lg shadow-md p-6">
            {sessions.length > 0 ? (
              <table className="w-full text-left">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="p-4">Task</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Completed On</th>
                    <th className="p-4 text-center">Time Taken (mins)</th>
                    <th className="p-4 text-center">Difficulty (1-5)</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4 font-semibold">{session.task?.title}</td>
                     <td className="p-4 text-gray-400">{session.task?.subject?.name || 'N/A'}</td>
                      <td className="p-4 text-gray-400">{new Date(session.completed_at).toLocaleDateString()}</td>
                      <td className="p-4 text-center">{session.actual_duration}</td>
                      <td className="p-4 text-center">{session.user_difficulty_rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-400 py-8">You have no completed study sessions yet. Go complete a task!</p>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
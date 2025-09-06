// src/app/subjects/[subjectId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import apiClient from '../../api/axios';
import AddTaskForm from '../../components/Addtaskform';

// interface definitions for Subject and Task
interface Subject {
  id: number;
  name: string;
}
interface Task {
  id: number;
  title: string;
  status: string;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const subjectId = params.subjectId;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;

    const fetchSubjectDetails = async () => {
      setIsLoading(true);
      try {
        const subjectRes = await apiClient.get(`/subjects/${subjectId}`);
        setSubject(subjectRes.data);

        const tasksRes = await apiClient.get(`/tasks/${subjectId}`);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error("Failed to fetch subject details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectDetails();
  }, [subjectId]);

  const handleTaskAdded = (newTask: Task) => {
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-8">
          <Link href="/" className="text-blue-400 hover:underline">&larr; Back to Dashboard</Link>
          <h1 className="text-4xl font-bold mt-2">{subject?.name}</h1>
        </header>

        <main>
          {/* This is the fix. We only render the AddTaskForm component if subjectId has a value.
            This guarantees that we never pass 'undefined' as a prop, resolving the TypeScript error.
          */}
          {subjectId && (
            <AddTaskForm subjectId={subjectId} onTaskAdded={handleTaskAdded} />
          )}

          <h2 className="text-2xl mb-4">Tasks</h2>
          <div className="space-y-4">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="p-4 bg-gray-800 rounded-lg flex justify-between items-center">
                  <span className="text-lg">{task.title}</span>
                  <span className="px-3 py-1 text-sm rounded-full bg-blue-500 text-white">{task.status}</span>
                </div>
              ))
            ) : (
              <p>No tasks found for this subject yet.</p>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

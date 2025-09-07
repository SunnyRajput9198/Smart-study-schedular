'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import apiClient from '../../../api/axios';
import AddTaskForm from '../../../components/Addtaskform';

// Interfaces for our data shapes
export interface Task {
  id: number;
  title: string;
  status: string;
  estimated_time: number;
  deadline: string | null;
}

interface Subject {
  id: number;
  name: string;
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;

    const fetchSubjectDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Convert string to number and validate
        const subjectIdNum = parseInt(subjectId, 10);
        if (isNaN(subjectIdNum)) {
          throw new Error('Invalid subject ID');
        }

        console.log(`Fetching subject with ID: ${subjectIdNum}`);
        
        // Fetch subject details
  // Always use relative path with apiClient
const subjectRes = await apiClient.get(`/subjects/${subjectIdNum}`);

  
  setSubject(subjectRes.data);
  const tasksRes = await apiClient.get(`/tasks/${subjectIdNum}`);

        // Fetch tasks for this subject
  
        setTasks(tasksRes.data);
        
      } catch (error: any) {
        console.error("Failed to fetch subject details:", error);
        
        if (error.response?.status === 404) {
          setError("Subject not found. It may have been deleted or you don't have permission to access it.");
        } else if (error.response?.status === 401) {
          setError("You need to be logged in to view this subject.");
        } else {
          setError("Failed to load subject details. Please try again.");
        }
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
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <header className="mb-8">
            <Link href="/" className="text-blue-400 hover:underline">
              &larr; Back to Dashboard
            </Link>
          </header>
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
            <p className="text-gray-300 text-center mb-6">{error}</p>
            <Link 
              href="/" 
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Go Back to Dashboard
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!subject) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <header className="mb-8">
            <Link href="/" className="text-blue-400 hover:underline">
              &larr; Back to Dashboard
            </Link>
          </header>
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-xl">Subject not found.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-8">
          <Link href="/" className="text-blue-400 hover:underline">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold mt-2">{subject.name}</h1>
        </header>

        <main>
          {subjectId && (
            <AddTaskForm 
              subjectId={parseInt(subjectId, 10)} 
              onTaskAdded={handleTaskAdded} 
            />
          )}

          <h2 className="text-2xl mt-8 mb-4">Tasks</h2>
          <div className="space-y-4">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="p-4 bg-gray-800 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="text-lg font-bold">{task.title}</span>
                    <p className="text-sm text-gray-400">
                      Estimated: {task.estimated_time} mins
                    </p>
                    {task.deadline && (
                      <p className="text-sm text-gray-400">
                        Deadline: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span 
                    className={`px-3 py-1 text-sm rounded-full text-white ${
                      task.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))
            ) : (
              <p>No tasks found for this subject yet. Add one above to get started!</p>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
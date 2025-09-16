// apps/frontend/src/components/AddTaskForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import apiClient from '../api/axios';
import { Task } from '../app/subjects/[subjectId]/page'; // We will export the Task type from the page

interface Props {
  subjectId: string | string[];
  onTaskAdded: (newTask: Task) => void;
}

export default function AddTaskForm({ subjectId, onTaskAdded }: Props) {
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !estimatedTime) {
      setError('Title and estimated time are required.');
      return;
    }

    try {
      const taskData = {
    title,
    estimated_time: parseInt(estimatedTime, 10),
    deadline: deadline ? new Date(deadline).toISOString() : null
};

      const response = await apiClient.post(`/tasks/${subjectId}`, taskData);
      
      // This is the callback function. It tells the parent page (SubjectDetailPage)
      // to add the new task to its list instantly, without a page refresh.
      onTaskAdded(response.data);

      // Reset the form for the next entry
      setTitle('');
      setEstimatedTime('');
      setDeadline('');
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('Could not add the task. Please try again.');
    }
  };

  return (
    <div className="p-6 mb-8 bg-gray-300 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-black">Task Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 mt-1 bg-yellow-800 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="estimatedTime" className="block text-sm font-medium text-black">Estimated Time (minutes)</label>
            <input
              id="estimatedTime"
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full p-2 mt-1 bg-yellow-700 border border-gray-600 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-black">Deadline (Optional)</label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full p-2 mt-1 bg-yellow-700 border border-gray-600 rounded-md"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Add Task
        </button>
        {error && <p className="text-red-500 text-center mt-2">{error}</p>}
      </form>
    </div>
  );
}
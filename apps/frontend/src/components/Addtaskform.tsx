// src/components/AddTaskForm.tsx
'use client';

import { useState } from 'react';
import apiClient from '../api/axios';

interface Task {
  id: number;
  title: string;
  status: string;
}

interface AddTaskFormProps {
  subjectId: string | string[];
  onTaskAdded: (newTask: Task) => void;
}

export default function AddTaskForm({ subjectId, onTaskAdded }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !estimatedTime.trim()) {
      setError('Both fields are required.');
      return;
    }
    setError('');

    try {
      const response = await apiClient.post(`/tasks/${subjectId}`, { 
        title, 
        estimated_time: parseInt(estimatedTime, 10) 
      });
      onTaskAdded(response.data); // Pass the new task to the parent page
      setTitle(''); // Clear fields
      setEstimatedTime('');
    } catch (err) {
      setError('Failed to add task.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 my-8 bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Add a New Task</h3>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Title (e.g., Read Chapter 3)"
          className="flex-grow px-3 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          placeholder="Est. Time (minutes)"
          className="px-3 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Add Task
        </button>
      </div>
    </form>
  );
}
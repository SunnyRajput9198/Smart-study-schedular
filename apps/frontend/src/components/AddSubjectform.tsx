// src/components/AddSubjectForm.tsx
'use client';

import { useState } from 'react';
import apiClient from '../api/axios';

interface Subject {
  id: number;
  name: string;
  color_tag: string | null;
}

interface AddSubjectFormProps {
  onSubjectAdded: (newSubject: Subject) => void;
}

export default function AddSubjectForm({ onSubjectAdded }: AddSubjectFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name cannot be empty.');
      return;
    }
    setError('');

    try {
      const response = await apiClient.post('/subjects/', { name });
      onSubjectAdded(response.data); // Pass the new subject back to the parent
      setName(''); // Clear the input field
    } catch (err) {
      setError('Failed to add subject.');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 mb-8 text-shadow-amber-200 rounded-lg shadow-md bg-gray-200">
      <h3 className="text-xl font-semibold mb-4">Add a New Subject</h3>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      <div className="flex gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Quantum Physics"
          className="flex-grow px-3 py-2 text-white bg-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Add Subject
        </button>
      </div>
    </form>
  );
}
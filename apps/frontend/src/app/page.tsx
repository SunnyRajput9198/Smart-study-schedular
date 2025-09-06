// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import useAuthStore from '../stores/authStore';
import apiClient from '../api/axios';
import AddSubjectForm from '../components/AddSubjectform'; // Import the new component
import Link from 'next/link';

interface Subject {
  id: number;
  name: string;
  color_tag: string | null;
}

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await apiClient.get('/subjects/');
        setSubjects(response.data);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // This function updates the UI with the new subject
  const handleSubjectAdded = (newSubject: Subject) => {
    setSubjects((prevSubjects) => [...prevSubjects, newSubject]);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 font-semibold bg-red-600 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <main>
          {/* Render the form and pass the handler function as a prop */}
          <AddSubjectForm onSubjectAdded={handleSubjectAdded} />

          <h2 className="text-2xl mb-4">Your Subjects</h2>
          {isLoading ? (
            <p>Loading subjects...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjects.length > 0 ? (
                subjects.map((subject) => (
                  <Link href={`/subjects/${subject.id}`} key={subject.id}>
                    <div className="p-4 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
                      <h3 className="text-xl font-semibold">{subject.name}</h3>
                    </div>
                  </Link>
                ))
              ) : (
                <p>You haven't added any subjects yet.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
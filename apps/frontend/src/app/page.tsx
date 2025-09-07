'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import useAuthStore from '../stores/authStore';
import apiClient from '../api/axios';
import AddSubjectForm from '../components/AddSubjectform';
import SmartSchedule from '../components/SmartSchedulat';
import Link from 'next/link';

interface Subject {
  id: number;
  name: string;
  color_tag: string | null;
}

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // THE FIX: Select state primitives or functions individually.
  // This prevents the hook from returning a new object on every render,
  // which was causing the infinite loop.
  const logout = useAuthStore((state) => state.logout);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const router = useRouter();

  useEffect(() => {
    const fetchSubjects = async () => {
      // If the page loads and isLoggedIn is false, we simply wait.
      if (!isLoggedIn) {
        // We set loading to false if not logged in so we don't see a perpetual spinner.
        setIsLoading(false);
        return;
      }

      setIsLoading(true); // Set loading to true only when we are ready to fetch
      try {
        const response = await apiClient.get('/subjects/');
        setSubjects(response.data);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
        // If we get a 401 here, it might mean the token is expired, so we log out.
        if ((error as any).response?.status === 401) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  // The useEffect will now re-run whenever isLoggedIn changes.
  // The page loads -> isLoggedIn is false. Zustand loads token -> isLoggedIn becomes true -> This effect runs again, safely fetching the data.
  }, [isLoggedIn]); 
  
  const handleSubjectAdded = (newSubject: Subject) => {
    setSubjects((prevSubjects) => [...prevSubjects, newSubject]);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
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
          <SmartSchedule />
          <AddSubjectForm onSubjectAdded={handleSubjectAdded} />

          <h2 className="text-2xl mb-4">Your Subjects</h2>
          {isLoading && isLoggedIn ? ( // Only show loading text if we are actually fetching
            <p>Loading subjects...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.length > 0 ? (
                subjects.map((subject) => (
                  <Link href={`/subjects/${subject.id}`} key={subject.id}>
                    <div className="p-4 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200 cursor-pointer">
                      <h3 className="text-xl font-semibold">{subject.name}</h3>
                    </div>
                  </Link>
                ))
              ) : (
                // Show a helpful message if the user is logged in but has no subjects
                isLoggedIn && <p>You haven't added any subjects yet. Add one above to get started!</p>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

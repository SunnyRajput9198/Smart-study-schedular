"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "../components/ProtectedRoute"
import useAuthStore from "../stores/authStore"
import apiClient from "../api/axios"
import AddSubjectForm from "../components/AddSubjectform"
import SmartSchedule from "../components/SmartSchedulat"
import Link from "next/link"
import PomodoroTimer from "../components/PomodoroTimer"
import AIInsights from "../components/AIInsight"
import NotificationBell from '../components/Notificationcall';

interface Subject {
  id: number
  name: string
  color_tag: string | null
}
interface Task {
  id: number;
  title: string;
  deadline: string | null;
  subject_id: number; // Humein link banane ke liye iski zaroorat hai
}

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summaryData, setSummaryData] = useState<any | null>(null); // <-- YEH LINE ADD KAREIN

  const { logout, activesessions, setactivesessions } = useAuthStore();

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const [rescheduledTasks, setRescheduledTasks] = useState<Task[]>([]); // Hum Subject type reuse kar sakte hain
  const [showRescheduled, setShowRescheduled] = useState(false);
  const router = useRouter()
  // --- PURAANA useEffect ISSE REPLACE KAREIN ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isLoggedIn) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Hum subjects aur summary data ek saath fetch karenge
        const [subjectsRes, summaryRes] = await Promise.all([
          apiClient.get("/subjects/"),
          apiClient.get("/analytics/summary")
        ]);
        setSubjects(subjectsRes.data);
        setSummaryData(summaryRes.data); // Naya data save karein
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [isLoggedIn]);
  // --- END REPLACEMENT ---
  const handleSubjectAdded = (newSubject: Subject) => {
    setSubjects((prevSubjects) => [...prevSubjects, newSubject])
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }
  // --- YEH NAYA FUNCTION PASTE KAREIN ---
  const fetchRescheduledTasks = async () => {
    if (showRescheduled) {
      setShowRescheduled(false);
      return;
    }

    setShowRescheduled(true);
    try {
      const response = await apiClient.get("/tasks/rescheduled");
      console.log("Rescheduled tasks response:", response.data); // Debug log
      setRescheduledTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch rescheduled tasks:", error);
      // Show the actual error details
      if (error.response) {
        console.error("Error status:", error.response.status);
        console.error("Error data:", error.response.data);
      }
      setShowRescheduled(false); // Close the panel if there's an error
    }
  };
  // --- YAHAN TAK PASTE KAREIN ---
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">P</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  ProductivityHub
                </h1>
              </div>

              <nav className="flex items-center space-x-2">
                <NotificationBell /> {/* <-- ADD THIS LINE */}
                <Link
                  href="/tasks/board"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 rounded-lg hover:bg-muted"
                >
                  Task Board
                </Link>
                <Link
                  href="/analytics"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 rounded-lg hover:bg-muted"
                >
                  Analytics
                </Link>
                <Link
                  href="/history"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 rounded-lg hover:bg-muted"
                >
                  History
                </Link>
                <button
                  onClick={fetchRescheduledTasks}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 rounded-lg hover:bg-muted"
                >
                  Revisions
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors duration-200"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </header>
        {showRescheduled && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Scheduled Revisions</h3>
                <button
                  onClick={() => setShowRescheduled(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ✕ Close
                </button>
              </div>

              {rescheduledTasks.length > 0 ? (
                <div className="space-y-3">
                  {rescheduledTasks.map((task) => (
                    <Link href={`/subjects/${task.subject_id}`} key={task.id}>
                      <div className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{task.title}</p>
                          <p className="text-sm text-gray-400">
                            Due on: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <span className="text-xs font-medium bg-purple-600 text-white px-2 py-1 rounded-full">Review</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No revision tasks scheduled</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Welcome back to your
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {" "}
                productivity hub
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track your progress, manage your subjects, and boost your productivity with AI-powered insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Subjects</p>
                  <p className="text-3xl font-bold text-primary">{subjects.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-primary text-xl">📚</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                  <p className="text-3xl font-bold text-black">{activesessions}</p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <span className="text-accent text-xl">⏱️</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Productivity Score</p>
                  <p className="text-3xl font-bold text-chart-1">{summaryData?.performance?.productivity_score || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-chart-1/10 rounded-lg flex items-center justify-center">
                  <span className="text-chart-1 text-xl">📈</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="space-y-8">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <PomodoroTimer />
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <AIInsights />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <SmartSchedule />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Add New Subject</h3>
            <AddSubjectForm onSubjectAdded={handleSubjectAdded} />
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Subjects</h2>
              <span className="text-sm text-muted-foreground">{subjects.length} subjects</span>
            </div>

            {isLoading && isLoggedIn ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading subjects...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.length > 0
                  ? subjects.map((subject) => (
                    <Link href={`/subjects/${subject.id}`} key={subject.id}>
                      <div className="group p-6 bg-muted border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-200">
                            <span className="text-primary font-semibold text-lg">
                              {subject.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-black group-hover:text-primary transition-colors duration-200">
                              {subject.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">Click to view tasks</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Subject</span>
                          <div className="w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        </div>
                      </div>
                    </Link>
                  ))
                  : isLoggedIn && (
                    <div className="col-span-full text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📚</span>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
                      <p className="text-muted-foreground">
                        Add your first subject above to get started with your productivity journey!
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

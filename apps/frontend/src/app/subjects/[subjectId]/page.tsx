"use client"

import { useEffect, useState ,useCallback} from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import ProtectedRoute from "../../../components/ProtectedRoute"
import apiClient from "../../../api/axios"
import AddTaskForm from "../../../components/Addtaskform"
import CompletionModal from "../../../components/CompletionModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Clock, Brain, CheckCircle2, Circle, Sparkles, Target, TrendingUp } from "lucide-react"

// Interfaces for our data shapes
interface Subject {
  id: number
  name: string
}

export interface Task {
  id: number
  title: string
  status: string
  estimated_time: number
  deadline: string | null
  predicted_time?: number
  subject: Subject
}

interface SubjectSummary {
    completed_tasks: number;
    pending_tasks: number;
    completion_rate: number;
    avg_estimated_time: number;
    avg_predicted_time: number;
    total_tasks: number;
}

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false); // <-- YEH LINE ADD KAREIN
  const [summary, setSummary] = useState<SubjectSummary | null>(null); // <-- YEH LINE ADD KAREIN


  useEffect(() => {
    if (!subjectId) return

    const fetchSubjectDetails = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const subjectIdNum = Number.parseInt(subjectId, 10)
        if (isNaN(subjectIdNum)) {
          throw new Error("Invalid subject ID")
        }

        const subjectRes = await apiClient.get(`/subjects/${subjectIdNum}`)
        setSubject(subjectRes.data)

        const tasksRes = await apiClient.get(`/tasks/${subjectIdNum}`)
        const summaryRes = await apiClient.get(`/subjects/${subjectIdNum}/summary`)
        setTasks(tasksRes.data)
        setSummary(summaryRes.data);

        const initialTasks: Task[] = tasksRes.data

        if (initialTasks.length > 0) {
          setIsPredicting(true)
          const taskIds = initialTasks.map((task) => task.id)

          const predictionRes = await apiClient.post("/ml/predict-time", {
            task_ids: taskIds,
          })

          const predictions = predictionRes.data.predictions
          setTasks((currentTasks) =>
            
            currentTasks.map((task) => {
              const prediction = predictions.find((p: any) => p.task_id === task.id)
              return prediction ? { ...task, predicted_time: Math.round(prediction.predicted_time_minutes) } : task
            }),
          )
          setIsPredicting(false)
        }
      } catch (error: any) {
        console.error("Failed to fetch subject details:", error)
        if (error.response?.status === 404) {
          setError("Subject not found. It may have been deleted or you don't have permission to access it.")
        } else if (error.response?.status === 401) {
          setError("You need to be logged in to view this subject.")
        } else {
          setError("Failed to load subject details. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubjectDetails()
  }, [subjectId])

  // --- YEH NAYA FUNCTION useEffect SE PEHLE PASTE KAREIN ---
const fetchAllData = useCallback(async () => {
    if (!subjectId) return;

    // Sirf pehli baar page-level loading dikhayein
    if (!subject) setIsLoading(true);

    setError(null);
    try {
        const subjectIdNum = Number.parseInt(subjectId, 10);
        if (isNaN(subjectIdNum)) throw new Error("Invalid subject ID");

        // Saara data ek saath parallel mein fetch karein
        const [subjectRes, tasksRes, summaryRes] = await Promise.all([
            apiClient.get(`/subjects/${subjectIdNum}`),
            apiClient.get(`/tasks/${subjectIdNum}`),
            apiClient.get(`/subjects/${subjectIdNum}/summary`)
        ]);

        setSubject(subjectRes.data);
        setTasks(tasksRes.data);
        setSummary(summaryRes.data);

        const pendingTasks = (tasksRes.data as Task[]).filter(task => task.status === 'pending');
        if (pendingTasks.length > 0) {
            setIsPredicting(true);
            const taskIds = pendingTasks.map((task) => task.id);
            const predictionRes = await apiClient.post("/ml/predict-time", { task_ids: taskIds });

            const predictions = predictionRes.data.predictions;
            setTasks((currentTasks) =>
                currentTasks.map((task) => {
                    const prediction = predictions.find((p: any) => p.task_id === task.id);
                    return prediction ? { ...task, predicted_time: Math.round(prediction.predicted_time_minutes) } : task;
                })
            );
            setIsPredicting(false);
        }
    } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load subject details. Please try again.");
    } finally {
        setIsLoading(false);
    }
}, [subjectId, subject]); // Dependency array
// --- YAHAN TAK PASTE KAREIN ---
 const handleTaskAdded = (newTask: Task) => {
    // UI ko turant update karein, phir backend se fresh data lein
    setTasks((prevTasks) => [...prevTasks, newTask]);
    fetchAllData(); // Refresh all data
};

const handleSessionSaved = (completedTask: Task) => {
    setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === completedTask.id ? { ...task, status: "complete" } : task)),
    );
    setSelectedTask(null);
    fetchAllData(); // Refresh all data
};
    const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((task) => task.status !== "complete");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-6 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <Card className="max-w-md mx-auto mt-20">
              <CardHeader className="text-center">
                <CardTitle className="text-destructive">Something went wrong</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">{error}</p>
                <Button asChild>
                  <Link href="/">Return to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!subject) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-6 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <Card className="max-w-md mx-auto mt-20">
              <CardContent className="text-center py-8">
                <p className="text-xl text-muted-foreground">Subject not found</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-b border-border">
          <div className="container mx-auto px-6 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-black text-balance">{subject.name}</h1>
                <p className="text-muted-foreground mt-1">Manage your tasks and track progress</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-black">{summary?.completed_tasks || 0}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Circle className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-black">{summary?.pending_tasks || 0}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{Math.round(summary?.completion_rate || 0)}%</p>
                      <p className="text-sm text-muted-foreground">Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{summary?.avg_predicted_time || summary?.avg_predicted_time}</p>
                      <p className="text-sm text-muted-foreground">Avg. Time (min)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          <Card className="mb-8 border-dashed border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Add New Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectId && <AddTaskForm subjectId={Number.parseInt(subjectId, 10)} onTaskAdded={handleTaskAdded} />}
            </CardContent>
          </Card>

          {isPredicting && (
            <Card className="mb-6 bg-gradient-to-r from-chart-4/10 to-primary/10 border-chart-4/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-chart-4"></div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-chart-4" />
                    <span className="font-medium text-chart-4">AI is analyzing your tasks...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              {/* // --- PURAANI h2 LINE ISSE REPLACE KAREIN --- */}
              <div className="flex items-center justify-between gap-4">
                <h2 className=" text-2xl font-bold text-gray-900">Your Tasks</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? 'Hide Completed' : 'Show Completed'}
                </Button>
              </div>
              {/* // --- YAHAN TAK REPLACE KAREIN --- */}
              {summary?.total_tasks! > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Progress: {summary?.completed_tasks}/{summary?.total_tasks}
                  </div>
                  <Progress value={summary?.completion_rate || 0} className="w-24" />
                </div>
              )}
            </div>

            {filteredTasks.length > 0 ? (
              <div className="grid gap-4">
                {filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`transition-all duration-200 hover:shadow-md ${task.status === "complete" ? "bg-primary/5 border-primary/20" : "hover:border-primary/30"
                      }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {task.status === "complete" ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              // THE CHANGE: The Circle is now a button
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="group"
                                aria-label={`Complete task: ${task.title}`}
                              >
                                <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                              </button>
                            )}
                            <h3
                              className={`text-lg font-semibold ${task.status === "complete" ? "text-primary line-through" : "text-foreground"
                                }`}
                            >
                              {task.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                Your estimate: <strong>{task.estimated_time} min</strong>
                              </span>
                            </div>
                            {task.predicted_time && (
                              <div className="flex items-center gap-2 text-chart-4">
                                <Brain className="h-4 w-4" />
                                <span>
                                  AI predicts: <strong>{task.predicted_time} min</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>


                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 text-sm rounded-full text-white ${task.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                            {task.status}
                          </span>

                          {/* THE FIX: Yeh button ab sirf 'pending' tasks ke liye dikhega */}
                          {task.status === 'pending' && (
                            <button
                              onClick={() => setSelectedTask(task)}
                              className="px-3 py-1 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
                            >
                              ✓ Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
                       {!showCompleted && tasks.length > 0 && (
                    <p className="text-muted-foreground">You might have completed tasks. Click "Show Completed" to view them.</p>
                  )}
                      <p className="text-muted-foreground">
                        Add your first task above to get started on your learning journey!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {selectedTask && (
          <CompletionModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSessionSaved={handleSessionSaved}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ProtectedRoute from "../../../components/ProtectedRoute"
import CompletionModal from '../../../components/CompletionModel';
import apiClient from "../../../api/axios"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { ArrowLeft, Clock, GripVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Task {
  id: number
  title: string
  estimated_time: number
  status: "pending" | "in_progress" | "complete"
  description?: string
  subject_id?: number
  created_at?: string
  updated_at?: string
}

// Define the structure for our Kanban columns
interface Column {
  id: "pending" | "in_progress" | "complete"
  title: string
  tasks: Task[]
  color: string
  icon: string
}

type Columns = Record<string, Column>

const initialColumns: Columns = {
  pending: {
    id: "pending",
    title: "To Do",
    tasks: [],
    color: "bg-muted border-l-4 border-l-muted-foreground/20",
    icon: "📋",
  },
  in_progress: {
    id: "in_progress",
    title: "In Progress",
    tasks: [],
    color: "bg-primary/5 border-l-4 border-l-primary",
    icon: "⚡",
  },
  complete: {
    id: "complete",
    title: "Done",
    tasks: [],
    color: "bg-accent/5 border-l-4 border-l-accent",
    icon: "✅",
  },
}

export default function KanbanBoardPage() {
  const [columns, setColumns] = useState<Columns>(initialColumns)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.get("/tasks/")
        const tasks: Task[] = response.data

        // Distribute the fetched tasks into the correct columns
        const newColumns = { ...initialColumns }
        newColumns.pending.tasks = tasks.filter((t) => t.status === "pending")
        newColumns.in_progress.tasks = tasks.filter((t) => t.status === "in_progress")
        newColumns.complete.tasks = tasks.filter((t) => t.status === "complete")
        setColumns(newColumns)
      } catch (error) {
        console.error("Failed to fetch tasks:", error)
        const mockTasks: Task[] = [
          { id: 1, title: "Study React Hooks", estimated_time: 45, status: "pending" },
          { id: 2, title: "Complete Math Assignment", estimated_time: 60, status: "in_progress" },
          { id: 3, title: "Read Chapter 5", estimated_time: 30, status: "complete" },
        ]
        const newColumns = { ...initialColumns }
        newColumns.pending.tasks = mockTasks.filter((t) => t.status === "pending")
        newColumns.in_progress.tasks = mockTasks.filter((t) => t.status === "in_progress")
        newColumns.complete.tasks = mockTasks.filter((t) => t.status === "complete")
        setColumns(newColumns)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return // Dropped outside a column
    if (source.droppableId === destination.droppableId) return // Dropped in the same column

    // Optimistic UI Update: Move the task in the frontend state immediately
    const sourceColumn = columns[source.droppableId]
    const destColumn = columns[destination.droppableId]
    const sourceTasks = [...sourceColumn.tasks]
    const destTasks = [...destColumn.tasks]
    const [movedTask] = sourceTasks.splice(source.index, 1)
    destTasks.splice(destination.index, 0, movedTask)

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceColumn, tasks: sourceTasks },
      [destination.droppableId]: { ...destColumn, tasks: destTasks },
    })

    // API Call: Update the task status on the backend
    const newStatus = destination.droppableId as "pending" | "in_progress" | "complete";

    // Yadi task "Done" column mein drop hua hai, toh modal dikhayein
    if (newStatus === 'complete') {
      // Optimistic UI update ko REVERT karein, kyunki modal confirm karega
      setColumns(columns); // Wapas purane state par le aayein
      setTaskToComplete(movedTask); // Modal kholne ke liye task set karein
    } else {
      // Agar "To Do" ya "In Progress" mein drop hua hai, toh purana API call karein
      try {
        await apiClient.patch(`/tasks/${draggableId}/status`, { status: newStatus });
      } catch (error) {
        console.error("Failed to update task status:", error);
        // Agar API fail ho, toh UI ko revert karein
        setColumns(columns);
      }
    }
    // --- YAHAN TAK PASTE KAREIN ---
  }

  // --- YEH NAYA FUNCTION ADD KAREIN ---
  const handleSessionSaved = (completedTask: Task) => {
    // UI ko update karein: task ko "Done" column mein move karein
    setColumns(prevColumns => {
      const newColumns = { ...prevColumns };
      // Task ko purane column se hatayein
      for (const key in newColumns) {
        newColumns[key].tasks = newColumns[key].tasks.filter(t => t.id !== completedTask.id);
      }
      // Task ko "complete" column mein daalein
      newColumns.complete.tasks.push({ ...completedTask, status: 'complete' });
      return newColumns;
    });
    // Modal ko band karein
    setTaskToComplete(null);
  };
  // --- END FUNCTION ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground font-medium">Loading your study board...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      {taskToComplete && (
        <CompletionModal
          task={taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onSessionSaved={handleSessionSaved}
        />
      )}
      <div className="min-h-screen bg-background">
        {/* Header Section */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link href="/" className="flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground font-serif">Study Task Board</h1>
                  <p className="text-sm text-muted-foreground">Organize and track your learning progress</p>
                </div>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </header>

        {/* Main Board Content */}
        <main className="container mx-auto px-6 py-8">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.values(columns).map((column) => (
                <Droppable key={column.id} droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`${column.color} transition-all duration-200 ${snapshot.isDraggingOver ? "ring-2 ring-primary/20 shadow-lg" : "shadow-sm"
                        }`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-lg font-serif">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{column.icon}</span>
                            <span>{column.title}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {column.tasks.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 min-h-[400px]">
                        {column.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group cursor-grab active:cursor-grabbing transition-all duration-200 ${snapshot.isDragging
                                  ? "shadow-xl ring-2 ring-primary/30 rotate-2"
                                  : "hover:shadow-md hover:-translate-y-1"
                                  }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                      <h3 className="font-semibold text-card-foreground text-balance leading-tight">
                                        {task.title}
                                      </h3>
                                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{task.estimated_time} mins</span>
                                      </div>
                                    </div>
                                    <div
                                      {...provided.dragHandleProps}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {column.tasks.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="text-4xl mb-2 opacity-50">{column.icon}</div>
                            <p className="text-sm">No tasks yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </main>
      </div>
    </ProtectedRoute>
  )
}

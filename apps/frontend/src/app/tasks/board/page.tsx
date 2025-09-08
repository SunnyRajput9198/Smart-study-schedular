// apps/frontend/src/app/tasks/board/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';
import apiClient from '../../../api/axios';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task } from '../../subjects/[subjectId]/page';

// Define the structure for our Kanban columns
interface Column {
  id: 'pending' | 'in_progress' | 'complete';
  title: string;
  tasks: Task[];
}

type Columns = Record<string, Column>;

const initialColumns: Columns = {
  pending: { id: 'pending', title: 'To Do', tasks: [] },
  in_progress: { id: 'in_progress', title: 'In Progress', tasks: [] },
  complete: { id: 'complete', title: 'Done', tasks: [] },
};

export default function KanbanBoardPage() {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/tasks/');
        const tasks: Task[] = response.data;
        
        // Distribute the fetched tasks into the correct columns
        const newColumns = { ...initialColumns };
        newColumns.pending.tasks = tasks.filter(t => t.status === 'pending');
        newColumns.in_progress.tasks = tasks.filter(t => t.status === 'in_progress');
        newColumns.complete.tasks = tasks.filter(t => t.status === 'complete');
        setColumns(newColumns);

      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return; // Dropped outside a column
    if (source.droppableId === destination.droppableId) return; // Dropped in the same column

    // Optimistic UI Update: Move the task in the frontend state immediately
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const sourceTasks = [...sourceColumn.tasks];
    const destTasks = [...destColumn.tasks];
    const [movedTask] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTask);

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceColumn, tasks: sourceTasks },
      [destination.droppableId]: { ...destColumn, tasks: destTasks },
    });
    
    // API Call: Update the task status on the backend
    try {
      const newStatus = destination.droppableId;
      await apiClient.patch(`/tasks/${draggableId}/status`, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task status:", error);
      // If the API call fails, revert the UI change to maintain consistency
      setColumns(columns); 
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading Kanban Board...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-8">
          <Link href="/" className="text-blue-400 hover:underline">&larr; Back to Dashboard</Link>
          <h1 className="text-4xl font-bold mt-2">Task Board</h1>
        </header>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(columns).map(column => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 rounded-lg bg-gray-800 transition-colors ${snapshot.isDraggingOver ? 'bg-gray-700' : ''}`}
                  >
                    <h2 className="text-xl font-bold mb-4">{column.title}</h2>
                    <div className="space-y-3 min-h-[200px]">
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-4 bg-gray-700 rounded-md shadow-md"
                            >
                              <p className="font-semibold">{task.title}</p>
                              <p className="text-sm text-gray-400">Est: {task.estimated_time} mins</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </ProtectedRoute>
  );
}
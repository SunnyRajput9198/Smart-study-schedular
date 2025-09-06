// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthUser extends User {
  token: string;
}

// Subject Types
export interface Subject {
  id: number;
  userId: number;
  name: string;
  colorTag: string;
  createdAt: string;
}

export interface CreateSubjectDto {
  name: string;
  colorTag?: string;
}

// Task Types
export interface Task {
  id: number;
  userId: number;
  subjectId: number;
  title: string;
  description?: string;
  estimatedTime: number;
  deadline: string;
  status: TaskStatus;
  priorityScore: number;
  createdAt: string;
  completedAt?: string;
  subject?: Subject;
}

export type TaskStatus = 'pending' | 'complete' | 'overdue';

export interface CreateTaskDto {
  subjectId: number;
  title: string;
  description?: string;
  estimatedTime: number;
  deadline: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  estimatedTime?: number;
  deadline?: string;
  status?: TaskStatus;
}

// Study Session Types
export interface StudySession {
  id: number;
  userId: number;
  taskId: number;
  startTime: string;
  endTime: string;
  actualDuration: number;
  userDifficultyRating: number;
  createdAt: string;
  task?: Task;
}

export interface CompleteTaskDto {
  actualDuration: number;
  userDifficultyRating: number;
}

// Schedule Types
export interface ScheduledTask {
  taskId: number;
  title: string;
  subjectName: string;
  estimatedTime: number;
  predictedTime: number;
  deadline: string;
  priorityScore: number;
  recommendedTimeSlot: string;
}

// Analytics Types
export interface ProductivityAnalytics {
  peakHours: number[];
  averageSessionLength: number;
  difficultyTrends: Record<number, number>;
  completionRate: number;
  timeAccuracy: number;
}
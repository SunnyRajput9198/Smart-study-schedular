import { format, parseISO, isAfter, isBefore } from 'date-fns';

// Date utilities
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
};

export const isOverdue = (deadline: string): boolean => {
  return isAfter(new Date(), parseISO(deadline));
};

export const isDueSoon = (deadline: string, hoursThreshold: number = 24): boolean => {
  const now = new Date();
  const deadlineDate = parseISO(deadline);
  const thresholdDate = new Date(now.getTime() + (hoursThreshold * 60 * 60 * 1000));
  
  return isBefore(deadlineDate, thresholdDate) && isAfter(deadlineDate, now);
};

// Time utilities
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

// Priority scoring utilities
export const getPriorityColor = (score: number): string => {
  if (score >= 8) return 'text-red-600';
  if (score >= 6) return 'text-orange-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-green-600';
};

export const getPriorityLabel = (score: number): string => {
  if (score >= 8) return 'High';
  if (score >= 6) return 'Medium';
  if (score >= 4) return 'Low';
  return 'Very Low';
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// API utilities
export const createApiUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
};

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};
// apps/frontend/src/app/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import apiClient from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, LineChart, Line } from 'recharts';

// Define the shape of our analytics data
interface SubjectAnalytics {
  subject_name: string;
  total_minutes_studied: number;
}
interface DailyAnalytics {
  tasks_planned: number;
  tasks_completed: number;
}
interface WeeklyStreak {
  streak_days: number;
  daily_summary: Record<string, number>;
}

export default function AnalyticsPage() {
  const [subjectData, setSubjectData] = useState<SubjectAnalytics[]>([]);
  const [dailyData, setDailyData] = useState<DailyAnalytics | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch all 3 analytics endpoints in parallel for speed
        const [subjectRes, dailyRes, weeklyRes] = await Promise.all([
          apiClient.get('/analytics/subjects'),
          apiClient.get('/analytics/daily'),
          apiClient.get('/analytics/weekly')
        ]);
        setSubjectData(subjectRes.data);
        setDailyData(dailyRes.data);
        setWeeklyData(weeklyRes.data);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);
  
  // Format weekly data for the line chart
  const weeklyChartData = weeklyData ? Object.entries(weeklyData.daily_summary).map(([day, minutes]) => ({
    day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
    minutes: minutes
  })).reverse() : [];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading analytics...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-8">
          <Link href="/" className="text-blue-400 hover:underline">&larr; Back to Dashboard</Link>
          <h1 className="text-4xl font-bold mt-2">Your Study Analytics</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Daily Goal Progress */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Today's Goal</h2>
            {dailyData && (
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart 
                  innerRadius="70%" 
                  outerRadius="100%" 
                  data={[{ value: dailyData.tasks_completed, fill: '#8884d8' }]}
                  startAngle={90} 
                  endAngle={-270}
                >
                  <RadialBar 
                    minAngle={15} 
                    background 
                    clockWise={true} 
                    dataKey="value" 
                    cornerRadius={10} 
                  />
                   <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white text-3xl font-bold"
                    >
                      {`${dailyData.tasks_completed} / ${dailyData.tasks_planned}`}
                    </text>
                </RadialBarChart>
              </ResponsiveContainer>
            )}
             <p className="text-center text-gray-400">Tasks Completed Today</p>
          </div>
          
          {/* Chart 2: Weekly Study Streak */}
          <div className="bg-gray-800 p-6 rounded-lg">
             <h2 className="text-2xl font-semibold mb-4">Weekly Summary</h2>
             <p className="text-5xl font-bold text-indigo-400 mb-4">{weeklyData?.streak_days || 0} Day Streak 🔥</p>
             <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyChartData}>
                    <XAxis dataKey="day" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                    <Line type="monotone" dataKey="minutes" stroke="#8884d8" strokeWidth={3} />
                </LineChart>
             </ResponsiveContainer>
             <p className="text-center text-gray-400">Minutes Studied This Week</p>
          </div>

          {/* Chart 3: Study Time by Subject */}
          <div className="bg-gray-800 p-6 rounded-lg lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Time per Subject</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={subjectData} layout="vertical">
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="subject_name" stroke="#9ca3af" width={100} />
                <Tooltip cursor={{fill: 'rgba(100,100,100,0.1)'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend />
                <Bar dataKey="total_minutes_studied" name="Minutes Studied" fill="#8884d8" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  );
}
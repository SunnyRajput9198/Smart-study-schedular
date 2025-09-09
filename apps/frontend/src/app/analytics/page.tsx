"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ProtectedRoute from "../../components/ProtectedRoute"
import apiClient from "../../api/axios"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Clock, Target, BookOpen, Calendar, Award, Zap } from "lucide-react"

// --- YEH PURA BLOCK PASTE KAREIN ---
interface SubjectAnalytics {
  subject_name: string;
  total_minutes_studied: number;
  sessions_count: number;
  avg_session_duration: number;
}

interface DailyAnalytics {
  tasks_planned: number;
  tasks_completed: number;
  completion_rate: number;
  focus_time: number;
}

interface WeeklyStreak {
  streak_days: number;
  daily_summary: Record<string, number>;
  weekly_goal: number;
  total_weekly_minutes: number;
}

interface PerformanceMetrics {
  productivity_score: number;
  focus_sessions: number;
  average_session_quality: number;
  improvement_trend: number;
}

interface AnalyticsSummary {
  subjects: SubjectAnalytics[];
  daily: DailyAnalytics;
  weekly: WeeklyStreak;
  performance: PerformanceMetrics;
}
// --- YAHAN TAK PASTE KAREIN ---



export default function AnalyticsPage() {
  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true)

// --- PURAANA useEffect ISSE REPLACE KAREIN ---
useEffect(() => {
  const fetchAnalyticsSummary = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/analytics/summary");
      setSummaryData(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics summary:", error);
      // Agar error aaye to mock data use karein
      setSummaryData(null
      );
    } finally {
      setIsLoading(false);
    }
  };

  fetchAnalyticsSummary();
}, []);
// --- END REPLACEMENT ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your analytics...</p>
        </div>
      </div>
    )
  }
  // Yeh check karega ki data hai ya nahi
if (!summaryData) {
    return (
         <div className="flex items-center justify-center min-h-screen">
            <p>No analytics data found yet. Complete some tasks!</p>
         </div>
    )
}
const { subjects, daily, weekly, performance } = summaryData; // <-- YEH LINE ADD KAREIN
// Chart ke liye data taiyaar karein
const weeklyChartData = Object.entries(weekly.daily_summary)
  .map(([day, minutes]) => ({
    day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
    minutes: minutes,
  }))
  .reverse();

const subjectPieData = subjects.map((subject, index) => ({
  name: subject.subject_name,
  value: subject.total_minutes_studied,
  color: `hsl(var(--chart-${(index % 5) + 1}))`,
}));

const performanceChartData = [
  { metric: "Productivity", score: performance.productivity_score, target: 90 },
  { metric: "Focus Quality", score: performance.average_session_quality * 20, target: 85 },
  { metric: "Consistency", score: (weekly.streak_days / 7) * 100, target: 80 },
  { metric: "Goal Achievement", score: daily.completion_rate, target: 85 },
];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Link
                  href="/"
                  className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  ← Back to Dashboard
                </Link>
                <h1 className="text-4xl font-bold tracking-tight">Study Analytics</h1>
                <p className="text-primary-foreground/80 text-lg">Comprehensive insights into your learning journey</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{weekly.streak_days || 0}</div>
                <div className="text-sm text-primary-foreground/80">Day Streak 🔥</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="animate-fade-in-up border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Progress</CardTitle>
                <Target className="h-4 w-4 text-chart-1" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {daily.tasks_completed || 0}/{daily.tasks_planned || 0}
                </div>
                <Progress value={daily.completion_rate || 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">{daily.completion_rate || 0}% completion rate</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up border-0 shadow-lg" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Focus Time</CardTitle>
                <Clock className="h-4 w-4 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{daily.focus_time || 0}m</div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +12% from yesterday
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up border-0 shadow-lg" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Productivity Score</CardTitle>
                <Zap className="h-4 w-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{performance.productivity_score || 0}/100</div>
                <Badge variant="secondary" className="mt-2">
                  Excellent
                </Badge>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up border-0 shadow-lg" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Goal</CardTitle>
                <Award className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(((weekly.total_weekly_minutes || 0) / (weekly.weekly_goal || 1)) * 100)}%
                </div>
                <Progress
                  value={((weekly.total_weekly_minutes || 0) / (weekly?.weekly_goal || 1)) * 100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {weekly.total_weekly_minutes || 0}/{weekly.weekly_goal || 0} minutes
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Goal Progress - Enhanced Radial Chart */}
            <Card className="animate-fade-in-up border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-chart-1" />
                  Today's Goal Progress
                </CardTitle>
                <CardDescription>Task completion and focus metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {daily && (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadialBarChart
                      innerRadius="60%"
                      outerRadius="90%"
                      data={[
                        { name: "Completed", value: daily.tasks_completed, fill: "hsl(var(--chart-1))" },
                        { name: "Planned", value: daily.tasks_planned, fill: "hsl(var(--muted))" },
                      ]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        minAngle={15}
                        background={{ fill: "hsl(var(--muted))" }}
                        clockWise={true}
                        dataKey="value"
                        cornerRadius={10}
                      />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-3xl font-bold"
                      >
                        {`${daily.tasks_completed}/${daily.tasks_planned}`}
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                )}
                <div className="text-center text-muted-foreground">
                  Tasks completed today • {daily.completion_rate || 0}% success rate
                </div>
              </CardContent>
            </Card>

            {/* Subject Distribution - Pie Chart */}
            <Card className="animate-fade-in-up border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-chart-2" />
                  Study Time Distribution
                </CardTitle>
                <CardDescription>Time spent across different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subjects}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {subjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.subject_name} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} minutes`, "Study Time"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Trend - Area Chart */}
            <Card className="animate-fade-in-up border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-chart-3" />
                  Weekly Study Pattern
                </CardTitle>
                <CardDescription>Daily study minutes over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyChartData}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="hsl(var(--chart-3))"
                      fillOpacity={1}
                      fill="url(#colorMinutes)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-sm text-muted-foreground mt-4">
                  <span>Total: {weekly.total_weekly_minutes || 0} minutes</span>
                  <span>Average: {Math.round((weekly.total_weekly_minutes || 0) / 7)} min/day</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics - Composed Chart */}
            <Card className="animate-fade-in-up border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-4" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Key performance indicators vs targets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={performanceChartData} layout="horizontal">
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="metric" stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="target" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} opacity={0.3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="animate-fade-in-up border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-chart-5" />
                Detailed Subject Analysis
              </CardTitle>
              <CardDescription>Comprehensive breakdown of study sessions and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={subjects} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="subject_name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.1)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="total_minutes_studied"
                    name="Minutes Studied"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="sessions_count" name="Sessions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

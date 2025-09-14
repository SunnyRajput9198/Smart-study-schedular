"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from "recharts"
import { Clock, BookOpen, TrendingUp, Calendar, Award, Target, ArrowLeft, Download, Filter } from "lucide-react"
import ProtectedRoute from "../../components/ProtectedRoute"
import apiClient from "../../api/axios"
import type { Task } from "../subjects/[subjectId]/page"

// --- DELETE the old StudySession interface ---

// --- PASTE THIS ENTIRE BLOCK at the top of the file ---
interface HistoryStats {
    total_sessions: number;
    total_hours: number;
    avg_difficulty: number;
    avg_duration: number;
}
interface TimelinePoint {
    date: string;
    duration: number;
}
interface SubjectDistribution {
    subject: string;
    duration: number;
}
interface DifficultyDistribution {
    difficulty: string;
    count: number;
    fill: string; // Add fill color for the chart
}
interface StudySession {
    id: number;
    actual_duration: number;
    user_difficulty_rating: number;
    completed_at: string;
    task: Task;
}
interface HistorySummary {
    stats: HistoryStats;
    timeline_data: TimelinePoint[];
    subject_chart_data: SubjectDistribution[];
    difficulty_chart_data: DifficultyDistribution[];
    recent_sessions: StudySession[];
}
// --- END OF PASTE ---

export default function HistoryPage() {
 const [summaryData, setSummaryData] = useState<HistorySummary | null>(null);
const [isLoading, setIsLoading] = useState(true);
// --- REPLACE the old useEffect with this one ---
useEffect(() => {
    const fetchHistorySummary = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get("/history/summary");
            // Add colors to the difficulty data for the pie chart
            const pieColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];
            response.data.difficulty_chart_data.forEach((item: DifficultyDistribution, index: number) => {
                item.fill = pieColors[index % pieColors.length];
            });
            setSummaryData(response.data);
        } catch (error) {
            console.error("Failed to fetch study history summary:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchHistorySummary();
}, []);
// --- END OF REPLACEMENT ---
// This checks if data is loaded, if not, shows an empty state
if (!summaryData || summaryData.stats.total_sessions === 0) {
    return (
         <div className="flex items-center justify-center min-h-screen text-white">
            <p>No study history found yet. Complete some tasks!</p>
         </div>
    )
}

const { stats, timeline_data, subject_chart_data, difficulty_chart_data, recent_sessions } = summaryData; // <-- ADD THIS LINE


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse-subtle">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
                <div className="text-muted-foreground">/</div>
                <h1 className="text-2xl font-bold text-foreground">Study History</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="animate-fade-in-up">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
                <BookOpen className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.total_sessions}</div>
                <p className="text-xs text-muted-foreground mt-1">Completed tasks</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Study Hours</CardTitle>
                <Clock className="w-4 h-4 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.total_hours}h</div>
                <p className="text-xs text-muted-foreground mt-1">Total time invested</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Difficulty</CardTitle>
                <Target className="w-4 h-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.avg_difficulty}/5</div>
                <p className="text-xs text-muted-foreground mt-1">Challenge level</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
                <TrendingUp className="w-4 h-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.avg_duration}m</div>
                <p className="text-xs text-muted-foreground mt-1">Per session</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Study Timeline
                </CardTitle>
                <CardDescription>Your recent study sessions and difficulty levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    duration: { label: "Duration (min)", color: "hsl(var(--chart-1))" },
                    difficulty: { label: "Difficulty", color: "hsl(var(--chart-2))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="duration"
                        stroke="var(--color-duration)"
                        fill="var(--color-duration)"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="animate-slide-in-right" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Subject Distribution
                </CardTitle>
                <CardDescription>Time spent across different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    duration: { label: "Duration (min)", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subject_chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="duration" fill="var(--color-duration)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Difficulty Levels
                </CardTitle>
                <CardDescription>Distribution of task difficulty ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: { label: "Sessions", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={difficulty_chart_data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="name">
                        {difficulty_chart_data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recent Sessions
                </CardTitle>
                <CardDescription>Your latest completed study sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recent_sessions.slice(0, 5).map((session, index) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{session.task?.title}</h4>
                        <p className="text-sm text-muted-foreground">{session.task?.subject?.name}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{session.actual_duration}m</span>
                        </div>
                        <Badge
                          variant={
                            session.user_difficulty_rating >= 4
                              ? "destructive"
                              : session.user_difficulty_rating >= 3
                                ? "secondary"
                                : "default"
                          }
                        >
                          Level {session.user_difficulty_rating}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(session.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {recent_sessions.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Study Sessions Yet</h3>
                <p className="text-muted-foreground mb-4">Start completing tasks to see your study analytics here!</p>
                <Button asChild>
                  <Link href="/tasks">Start Studying</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

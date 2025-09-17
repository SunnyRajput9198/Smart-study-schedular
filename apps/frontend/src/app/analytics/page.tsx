"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
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
  Line,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  Calendar,
  Award,
  Zap,
  Brain,
  Trophy,
  Flame,
  BarChart3,
  PieChartIcon,
  Activity,
  Star,
  ArrowLeft,
} from "lucide-react"
import  apiClient  from "../../api/axios"

interface SubjectAnalytics {
  subject_name: string
  total_minutes_studied: number
  sessions_count: number
  avg_session_duration: number
}

interface DailyAnalytics {
  tasks_planned: number
  tasks_completed: number
  completion_rate: number
  focus_time: number
}

interface WeeklyStreak {
  streak_days: number
  daily_summary: Record<string, number>
  weekly_goal: number
  total_weekly_minutes: number
}

interface PerformanceMetrics {
  productivity_score: number
  focus_sessions: number
  average_session_quality: number
  improvement_trend: number
}

interface TaskDistribution {
  subject_name: string
  task_count: number
}

interface AnalyticsSummary {
  subjects: SubjectAnalytics[]
  daily: DailyAnalytics
  weekly: WeeklyStreak
  performance: PerformanceMetrics
  task_distribution: TaskDistribution[]
}


  const PIE_COLORS = [
  "#10b981", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
];

function preparePieData<T extends { name: string; value: number }>(data: T[]) {
  if (!data || data.length <= 4) return data || [];

  const top4 = [...data]
    .sort((a, b) => b.value - a.value) // sort descending
    .slice(0, 4);

  const othersValue = data
    .slice(4)
    .reduce((sum, item) => sum + item.value, 0);

  return [...top4, { name: "Others", value: othersValue }];
}


export default function AnalyticsPage() {
  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null)
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
      setSummaryData(null); // Error hone par data null set karein
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
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full animate-pulse-glow"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Analyzing Your Progress</h3>
            <p className="text-muted-foreground">Preparing your personalized insights...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!summaryData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">No Data Yet</h3>
          <p className="text-muted-foreground">Complete some study sessions to unlock your analytics dashboard!</p>
        </div>
      </div>
    )
  }
const { subjects, daily, weekly, performance, task_distribution } = summaryData;

// Chart ke liye data taiyaar karein
const weeklyChartData = Object.entries(weekly.daily_summary)
  .map(([day, minutes]) => ({
    day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
    minutes: minutes,
    goal: weekly.weekly_goal / 7,
  }))
  .reverse();

const subjectPieData = preparePieData(
  subjects.map((subject, index) => ({
    name: subject.subject_name,
    value: subject.total_minutes_studied,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))
);

const taskPieData = preparePieData(
  task_distribution.map((subject, index) => ({
    name: subject.subject_name,
    value: subject.task_count,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))
);

const performanceChartData = [
  { metric: "Productivity", score: performance.productivity_score, target: 90 },
  { metric: "Focus Quality", score: performance.average_session_quality * 20, target: 85 },
  { metric: "Consistency", score: (weekly.streak_days / 7) * 100, target: 80 },
  { metric: "Goal Achievement", score: daily.completion_rate, target: 85 },
];

const subjectComparisonData = subjects.map((subject) => ({
    ...subject,
    efficiency: subject.sessions_count > 0 ? subject.total_minutes_studied / subject.sessions_count : 0,
    target_efficiency: 45,
}));



  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] bg-cover bg-center opacity-10"></div>


        <div className="relative container mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-all duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>

            <div className="glass-effect rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 text-primary-foreground">
                <Flame className="w-5 h-5 text-secondary" />
                <div className="text-xl font-bold">{weekly.streak_days} days</div>
                <span className="text-sm font-medium">Current Streak</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-primary-foreground text-balance">
                  Your Learning
                  <span className="text-secondary block">Analytics</span>
                </h1>
                <p className="text-xl text-primary-foreground/80 text-pretty leading-relaxed">
                  Discover insights into your study patterns, track your progress, and unlock your full potential.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary">{weekly.streak_days}</div>
                  <div className="text-sm text-primary-foreground/80">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary">{performance.productivity_score}</div>
                  <div className="text-sm text-primary-foreground/80">Productivity Score</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-secondary">
                    {Math.round(weekly.total_weekly_minutes / 60)}h
                  </div>
                  <div className="text-sm text-primary-foreground/80">This Week</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="glass-effect rounded-2xl p-6 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weeklyChartData}>
                    <defs>
                      <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "white", fontSize: 12 }} />
                    <YAxis hide />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="hsl(var(--secondary))"
                      fillOpacity={1}
                      fill="url(#weeklyGradient)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Progress</CardTitle>
              <div className="p-2 bg-chart-1/10 rounded-lg group-hover:bg-chart-1/20 transition-colors">
                <Target className="h-4 w-4 text-chart-1" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">
                {daily.tasks_completed}/{daily.tasks_planned}
              </div>
              <Progress value={daily.completion_rate} className="mb-2 h-2" />
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                {daily.completion_rate}% completion rate
              </div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
            style={{ animationDelay: "0.1s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Focus Time</CardTitle>
              <div className="p-2 bg-chart-2/10 rounded-lg group-hover:bg-chart-2/20 transition-colors">
                <Clock className="h-4 w-4 text-chart-2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{daily.focus_time}m</div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/20">
                  Deep Focus
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{performance.improvement_trend}%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
            style={{ animationDelay: "0.2s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Productivity Score</CardTitle>
              <div className="p-2 bg-chart-3/10 rounded-lg group-hover:bg-chart-3/20 transition-colors">
                <Zap className="h-4 w-4 text-chart-3" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{performance.productivity_score}/100</div>
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  Excellent
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  Top 10%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
            style={{ animationDelay: "0.3s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Goal</CardTitle>
              <div className="p-2 bg-chart-4/10 rounded-lg group-hover:bg-chart-4/20 transition-colors">
                <Award className="h-4 w-4 text-chart-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">
                {Math.round((weekly.total_weekly_minutes / weekly.weekly_goal) * 100)}%
              </div>
              <Progress value={(weekly.total_weekly_minutes / weekly.weekly_goal) * 100} className="mb-2 h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {weekly.total_weekly_minutes}/{weekly.weekly_goal} minutes
                </span>
                <Trophy className="h-3 w-3 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Enhanced Daily Progress Radial Chart */}
         <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <div className="p-2 bg-chart-1/10 rounded-lg">
        <Target className="h-5 w-5 text-chart-1" />
      </div>
      Daily Achievement
    </CardTitle>
    <CardDescription>Task completion and focus metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={260}>
      <RadialBarChart
        innerRadius="70%"   // thinner
        outerRadius="100%"  // keep big circle
        data={[
          {
            name: "Completed",
            value: (daily.tasks_completed / daily.tasks_planned) * 100,
            fill: "hsl(var(--chart-1))",
          },
        ]}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={50}
          background={{ fill: "hsl(var(--muted))" }}
        />
        <text
          x="50%"
          y="42%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-4xl font-bold"
        >
          {daily.tasks_completed}
        </text>
        <text
          x="50%"
          y="55%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-base"
        >
          of {daily.tasks_planned} tasks
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="text-center text-muted-foreground text-sm mt-2">
      <span className="font-medium text-foreground">{daily.completion_rate}%</span> completion •{" "}
      <span className="font-medium text-foreground">{daily.focus_time} min</span> focused
    </div>
  </CardContent>
</Card>

          {/* Enhanced Study Time Distribution */}
          <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <PieChartIcon className="h-5 w-5 text-chart-2" />
                </div>
                Study Distribution
              </CardTitle>
              <CardDescription>Time allocation across subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={subjectPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {subjectPieData.map((entry, index) => (
                      // @ts-ignore
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} minutes`, "Study Time"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Task Distribution */}
          <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Activity className="h-5 w-5 text-chart-3" />
                </div>
                Task Breakdown
              </CardTitle>
              <CardDescription>Number of tasks per subject</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={taskPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {taskPieData.map((entry, index) => (
                      // @ts-ignore
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} tasks`, "Task Count"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Study Pattern with Goal Line */}
          <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-chart-3" />
                </div>
                Weekly Progress
              </CardTitle>
              <CardDescription>Daily study minutes with goal tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="hsl(var(--chart-3))"
                    fillOpacity={1}
                    fill="url(#areaGradient)"
                    strokeWidth={3}
                  />
                  <ReferenceLine
                    y={weekly.weekly_goal / 7}
                    stroke="hsl(var(--chart-4))"
                    strokeDasharray="5 5"
                    label={{ value: "Daily Goal", position: "right" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-sm text-muted-foreground mt-4 pt-4 border-t">
                <span>Total: {weekly.total_weekly_minutes} minutes</span>
                <span>Average: {Math.round(weekly.total_weekly_minutes / 7)} min/day</span>
                <span>Goal: {Math.round((weekly.total_weekly_minutes / weekly.weekly_goal) * 100)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Radar */}
          <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <Brain className="h-5 w-5 text-chart-4" />
                </div>
                Performance Overview
              </CardTitle>
              <CardDescription>Key metrics vs targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={performanceChartData} layout="horizontal">
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <XAxis
                    type="category"
                    dataKey="metric"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="target" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} opacity={0.3} name="Target" />
                  <Bar dataKey="score" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} name="Current" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="animate-fade-in-up border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-chart-5/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-chart-5" />
              </div>
              Subject Performance Analysis
            </CardTitle>
            <CardDescription>Comprehensive breakdown of study sessions and efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={subjectComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="subject_name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.1)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
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
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 4 }}
                  name="Efficiency (min/session)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

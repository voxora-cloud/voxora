import { MetricCard } from "../components/metric-card";
import { Card } from "@/shared/ui/card";
import {
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Activity,
  UserCheck,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Mock data
const responseTimeData = [
  { hour: "9AM", time: 2.5 },
  { hour: "10AM", time: 3.2 },
  { hour: "11AM", time: 2.8 },
  { hour: "12PM", time: 4.1 },
  { hour: "1PM", time: 3.5 },
  { hour: "2PM", time: 2.9 },
  { hour: "3PM", time: 3.7 },
  { hour: "4PM", time: 3.1 },
];

const agentPerformanceData = [
  { name: "Sarah", conversations: 45, avgResponse: 2.3 },
  { name: "John", conversations: 38, avgResponse: 3.1 },
  { name: "Emma", conversations: 42, avgResponse: 2.7 },
  { name: "Mike", conversations: 35, avgResponse: 3.5 },
  { name: "Lisa", conversations: 40, avgResponse: 2.9 },
];

const activityData = [
  { day: "Mon", messages: 145, conversations: 24 },
  { day: "Tue", messages: 198, conversations: 32 },
  { day: "Wed", messages: 167, conversations: 28 },
  { day: "Thu", messages: 234, conversations: 45 },
  { day: "Fri", messages: 201, conversations: 38 },
];

const chartConfig = {
  time: {
    label: "Response Time (min)",
    color: "#3b82f6",
  },
  conversations: {
    label: "Conversations",
    color: "#10b981",
  },
  messages: {
    label: "Messages",
    color: "#f59e0b",
  },
  avgResponse: {
    label: "Avg Response (min)",
    color: "#8b5cf6",
  },
};

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Support operations and team management
        </p>
      </div>

      {/* Queue Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Queue Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Conversations"
            value="24"
            change="+3"
            changeType="neutral"
            icon={MessageSquare}
            description="currently in progress"
          />
          <MetricCard
            title="Unassigned"
            value="5"
            change="-2"
            changeType="positive"
            icon={AlertCircle}
            description="waiting for assignment"
          />
          <MetricCard
            title="Waiting for Agent"
            value="8"
            change="+1"
            changeType="negative"
            icon={Clock}
            description="pending response"
          />
          <MetricCard
            title="In Progress"
            value="11"
            change="0"
            changeType="neutral"
            icon={Activity}
            description="being handled"
          />
        </div>
      </div>

      {/* Agent Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Agent Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Conversations per Agent
            </h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={agentPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="conversations"
                  fill="var(--color-conversations)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Avg Response Time per Agent
            </h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={agentPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="avgResponse"
                  fill="var(--color-avgResponse)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </Card>
        </div>
      </div>

      {/* Support Efficiency */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Support Efficiency</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Avg First Response"
            value="2.3m"
            change="-15%"
            changeType="positive"
            icon={Clock}
            description="faster response"
          />
          <MetricCard
            title="Avg Resolution Time"
            value="18.5m"
            change="-8%"
            changeType="positive"
            icon={CheckCircle}
          />
          <MetricCard
            title="Reopened Conversations"
            value="12"
            change="+3"
            changeType="negative"
            icon={AlertCircle}
            description="this week"
          />
          <MetricCard
            title="Agents Online"
            value="5/7"
            icon={UserCheck}
            description="currently active"
          />
        </div>
      </div>

      {/* Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Activity Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="var(--color-messages)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-messages)" }}
                />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="var(--color-conversations)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-conversations)" }}
                />
              </LineChart>
            </ChartContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Response Time Trend</h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="var(--color-time)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-time)" }}
                />
              </LineChart>
            </ChartContainer>
          </Card>
        </div>
      </div>

      {/* Today's Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Summary</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <MessageSquare className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
              <p className="text-2xl font-bold">234</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversations Created</p>
              <p className="text-2xl font-bold">45</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-500/10 p-3">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Closed Conversations</p>
              <p className="text-2xl font-bold">38</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

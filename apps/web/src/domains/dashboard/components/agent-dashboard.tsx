import { MetricCard } from "../components/metric-card";
import { Card } from "@/shared/ui/card";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  Activity,
  TrendingUp,
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
const myActivityData = [
  { day: "Mon", conversations: 8, messages: 42 },
  { day: "Tue", conversations: 12, messages: 68 },
  { day: "Wed", conversations: 9, messages: 51 },
  { day: "Thu", conversations: 15, messages: 89 },
  { day: "Fri", conversations: 11, messages: 64 },
];

const myResponseTimeData = [
  { hour: "9AM", responseTime: 1.8 },
  { hour: "10AM", responseTime: 2.3 },
  { hour: "11AM", responseTime: 2.1 },
  { hour: "12PM", responseTime: 2.9 },
  { hour: "1PM", responseTime: 2.5 },
  { hour: "2PM", responseTime: 2.2 },
  { hour: "3PM", responseTime: 2.7 },
  { hour: "4PM", responseTime: 2.4 },
];

const myConversationsData = [
  { status: "Active", count: 6 },
  { status: "Waiting", count: 3 },
  { status: "Closed", count: 11 },
];

const chartConfig = {
  conversations: {
    label: "Conversations",
    color: "#10b981",
  },
  messages: {
    label: "Messages",
    color: "#3b82f6",
  },
  responseTime: {
    label: "Response Time (min)",
    color: "#8b5cf6",
  },
  count: {
    label: "Count",
    color: "#f59e0b",
  },
};

export function AgentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your personal workload and performance
        </p>
      </div>

      {/* Personal Workload */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Workload</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="My Active Conversations"
            value="6"
            change="+2"
            changeType="neutral"
            icon={MessageSquare}
            description="currently handling"
          />
          <MetricCard
            title="Waiting for Me"
            value="3"
            change="+1"
            changeType="negative"
            icon={Clock}
            description="pending response"
          />
          <MetricCard
            title="Closed Today"
            value="11"
            change="+3"
            changeType="positive"
            icon={CheckCircle}
            description="resolved conversations"
          />
          <MetricCard
            title="Handled Today"
            value="15"
            icon={Activity}
            description="total conversations"
          />
        </div>
      </div>

      {/* My Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Performance</h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={myActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="var(--color-conversations)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-conversations)" }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="var(--color-messages)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-messages)" }}
                />
              </LineChart>
            </ChartContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">My Response Time</h3>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={myResponseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="var(--color-responseTime)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-responseTime)" }}
                />
              </LineChart>
            </ChartContainer>
          </Card>
        </div>
      </div>

      {/* Performance Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Avg Response Time"
            value="2.4m"
            change="-0.3m"
            changeType="positive"
            icon={Clock}
            description="faster than yesterday"
          />
          <MetricCard
            title="Avg Resolution Time"
            value="15.8m"
            change="-2.1m"
            changeType="positive"
            icon={CheckCircle}
          />
          <MetricCard
            title="Messages Sent Today"
            value="89"
            change="+12"
            changeType="positive"
            icon={MessageSquare}
          />
        </div>
      </div>

      {/* Conversation Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            My Conversations Breakdown
          </h3>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={myConversationsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">This Week's Summary</h3>
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2">
                  <Activity className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Conversations Handled
                  </p>
                  <p className="text-xl font-bold">55</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-500 font-medium">+8%</p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                  <p className="text-xl font-bold">314</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-500 font-medium">+12%</p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Rating
                  </p>
                  <p className="text-xl font-bold">4.8/5.0</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-500 font-medium">+0.2</p>
                <p className="text-xs text-muted-foreground">improvement</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/10 p-2">
                  <CheckCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Resolution Rate
                  </p>
                  <p className="text-xl font-bold">96%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-500 font-medium">+3%</p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

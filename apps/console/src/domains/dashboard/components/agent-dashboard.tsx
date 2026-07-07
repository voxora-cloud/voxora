import { MetricCard } from "./metric-card";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Loader } from "@/shared/ui/loader";
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
import { useAgentDashboardStats } from "../hooks/use-analytics";
import { AnalyticsEmptyState } from "./analytics-empty-state";

const chartConfig = {
  conversations: {
    label: "Conversations",
    color: "var(--color-success)",
  },
  messages: {
    label: "Messages",
    color: "var(--color-info)",
  },
  responseTime: {
    label: "Response Time (min)",
    color: "var(--color-primary)",
  },
  count: {
    label: "Count",
    color: "var(--color-warning)",
  },
};

const formatIntegerTick = (value: number) => Math.round(value).toLocaleString();

const formatDuration = (ms: number | null) => {
  if (ms === null) return "—";
  const minutes = ms / 60000;
  return minutes < 1 ? `${Math.round(ms / 1000)}s` : `${minutes.toFixed(1)}m`;
};

const formatChange = (value: number, suffix = "") =>
  `${value > 0 ? "+" : ""}${value}${suffix}`;

export function AgentDashboard() {
  const { data, isLoading, isError, refetch } = useAgentDashboardStats();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="font-medium text-foreground">Unable to load agent analytics</p>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { overview, weekSummary } = data;
  const hasDailyPerformance = data.activity.some(
    (row) => row.conversations > 0 || row.messages > 0,
  );
  const hasResponseTime = data.responseTime.some((row) => row.responseTime > 0);
  const hasConversationBreakdown = data.conversationBreakdown.some(
    (row) => row.count > 0,
  );

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
            value={overview.activeConversations}
            icon={MessageSquare}
            description="currently handling"
          />
          <MetricCard
            title="Waiting for Me"
            value={overview.waitingForAgent}
            icon={Clock}
            description="pending response"
          />
          <MetricCard
            title="Closed Today"
            value={overview.resolvedToday}
            change={formatChange(overview.changes.resolvedToday)}
            changeType={overview.changes.resolvedToday >= 0 ? "positive" : "negative"}
            icon={CheckCircle}
            description="resolved conversations"
          />
          <MetricCard
            title="Handled Today"
            value={overview.handledToday}
            change={formatChange(overview.changes.handledToday)}
            changeType={overview.changes.handledToday >= 0 ? "positive" : "negative"}
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
            <div className="h-[300px]">
              {hasDailyPerformance ? (
                <ChartContainer config={chartConfig} className="h-full">
                  <LineChart data={data.activity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} tickFormatter={formatIntegerTick} />
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
              ) : (
                <AnalyticsEmptyState />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">My Response Time</h3>
            <div className="h-[300px]">
              {hasResponseTime ? (
                <ChartContainer config={chartConfig} className="h-full">
                  <LineChart data={data.responseTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis allowDecimals={false} tickFormatter={formatIntegerTick} />
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
              ) : (
                <AnalyticsEmptyState />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Performance Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Avg Response Time"
            value={formatDuration(overview.avgResponseTimeMs)}
            icon={Clock}
            description="last 7 days"
          />
          <MetricCard
            title="Avg Resolution Time"
            value={formatDuration(overview.avgResolutionTimeMs)}
            icon={CheckCircle}
          />
          <MetricCard
            title="Messages Sent Today"
            value={overview.messagesSentToday}
            change={formatChange(overview.changes.messagesSentToday)}
            changeType={overview.changes.messagesSentToday >= 0 ? "positive" : "negative"}
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
          <div className="h-[300px]">
            {hasConversationBreakdown ? (
              <ChartContainer config={chartConfig} className="h-full">
                <BarChart data={data.conversationBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} tickFormatter={formatIntegerTick} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <AnalyticsEmptyState />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">This Week's Summary</h3>
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/10 p-2">
                  <Activity className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Conversations Handled
                  </p>
                  <p className="font-mono text-xl font-bold tabular-nums">{weekSummary.conversationsHandled}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium tabular-nums text-success">
                  {formatChange(weekSummary.conversationsChange, "%")}
                </p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-info/10 p-2">
                  <MessageSquare className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                  <p className="font-mono text-xl font-bold tabular-nums">{weekSummary.messagesSent}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium tabular-nums text-info">
                  {formatChange(weekSummary.messagesChange, "%")}
                </p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Rating
                  </p>
                  <p className="font-mono text-xl font-bold tabular-nums">—</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium tabular-nums text-primary">—</p>
                <p className="text-xs text-muted-foreground">no rating data</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-warning/10 p-2">
                  <CheckCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Resolution Rate
                  </p>
                  <p className="font-mono text-xl font-bold tabular-nums">{weekSummary.resolutionRate}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium tabular-nums text-warning">
                  {formatChange(weekSummary.resolutionRateChange, "%")}
                </p>
                <p className="text-xs text-muted-foreground">vs last week</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

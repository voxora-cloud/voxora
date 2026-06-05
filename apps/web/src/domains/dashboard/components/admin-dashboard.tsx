import { MetricCard } from "../components/metric-card";
import { Card } from "@/shared/ui/card";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  Coins,
  Wallet,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  hasConversationStatusData,
  hasMessageVolumeData,
  useAnalyticsSummary,
  useAnalyticsTrends,
} from "../hooks/use-analytics";
import { Loader } from "@/shared/ui/loader";

const emptyAnalyticsMessage = "Currently, we don’t have enough data to show this information.";

const messageChartConfig = {
  ai: {
    label: "AI Messages",
    color: "#845C6C",
  },
  agent: {
    label: "Agent Messages",
    color: "#2F6D6B",
  },
};

const conversationChartConfig = {
  started: {
    label: "Started",
    color: "#845C6C",
  },
  resolved: {
    label: "Resolved",
    color: "#10b981",
  },
  opened: {
    label: "Open",
    color: "#f59e0b",
  },
};

const aiCostChartConfig = {
  estimatedCostUsd: {
    label: "Cost (USD)",
    color: "#2F6D6B",
  },
};

const formatDuration = (ms?: number | null) => {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export function AdminDashboard() {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends(7);

  const totalSource =
    (summary?.source?.widget || 0) +
    (summary?.source?.qr || 0);
  const messageVolumeData = trends?.messageVolume ?? [];
  const conversationStatusData = trends?.conversationStatus ?? [];
  const hasMessageVolume = hasMessageVolumeData(messageVolumeData);
  const hasConversationStatus = hasConversationStatusData(conversationStatusData);

  if (summaryLoading || trendsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Organization performance, message flow, and cost visibility.
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Conversations"
          value={summary?.totalConversations || 0}
          icon={MessageSquare}
          description="Last 30 days"
        />
        <MetricCard
          title="Resolved Conversations"
          value={summary?.resolvedConversations || 0}
          icon={CheckCircle2}
          description="Resolved or closed"
        />
        <MetricCard
          title="Users Served"
          value={summary?.totalUsersServed || 0}
          icon={Users}
          description="Unique visitor sessions"
        />
        <MetricCard
          title="Human Escalation Rate"
          value={`${summary?.humanEscalationRate ?? 0}%`}
          icon={UserCheck}
          description="Conversations routed to agent"
        />
        <MetricCard
          title="Avg Resolution Time"
          value={formatDuration(summary?.avgResolutionTimeMs)}
          icon={Clock}
          description="From start to close/resolution"
        />
        <MetricCard
          title="Widget Loads"
          value={summary?.widgetLoads || 0}
          icon={MessageSquare}
          description="Last 30 days"
        />
        <MetricCard
          title="AI Tokens Used"
          value={summary?.aiCost?.totalTokens || 0}
          icon={Coins}
          description="Prompt + completion tokens"
        />
        <MetricCard
          title="Estimated AI Cost"
          value={`$${(summary?.aiCost?.estimatedCostUsd || 0).toFixed(2)}`}
          icon={Wallet}
          description="Last 30 days"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Message Volume (Last 7 Days)</h3>
          <div className="h-80 w-full">
            {hasMessageVolume ? (
              <ChartContainer config={messageChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={messageVolumeData}>
                    <defs>
                      <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#845C6C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#845C6C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAgent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F6D6B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2F6D6B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickFormatter={(str) => {
                        const date = new Date(str);
                        return date.toLocaleDateString('en-US', { weekday: 'short' });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="ai"
                      stroke="#845C6C"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAi)"
                      stackId="messages"
                    />
                    <Area
                      type="monotone"
                      dataKey="agent"
                      stroke="#2F6D6B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAgent)"
                      stackId="messages"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
                <p className="text-sm text-muted-foreground">{emptyAnalyticsMessage}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Conversation Outcomes (Last 7 Days)</h3>
          <div className="h-80 w-full">
            {hasConversationStatus ? (
              <ChartContainer config={conversationChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversationStatusData}>
                    <defs>
                      <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#845C6C" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#845C6C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      tickFormatter={(str) => {
                        const date = new Date(str);
                        return date.toLocaleDateString("en-US", { weekday: "short" });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="started"
                      stroke="#845C6C"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorStarted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorResolved)"
                    />
                    <Area
                      type="monotone"
                      dataKey="opened"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOpened)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
                <p className="text-sm text-muted-foreground">{emptyAnalyticsMessage}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">AI Cost Trend (Last 7 Days)</h3>
          <div className="h-80 w-full">
            <ChartContainer config={aiCostChartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.aiCost || []}>
                  <defs>
                    <linearGradient id="colorAiCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6D6B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F6D6B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString("en-US", { weekday: "short" });
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="estimatedCostUsd"
                    stroke="#2F6D6B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAiCost)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Asked Questions</h3>
          <div className="space-y-3">
            {summary?.mostAskedQuestions?.length ? (
              summary.mostAskedQuestions.map((q: { question: string; count: number }, index: number) => (
                <div key={`${q.question}-${index}`} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-b-0">
                  <p className="text-sm text-foreground line-clamp-2">{q.question}</p>
                  <p className="text-xs text-muted-foreground">{q.count}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No question data available.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {[
              { label: "Widget", value: summary?.source?.widget || 0 },
              { label: "QR", value: summary?.source?.qr || 0 },
            ].map((row) => {
              const percent = totalSource > 0 ? Math.round((row.value / totalSource) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <span className="text-muted-foreground">{row.value} ({percent}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { MetricCard } from "../components/metric-card";
import { Card } from "@/shared/ui/card";
import {
  MessageSquare,
  MessagesSquare,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  Coins,
} from "lucide-react";
import {
  hasConversationStatusData,
  hasMessageVolumeData,
  useAnalyticsSummary,
  useAnalyticsTrends,
} from "../hooks/use-analytics";
import { Loader } from "@/shared/ui/loader";
import {
  ConversationOutcomesBarChart,
  MessageVolumeBarChart,
} from "./analytics-charts";

const emptyAnalyticsMessage = "Currently, we don’t have enough data to show this information.";

const formatDuration = (ms?: number | null) => {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export function OwnerDashboard() {
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
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Organization performance, message flow, and support outcomes.
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
          title="Avg Messages / Conversation"
          value={
            (summary?.totalConversations ?? 0) > 0
              ? ((summary?.totalMessages ?? 0) / summary!.totalConversations).toFixed(1)
              : "—"
          }
          icon={MessagesSquare}
          description="Message depth per conversation"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Message Volume (Last 7 Days)</h3>
          <div className="h-80 w-full">
            {hasMessageVolume ? (
              <MessageVolumeBarChart data={messageVolumeData} />
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
              <ConversationOutcomesBarChart data={conversationStatusData} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
                <p className="text-sm text-muted-foreground">{emptyAnalyticsMessage}</p>
              </div>
            )}
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

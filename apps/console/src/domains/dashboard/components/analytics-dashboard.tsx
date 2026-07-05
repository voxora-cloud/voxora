import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Coins,
  MessageSquare,
  MessagesSquare,
  UserCheck,
  Users,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Loader } from "@/shared/ui/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  hasConversationStatusData,
  hasInteractionSourceData,
  hasMessageVolumeData,
  useAnalyticsSummary,
  useAnalyticsTrends,
} from "../hooks/use-analytics";
import {
  AIInteractionSourcesPieChart,
  ConversationOutcomesBarChart,
  MessageVolumeBarChart,
} from "./analytics-charts";
import { MetricCard } from "./metric-card";
import { MostAskedQuestionsCard } from "./most-asked-questions-card";

const emptyAnalyticsMessage = "Currently, we don’t have enough data to show this information.";

const formatDuration = (ms?: number | null) => {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

export function AnalyticsDashboard({ title = "Analytics Dashboard" }: { title?: string }) {
  const [days, setDays] = useState(7);
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends(days);

  const messageVolumeData = trends?.messageVolume ?? [];
  const conversationStatusData = trends?.conversationStatus ?? [];
  const hasMessageVolume = hasMessageVolumeData(messageVolumeData);
  const hasConversationStatus = hasConversationStatusData(conversationStatusData);
  const sourceData = summary?.source ?? {
    widget: 0,
    qr: 0,
    link: 0,
    email: 0,
    whatsapp: 0,
    telegram: 0,
    web: 0,
  };
  const hasSourceData = hasInteractionSourceData(sourceData);

  if (summaryLoading || trendsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">
            Organization performance, message flow, and support outcomes.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
          <SelectTrigger className="w-[150px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              ? Math.round((summary?.totalMessages ?? 0) / summary!.totalConversations)
              : "—"
          }
          icon={MessagesSquare}
          description="Message depth per conversation"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Message Volume (Last {days} Days)</h3>
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
          <h3 className="mb-4 text-lg font-semibold">Conversation Outcomes (Last {days} Days)</h3>
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
        <MostAskedQuestionsCard questions={summary?.mostAskedQuestions} />

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">AI Interaction Sources</h3>
          <div className="h-80 w-full">
            {hasSourceData ? (
              <AIInteractionSourcesPieChart source={sourceData} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
                <p className="text-sm text-muted-foreground">{emptyAnalyticsMessage}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

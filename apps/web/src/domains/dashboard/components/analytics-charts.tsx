import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/shared/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { DashboardTrends } from "../hooks/use-analytics";

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  payload?: Record<string, unknown>;
};

interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  rows: Array<{ key: string; label: string }>;
}

const messageChartConfig = {
  ai: {
    label: "AI Messages",
    color: "#845C6C",
  },
  agent: {
    label: "Agent Messages",
    color: "#2F6D6B",
  },
} satisfies ChartConfig;

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
} satisfies ChartConfig;

const formatIntegerTick = (value: number) => Math.round(value).toLocaleString();

const formatShortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

const formatLongDate = (value?: string) => {
  if (!value) return "Selected day";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const readValue = (payload: TooltipPayloadItem[] | undefined, key: string) => {
  const value = payload?.find((item) => item.dataKey === key)?.value;
  return typeof value === "number" ? Math.round(value) : Number(value || 0);
};

function AnalyticsTooltip({ active, payload, label, rows }: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;

  const total = rows.reduce((sum, row) => sum + readValue(payload, row.key), 0);

  return (
    <div className="min-w-[12rem] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-medium text-foreground">{formatLongDate(label)}</div>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const item = payload.find((entry) => entry.dataKey === row.key);
          const value = readValue(payload, row.key);
          return (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: item?.color }}
                />
                {row.label}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2 font-medium">
        <span className="text-muted-foreground">Total</span>
        <span className="font-mono tabular-nums text-foreground">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function MessageVolumeBarChart({
  data,
}: {
  data: DashboardTrends["messageVolume"];
}) {
  return (
    <ChartContainer config={messageChartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={formatShortDate}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={formatIntegerTick}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={
              <AnalyticsTooltip
                rows={[
                  { key: "ai", label: "AI Messages" },
                  { key: "agent", label: "Agent Messages" },
                ]}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
          <Bar
            dataKey="ai"
            name="AI Messages"
            fill="#845C6C"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="agent"
            name="Agent Messages"
            fill="#2F6D6B"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function ConversationOutcomesBarChart({
  data,
}: {
  data: DashboardTrends["conversationStatus"];
}) {
  return (
    <ChartContainer config={conversationChartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={formatShortDate}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={formatIntegerTick}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={
              <AnalyticsTooltip
                rows={[
                  { key: "started", label: "Started" },
                  { key: "resolved", label: "Resolved" },
                  { key: "opened", label: "Open" },
                ]}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
          <Bar
            dataKey="started"
            name="Started"
            fill="#845C6C"
            stackId="outcomes"
            maxBarSize={32}
          />
          <Bar
            dataKey="resolved"
            name="Resolved"
            fill="#10b981"
            stackId="outcomes"
            maxBarSize={32}
          />
          <Bar
            dataKey="opened"
            name="Open"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            stackId="outcomes"
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

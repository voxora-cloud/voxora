import { useMemo, useState } from "react";
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
  Cell,
  Pie,
  PieChart,
  Sector,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { PieSectorShapeProps } from "recharts";
import type { DashboardSummary, DashboardTrends } from "../hooks/use-analytics";

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  payload?: Record<string, unknown>;
};

type SourceDataItem = {
  source: keyof DashboardSummary["source"];
  label: string;
  value: number;
  fill: string;
};

type SourceSectorShapeProps = PieSectorShapeProps & {
  payload?: Partial<SourceDataItem>;
  value?: number | string;
  fill?: string;
  total: number;
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

const sourceChartConfig = {
  widget: {
    label: "Widget",
    color: "#845C6C",
  },
  qr: {
    label: "QR Code",
    color: "#2F6D6B",
  },
  link: {
    label: "Direct Link",
    color: "#D97706",
  },
  email: {
    label: "Email",
    color: "#3b82f6",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#25d366",
  },
  telegram: {
    label: "Telegram",
    color: "#0088cc",
  },
  web: {
    label: "Dashboard",
    color: "#6b7280",
  },
} satisfies ChartConfig;

const sourceLabels: Record<keyof DashboardSummary["source"], string> = {
  widget: "Widget",
  qr: "QR Code",
  link: "Direct Link",
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  web: "Dashboard",
};

const sourceColors: Record<keyof DashboardSummary["source"], string> = {
  widget: "#845C6C",
  qr: "#2F6D6B",
  link: "#D97706",
  email: "#3b82f6",
  whatsapp: "#25d366",
  telegram: "#0088cc",
  web: "#6b7280",
};

const formatIntegerTick = (value: number) => Math.round(value).toLocaleString();

const formatShortDate = (value: string, showCalendarDate = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(
    "en-US",
    showCalendarDate
      ? { month: "short", day: "numeric" }
      : { weekday: "short" },
  );
};

const getXAxisTicks = (data: Array<{ date: string }>) => {
  if (data.length <= 7) return data.map((row) => row.date);

  const step = data.length <= 14 ? 2 : 5;
  const ticks = data
    .filter((_, index) => index % step === 0)
    .map((row) => row.date);
  const lastDate = data.at(-1)?.date;

  if (lastDate && ticks.at(-1) !== lastDate) ticks.push(lastDate);
  return ticks;
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

function SourcePieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const row = item.payload as SourceDataItem;
  const value = Number(row.value || 0);
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="min-w-[13rem] rounded-lg border border-border/50 bg-background px-3 py-2.5 text-xs shadow-xl">
      <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: row.fill || item.color }}
        />
        {row.label || item.name}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Interactions</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {value.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Share</span>
          <span className="font-mono font-medium tabular-nums text-foreground">{percent}%</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-1.5">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function SourceSectorShape(props: SourceSectorShapeProps) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#64748B",
    payload,
    value,
    total,
    isActive,
  } = props;

  if (!isActive) {
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={4}
      />
    );
  }

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 8) * cos;
  const sy = cy + (outerRadius + 8) * sin;
  const mx = cx + (outerRadius + 24) * cos;
  const my = cy + (outerRadius + 24) * sin;
  const ex = mx + (cos >= 0 ? 18 : -18);
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";
  const percent = total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={5}
        className="drop-shadow-sm transition-all duration-200"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 17}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.28}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={3} fill={fill} />
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey - 6}
        textAnchor={textAnchor}
        className="fill-foreground text-[12px] font-medium"
      >
        {payload?.label}
      </text>
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey + 10}
        textAnchor={textAnchor}
        className="fill-muted-foreground text-[11px]"
      >
        {`${Number(value || 0).toLocaleString()} (${percent}%)`}
      </text>
    </g>
  );
}

function SourceCenterLabel({
  activeSource,
  total,
}: {
  activeSource?: SourceDataItem;
  total: number;
}) {
  if (!activeSource) {
    return (
      <g>
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[22px] font-semibold">
          {total.toLocaleString()}
        </text>
        <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
          Total
        </text>
      </g>
    );
  }

  const percent = total > 0 ? Math.round((activeSource.value / total) * 100) : 0;

  return (
    <g>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[22px] font-semibold">
        {`${percent}%`}
      </text>
      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[12px]">
        {activeSource.label}
      </text>
    </g>
  );
}

function SourceLegend({
  data,
  activeIndex,
  total,
  onSelect,
  onClear,
}: {
  data: SourceDataItem[];
  activeIndex: number | null;
  total: number;
  onSelect: (index: number | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {data.map((row, index) => {
        const percent = total > 0 ? Math.round((row.value / total) * 100) : 0;
        const isActive = index === activeIndex;
        return (
          <button
            key={row.source}
            type="button"
            onMouseEnter={() => onSelect(index)}
            onMouseLeave={onClear}
            onFocus={() => onSelect(index)}
            onBlur={onClear}
            className={`flex min-h-12 items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
              isActive
                ? "border-border bg-muted/60 text-foreground"
                : "border-border/70 bg-background/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-xs font-medium">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: row.fill }} />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="mt-1 block font-mono text-[11px] tabular-nums">
                {row.value.toLocaleString()}
              </span>
            </span>
            <span className="font-mono text-xs font-medium tabular-nums">{percent}%</span>
          </button>
        );
      })}
    </div>
  );
}

export function MessageVolumeBarChart({
  data,
}: {
  data: DashboardTrends["messageVolume"];
}) {
  const xAxisTicks = getXAxisTicks(data);
  const showCalendarDate = data.length > 7;

  return (
    <ChartContainer config={messageChartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }} barGap={6}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" opacity={0.55} />
          <XAxis
            dataKey="date"
            ticks={xAxisTicks}
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={16}
            height={32}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => formatShortDate(value, showCalendarDate)}
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
            cursor={{ fill: "var(--muted)", opacity: 0.25, radius: 6 }}
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
            activeBar={{ stroke: "#845C6C", strokeWidth: 2, opacity: 1 }}
          />
          <Bar
            dataKey="agent"
            name="Agent Messages"
            fill="#2F6D6B"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            activeBar={{ stroke: "#2F6D6B", strokeWidth: 2, opacity: 1 }}
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
  const xAxisTicks = getXAxisTicks(data);
  const showCalendarDate = data.length > 7;

  return (
    <ChartContainer config={conversationChartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" opacity={0.55} />
          <XAxis
            dataKey="date"
            ticks={xAxisTicks}
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={16}
            height={32}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => formatShortDate(value, showCalendarDate)}
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
            cursor={{ fill: "var(--muted)", opacity: 0.25, radius: 6 }}
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
            activeBar={{ stroke: "#845C6C", strokeWidth: 2, opacity: 1 }}
          />
          <Bar
            dataKey="resolved"
            name="Resolved"
            fill="#10b981"
            stackId="outcomes"
            maxBarSize={32}
            activeBar={{ stroke: "#10b981", strokeWidth: 2, opacity: 1 }}
          />
          <Bar
            dataKey="opened"
            name="Open"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            stackId="outcomes"
            maxBarSize={32}
            activeBar={{ stroke: "#f59e0b", strokeWidth: 2, opacity: 1 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function AIInteractionSourcesPieChart({
  source,
}: {
  source: DashboardSummary["source"];
}) {
  const data = useMemo(
    () =>
      (Object.keys(sourceLabels) as Array<keyof DashboardSummary["source"]>)
        .map((key) => ({
          source: key,
          label: sourceLabels[key],
          value: source?.[key] || 0,
          fill: sourceColors[key],
        }))
        .filter((row) => row.value > 0),
    [source],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const safeActiveIndex = activeIndex !== null && data[activeIndex] ? activeIndex : null;
  const activeSource = safeActiveIndex === null ? undefined : data[safeActiveIndex];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChartContainer config={sourceChartConfig} className="min-h-0 flex-1 w-full">
        <PieChart margin={{ top: 20, right: 36, bottom: 8, left: 36 }}>
          <ChartTooltip content={<SourcePieTooltip total={total} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="source"
            shape={(props: PieSectorShapeProps, index: number) => (
              <SourceSectorShape
                {...props}
                index={index}
                total={total}
                isActive={safeActiveIndex !== null && index === safeActiveIndex}
              />
            )}
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            stroke="var(--background)"
            strokeWidth={3}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.source}
                fill={entry.fill}
                opacity={safeActiveIndex === null || index === safeActiveIndex ? 1 : 0.64}
                className="cursor-pointer outline-none transition-opacity duration-200"
              />
            ))}
          </Pie>
          <SourceCenterLabel activeSource={activeSource} total={total} />
        </PieChart>
      </ChartContainer>
      <SourceLegend
        data={data}
        activeIndex={safeActiveIndex}
        total={total}
        onSelect={setActiveIndex}
        onClear={() => setActiveIndex(null)}
      />
    </div>
  );
}

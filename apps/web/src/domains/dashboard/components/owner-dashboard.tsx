import { MetricCard } from "../components/metric-card";
import { Card } from "@/shared/ui/card";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity,
  Globe,
  MousePointerClick,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/shared/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Mock data for charts
const conversationsData = [
  { date: "Mon", conversations: 24 },
  { date: "Tue", conversations: 32 },
  { date: "Wed", conversations: 28 },
  { date: "Thu", conversations: 45 },
  { date: "Fri", conversations: 38 },
  { date: "Sat", conversations: 22 },
  { date: "Sun", conversations: 18 },
];

const contactsGrowthData = [
  { month: "Jan", contacts: 850 },
  { month: "Feb", contacts: 920 },
  { month: "Mar", contacts: 1050 },
  { month: "Apr", contacts: 1180 },
  { month: "May", contacts: 1284 },
];

const conversationStatusData = [
  { name: "Open", value: 24, color: "#f59e0b" },
  { name: "Closed", value: 156, color: "#10b981" },
];

const widgetConversionData = [
  { metric: "Visitors", value: 1240 },
  { metric: "Chats Started", value: 287 },
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
  contacts: {
    label: "Contacts",
    color: "#8b5cf6",
  },
  visitors: {
    label: "Visitors",
    color: "#f59e0b",
  },
  chats: {
    label: "Chats",
    color: "#10b981",
  },
};

export function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Owner Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Business-level metrics and growth insights
        </p>
      </div>

      {/* Growth Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Growth Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Contacts"
            value="1,284"
            change="+8%"
            changeType="positive"
            icon={Users}
            description="from last month"
          />
          <MetricCard
            title="New Contacts Today"
            value="23"
            change="+12%"
            changeType="positive"
            icon={TrendingUp}
            description="vs yesterday"
          />
          <MetricCard
            title="Total Conversations"
            value="856"
            change="+15%"
            changeType="positive"
            icon={MessageSquare}
          />
          <MetricCard
            title="Conversations Today"
            value="45"
            change="+5%"
            changeType="positive"
            icon={Activity}
          />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversations Over Time */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Conversations Over Time</h3>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={conversationsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
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

        {/* Contact Growth */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contact Growth</h3>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={contactsGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="contacts"
                stroke="var(--color-contacts)"
                fill="var(--color-contacts)"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </Card>
      </div>

      {/* Engagement & Support Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Support Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Avg First Response"
            value="2.3m"
            change="-15%"
            changeType="positive"
            icon={Clock}
            description="faster than last week"
          />
          <MetricCard
            title="Avg Resolution Time"
            value="18.5m"
            change="-8%"
            changeType="positive"
            icon={CheckCircle}
          />
          <MetricCard
            title="Messages Today"
            value="234"
            change="+18%"
            changeType="positive"
            icon={MessageSquare}
          />
          <MetricCard
            title="Chat Conversion"
            value="23.1%"
            change="+2.3%"
            changeType="positive"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Open vs Closed */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Open vs Closed Conversations
          </h3>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={conversationStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {conversationStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </Card>

        {/* Widget Analytics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Widget Analytics</h3>
          <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Visitors</span>
              </div>
              <span className="text-2xl font-bold">1,240</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Chats Started</span>
              </div>
              <span className="text-2xl font-bold">287</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Conversion Rate</span>
              </div>
              <span className="text-2xl font-bold text-emerald-500">23.1%</span>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <BarChart data={widgetConversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>
    </div>
  );
}

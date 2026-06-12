import { useEffect, useState } from "react";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import {
  MessageSquare,
  UserCheck,
  BookUser,
  BarChart3,
  CheckCircle2,
  Star,
  Zap,
  Crown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanTier = "free" | "pro" | "proplus";

type PlanDefinition = {
  plan: PlanTier;
  priceMonthlyUsd: number;
  summary: string;
  features: string[];
  limits: Record<"messages" | "humanAgents" | "contacts", number | null>;
};

type EntitlementsResponse = {
  success: boolean;
  message: string;
  data?: {
    currentPlan: PlanTier;
    plans: PlanDefinition[];
    entitlements: {
      mode: "cloud" | "self-host";
      ee: { enabledByEnv: boolean; modulePresent: boolean; isAvailable: boolean };
      limits: PlanDefinition["limits"];
    };
  };
};

type UsageStat = { used: number; limit: number | null; pct: number };
type UsageSnapshot = {
  period: string;
  resetsAt: string;
  usage: Record<string, UsageStat>;
};
type UsageResponse = { success: boolean; data: UsageSnapshot };

// ─── Static data ──────────────────────────────────────────────────────────────

const planMeta: Record<PlanTier, { icon: React.ReactNode; label: string }> = {
  free: { icon: <Star className="h-4 w-4 text-muted-foreground" />, label: "Free" },
  pro: { icon: <Zap className="h-4 w-4 text-primary" />, label: "Pro" },
  proplus: { icon: <Crown className="h-4 w-4 text-primary" />, label: "Pro+" },
};

const limitItems: {
  key: "messages" | "humanAgents" | "contacts";
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "messages", label: "AI messages", icon: <MessageSquare className="h-4 w-4" /> },
  { key: "humanAgents", label: "Human agents", icon: <UserCheck className="h-4 w-4" /> },
  { key: "contacts", label: "Database contacts", icon: <BookUser className="h-4 w-4" /> },
];

// ─── Main Page Component ──────────────────────────────────────────────────────

export function UsagePage() {
  const localPlan = (authApi.getOrgPlan() || "free") as PlanTier;
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(localPlan);
  const [currentPlanDef, setCurrentPlanDef] = useState<PlanDefinition | null>(null);
  const [mode, setMode] = useState<"cloud" | "self-host">("self-host");
  const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
  const [limits, setLimits] = useState<PlanDefinition["limits"] | null>(null);

  useEffect(() => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) return;

    const loadEntitlements = async () => {
      try {
        const res = await apiClient.get<EntitlementsResponse>(
          `/organizations/${orgId}/billing/entitlements`
        );
        const data = res.data;
        if (!data) return;
        const plan = data.currentPlan || localPlan;
        setCurrentPlan(plan);
        setMode(data.entitlements?.mode || "self-host");
        setLimits(data.entitlements?.limits || null);
        const planDef = data.plans?.find((p) => p.plan === plan) || null;
        setCurrentPlanDef(planDef);
      } catch {
        // Fallback
      }
    };

    const loadUsage = async () => {
      try {
        const res = await apiClient.get<UsageResponse>(`/organizations/${orgId}/billing/usage`);
        if (res?.data) setUsageSnapshot(res.data);
      } catch {
        // Non-critical
      }
    };

    void loadEntitlements();
    void loadUsage();
  }, [localPlan]);

  const isSelfHost = mode === "self-host";
  const meta = planMeta[currentPlan];

  return (
    <div className="flex flex-col items-center w-full pb-10">
      <div className="w-full max-w-4xl space-y-8">
        {/* Page header */}
        <div className="text-center space-y-1.5 pt-2">
          <h1 className="text-2xl font-bold text-foreground">Resource Usage</h1>
          <p className="text-sm text-muted-foreground">
            {isSelfHost
              ? "Resource usage metrics and capabilities for this self-hosted server."
              : `Track usage metrics and limits for the active ${meta.label} plan.`}
          </p>
        </div>

        {/* ── Active Subscription Card ── */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {meta.icon}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Active Subscription: {meta.label}
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] uppercase px-1.5 py-0.5"
                  >
                    Active
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSelfHost
                    ? "Unlimited access — self-hosted open source instance"
                    : (currentPlanDef?.summary ?? "Your current active plan")}
                </p>
              </div>
            </div>
            {isSelfHost && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 self-start sm:self-auto"
              >
                Self-hosted
              </Badge>
            )}
          </div>

          {/* Plan limits summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {limitItems.map(({ key, label, icon }) => {
              const limitVal = isSelfHost ? null : (currentPlanDef?.limits[key] ?? null);
              return (
                <div key={key} className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {icon}
                    {label}
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {limitVal === null ? "Unlimited" : limitVal.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Self-hosted Capabilities ── */}
        {isSelfHost && (
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Server Capabilities</h2>
                <p className="text-xs text-muted-foreground">Unlimited limits for self-hosted instances</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {limitItems.map(({ key, label, icon }) => (
                <div key={key} className="rounded-xl border bg-card/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="p-1 rounded-md bg-muted text-muted-foreground">{icon}</span>
                    {label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight text-foreground">Unlimited</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Cloud: Live In-Period Usage Monitors ── */}
        {!isSelfHost && usageSnapshot && (
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Monthly Resource Consumption</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time resource limits check</p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto font-medium text-xs px-2.5 py-1">
                Period Resets:{" "}
                {new Date(usageSnapshot.resetsAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Badge>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {limitItems.map(({ key, label, icon }) => {
                const stat = usageSnapshot.usage[key];
                if (!stat) return null;
                const pct = stat.pct;

                const isOver = pct >= 100;
                const isClose = pct >= 80 && pct < 100;

                const barColor = isOver
                  ? "bg-red-500"
                  : isClose
                    ? "bg-amber-500"
                    : "bg-primary";

                const textColor = isOver
                  ? "text-red-500"
                  : isClose
                    ? "text-amber-500"
                    : "text-muted-foreground";

                return (
                  <div key={key} className="space-y-3 rounded-xl border bg-card/60 p-4 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="p-1 rounded-md bg-muted border text-muted-foreground/85">{icon}</span>
                        {label}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${textColor}`}>
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Used: {stat.used.toLocaleString()}</span>
                      <span>Limit: {stat.limit === null ? "Unlimited" : stat.limit.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Usage Guidelines ── */}
        {!isSelfHost && limits && (
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Usage Guidelines</h2>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>If you reach your AI message limit, automated answers will pause, but human agents can continue chats normally.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Contact and Agent limits are checked when inviting new members or saving new leads in the database.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

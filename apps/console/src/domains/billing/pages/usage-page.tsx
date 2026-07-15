import { useEffect, useState } from "react";
import { Link } from "react-router";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Loader } from "@/shared/ui/loader";
import { Button } from "@/shared/ui/button";
import {
  MessageSquare,
  UserCheck,
  BookUser,
  BarChart3,
  CheckCircle2,
  Star,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  InfoIcon,
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

// ─── Plan Visual Styling ──────────────────────────────────────────────────────

const planMeta: Record<
  PlanTier,
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    bgGradient: string;
    textGradient: string;
    borderGlow: string;
    badgeBg: string;
  }
> = {
  free: {
    icon: <Star className="h-5 w-5 text-zinc-400" />,
    label: "Free Starter",
    description: "Ideal for testing and building small workflows",
    bgGradient: "from-zinc-500/5 via-transparent to-transparent",
    textGradient: "from-zinc-600 via-zinc-500 to-zinc-400",
    borderGlow: "group-hover:border-zinc-500/20",
    badgeBg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
  },
  pro: {
    icon: <Zap className="h-5 w-5 text-violet-400" />,
    label: "Professional Pro",
    description: "Best for growing and scaling support teams",
    bgGradient: "from-violet-500/10 via-transparent to-transparent",
    textGradient: "from-violet-400 via-indigo-400 to-cyan-400",
    borderGlow: "group-hover:border-violet-500/25",
    badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/25",
  },
  proplus: {
    icon: <Crown className="h-5 w-5 text-amber-400" />,
    label: "Enterprise ProPlus",
    description: "High-volume orchestration with branding removed",
    bgGradient: "from-amber-500/10 via-transparent to-transparent",
    textGradient: "from-amber-400 via-orange-400 to-yellow-500",
    borderGlow: "group-hover:border-amber-500/25",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  },
};

const limitItems: {
  key: "messages" | "humanAgents" | "contacts";
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  barGradient: string;
  glowClass: string;
}[] = [
  {
    key: "messages",
    label: "AI Bot Messages",
    description: "Monthly count of bot-generated responses",
    icon: <MessageSquare className="h-5 w-5" />,
    colorClass: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    barGradient: "from-violet-600 via-indigo-500 to-cyan-400",
    glowClass: "shadow-[0_0_12px_rgba(139,92,246,0.25)]",
  },
  {
    key: "humanAgents",
    label: "Teammates & Agents",
    description: "Active members handling live conversations",
    icon: <UserCheck className="h-5 w-5" />,
    colorClass: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    barGradient: "from-sky-600 via-blue-500 to-indigo-400",
    glowClass: "shadow-[0_0_12px_rgba(14,165,233,0.25)]",
  },
  {
    key: "contacts",
    label: "Captured Leads",
    description: "Saved customers in your directory",
    icon: <BookUser className="h-5 w-5" />,
    colorClass: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    barGradient: "from-teal-600 via-emerald-500 to-cyan-400",
    glowClass: "shadow-[0_0_12px_rgba(20,184,166,0.25)]",
  },
];

// ─── Main Page Component ──────────────────────────────────────────────────────

export function UsagePage() {
  const localPlan = (authApi.getOrgPlan() || "free") as PlanTier;
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(localPlan);
  const [currentPlanDef, setCurrentPlanDef] = useState<PlanDefinition | null>(null);
  const [mode, setMode] = useState<"cloud" | "self-host">("self-host");
  const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
  const [limits, setLimits] = useState<PlanDefinition["limits"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      setIsLoading(false);
      return;
    }

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

    const loadData = async () => {
      try {
        await Promise.allSettled([loadEntitlements(), loadUsage()]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [localPlan]);

  const isSelfHost = mode === "self-host";
  const meta = planMeta[currentPlan];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-14 px-4 sm:px-6">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6 pt-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Resource Usage
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSelfHost
                ? "Self-hosted server resource capacity and environment configurations."
                : "Real-time usage metrics, quotas, and thresholds associated with your current plan."}
            </p>
          </div>
          {!isSelfHost && (
            <Button asChild variant="outline" size="sm" className="shadow-sm hover:bg-muted/80 self-start md:self-auto">
              <Link to="/dashboard/settings/billing/plans" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                Change Plans
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>

        {/* ── Active Subscription / Plan Status ── */}
        <div className={`group relative overflow-hidden rounded-3xl border border-border/80 dark:border-white/5 bg-gradient-to-br ${meta.bgGradient} bg-card/45 backdrop-blur-xl p-6 md:p-8 shadow-xl transition-all duration-300 ${meta.borderGlow}`}>
          {/* Subtle background abstract shape */}
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all duration-300 pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background border border-border/60 dark:border-white/10 shadow-sm">
                  {meta.icon}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Active Plan</span>
                  <h2 className={`text-xl md:text-2xl font-black bg-gradient-to-r ${meta.textGradient} bg-clip-text text-transparent mt-0.5`}>
                    {meta.label}
                  </h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground/90 max-w-xl">
                {isSelfHost
                  ? "Unlimited access server instance. Free and open source license deployed on your own infrastructure."
                  : (currentPlanDef?.summary ?? meta.description)}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              {isSelfHost ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  Self-hosted Instance
                </div>
              ) : (
                <div className="flex flex-col gap-1 items-start md:items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Reset Cycle</span>
                  <span className="text-sm font-semibold text-foreground">
                    {usageSnapshot ? (
                      new Date(usageSnapshot.resetsAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    ) : (
                      "Monthly cycle"
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Telemetry Monitor Counters Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              Live Telemetry Checks
            </h2>
            {usageSnapshot && !isSelfHost && (
              <span className="text-xs text-muted-foreground font-medium">
                Resets in {Math.max(0, Math.ceil((new Date(usageSnapshot.resetsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
              </span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {limitItems.map(({ key, label, description, icon, colorClass, barGradient, glowClass }) => {
              const stat = usageSnapshot?.usage[key] || { used: 0, limit: isSelfHost ? null : (limits?.[key] ?? null), pct: 0 };
              const limitVal = isSelfHost ? null : stat.limit;
              const usedVal = stat.used;
              const pct = isSelfHost ? 0 : stat.pct;

              const isOver = pct >= 100;
              const isClose = pct >= 80 && pct < 100;

              const displayPct = isSelfHost ? "—" : `${pct}%`;

              let statusBorder = "border-border/80 dark:border-white/5";
              let dynamicBarGradient = barGradient;
              let dynamicGlow = glowClass;

              if (isOver) {
                statusBorder = "border-rose-500/30 dark:border-rose-500/20 shadow-red-500/5 shadow-2xl";
                dynamicBarGradient = "from-rose-600 via-red-500 to-orange-400";
                dynamicGlow = "shadow-[0_0_12px_rgba(244,63,94,0.3)]";
              } else if (isClose) {
                statusBorder = "border-amber-500/30 dark:border-amber-500/20";
                dynamicBarGradient = "from-amber-600 via-orange-500 to-yellow-400";
                dynamicGlow = "shadow-[0_0_12px_rgba(245,158,11,0.25)]";
              }

              return (
                <div
                  key={key}
                  className={`relative overflow-hidden rounded-2xl border ${statusBorder} bg-card/45 backdrop-blur-xl p-5 hover:translate-y-[-2px] hover:shadow-lg transition-all duration-300`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                      <div className={`p-1.5 rounded-xl border ${colorClass} shadow-sm shrink-0`}>
                        {icon}
                      </div>
                      {label}
                    </span>
                    <span className={`text-xs font-black tracking-tight tabular-nums ${isOver ? "text-rose-500" : isClose ? "text-amber-500" : "text-muted-foreground/80"}`}>
                      {displayPct}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed h-8">
                    {description}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Consumption</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-foreground tabular-nums">
                          {usedVal.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          / {limitVal === null ? "∞" : limitVal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    {!isSelfHost && (
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted border border-border/30 dark:border-white/5">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${dynamicBarGradient} ${dynamicGlow}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Warning/Limit Badges */}
                  {!isSelfHost && isOver && (
                    <div className="absolute right-4 top-4 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </div>
                  )}
                  {!isSelfHost && isClose && (
                    <div className="absolute right-4 top-4 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Guidelines Section ── */}
        <div className="rounded-3xl border border-border/80 dark:border-white/5 bg-card/45 backdrop-blur-xl p-6 md:p-8 space-y-4 shadow-md">
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <InfoIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Usage Guidelines</h2>
              <p className="text-[10px] text-muted-foreground">How quotas and thresholds affect your workspace</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed text-muted-foreground/90">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20 border border-border/40 dark:border-white/5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-0.5">AI Response Interruption</h4>
                <p>If you exhaust your monthly AI message quota, the automated assistant will pause, but human agents can continue receiving and replying to chats without interruption.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20 border border-border/40 dark:border-white/5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-0.5">Hard Quotas</h4>
                <p>Limits on human agents and contact capacity are checked immediately when adding team members or creating contact records. Upgrades apply instantly.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

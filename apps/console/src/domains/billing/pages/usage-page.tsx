import { useEffect, useState } from "react";
import { Link } from "react-router";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Loader } from "@/shared/ui/loader";
import { Button } from "@/shared/ui/button";

type PlanTier = "free" | "pro" | "proplus";
type LimitKey = "messages" | "humanAgents" | "contacts";

type PlanDefinition = {
  plan: PlanTier;
  priceMonthlyUsd: number;
  summary: string;
  features: string[];
  limits: Record<LimitKey, number | null>;
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

const PLAN_META: Record<PlanTier, { label: string; description: string }> = {
  free: {
    label: "Starter",
    description: "Essential capacity for lightweight support.",
  },
  pro: {
    label: "Pro",
    description: "More automation for growing support teams.",
  },
  proplus: {
    label: "Pro Plus",
    description: "High-volume capacity and premium controls.",
  },
};

const RESOURCE_META: Array<{
  key: LimitKey;
  label: string;
  description: string;
}> = [
  {
    key: "messages",
    label: "AI messages",
    description: "Automated replies sent this billing cycle",
  },
  {
    key: "humanAgents",
    label: "Human agents",
    description: "Active teammates in this workspace",
  },
  {
    key: "contacts",
    label: "Saved contacts",
    description: "Customer profiles in your directory",
  },
];

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDate(value?: string): string {
  if (!value) return "Monthly cycle";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Monthly cycle";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDaysUntil(value?: string): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getUsageTone(percent: number) {
  if (percent >= 100) {
    return {
      label: "Limit reached",
      text: "text-destructive",
      surface: "border-destructive/25 bg-destructive/10 text-destructive",
      bar: "bg-destructive",
    };
  }
  if (percent >= 80) {
    return {
      label: "Near limit",
      text: "text-warning",
      surface: "border-warning/25 bg-warning/10 text-warning",
      bar: "bg-warning",
    };
  }
  return {
    label: "Healthy",
    text: "text-success",
    surface: "border-success/25 bg-success/10 text-success",
    bar: "bg-primary",
  };
}

interface AllocationRowProps {
  resource: (typeof RESOURCE_META)[number];
  stat: UsageStat;
  unmetered: boolean;
}

function AllocationRow({ resource, stat, unmetered }: AllocationRowProps) {
  const percent = unmetered ? 0 : clampPercent(stat.pct);
  const remaining = stat.limit === null ? null : Math.max(0, stat.limit - stat.used);
  const tone = getUsageTone(percent);

  return (
    <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(210px,1.2fr)_90px_110px_minmax(170px,1fr)] lg:items-center">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{resource.label}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{resource.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between lg:block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Used</span>
        <p className="text-sm font-semibold tabular-nums text-foreground">{formatNumber(stat.used)}</p>
      </div>

      <div className="flex items-center justify-between lg:block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Remaining</span>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {unmetered || remaining === null ? "Unlimited" : formatNumber(remaining)}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className={`font-semibold ${unmetered ? "text-primary" : tone.text}`}>
            {unmetered ? "Unmetered" : tone.label}
          </span>
          <span className="font-medium tabular-nums text-muted-foreground">{unmetered ? "∞" : `${percent}%`}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role={unmetered ? undefined : "progressbar"}
          aria-label={unmetered ? undefined : `${resource.label} usage`}
          aria-valuemin={unmetered ? undefined : 0}
          aria-valuemax={unmetered ? undefined : 100}
          aria-valuenow={unmetered ? undefined : percent}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${unmetered ? "bg-primary/30" : tone.bar}`}
            style={{ width: unmetered ? "100%" : `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

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
        const response = await apiClient.get<EntitlementsResponse>(
          `/organizations/${orgId}/billing/entitlements`,
        );
        const data = response.data;
        if (!data) return;
        const plan = data.currentPlan || localPlan;
        setCurrentPlan(plan);
        setMode(data.entitlements?.mode || "self-host");
        setLimits(data.entitlements?.limits || null);
        setCurrentPlanDef(data.plans?.find((item) => item.plan === plan) || null);
      } catch {
        // Preserve self-hosted fallback if entitlement data is unavailable.
      }
    };

    const loadUsage = async () => {
      try {
        const response = await apiClient.get<UsageResponse>(`/organizations/${orgId}/billing/usage`);
        if (response.data) setUsageSnapshot(response.data);
      } catch {
        // The entitlement allocation can still render without live usage.
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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <Loader size="md" />
      </div>
    );
  }

  const isSelfHost = mode === "self-host";
  const planMeta = PLAN_META[currentPlan];
  const daysUntilReset = getDaysUntil(usageSnapshot?.resetsAt);
  const resourceStats = RESOURCE_META.map((resource) => {
    const snapshotStat = usageSnapshot?.usage[resource.key];
    return {
      resource,
      stat: snapshotStat || {
        used: 0,
        limit: isSelfHost ? null : (limits?.[resource.key] ?? null),
        pct: 0,
      },
    };
  });
  const messageStat = resourceStats[0].stat;
  const messagePercent = isSelfHost ? 0 : clampPercent(messageStat.pct);
  const messageRemaining = messageStat.limit === null ? null : Math.max(0, messageStat.limit - messageStat.used);
  const highestUsage = isSelfHost
    ? 0
    : Math.min(100, Math.max(0, ...resourceStats.map(({ stat }) => stat.pct)));
  const overallTone = getUsageTone(highestUsage);

  return (
    <div className="w-full px-4 pb-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-border/60 pb-6 pt-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="h-px w-5 bg-primary/60" />
              Workspace capacity
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Resource Usage</h1>
            <p className="mt-2 text-sm text-muted-foreground">Understand what your workspace is using and what remains.</p>
          </div>
          {!isSelfHost && (
            <Button asChild className="h-9 self-start px-4 shadow-sm sm:self-auto">
              <Link to="/dashboard/settings/billing/plans">
                Manage plan
              </Link>
            </Button>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:col-span-8">
            <div className="flex flex-col gap-8 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">AI message usage</div>
                  <p className="mt-2 text-xs text-muted-foreground">Automated replies sent during the current billing period.</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 pt-0.5 text-[10px] font-semibold ${
                  isSelfHost ? "text-primary" : overallTone.text
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelfHost ? "bg-primary" : highestUsage >= 100 ? "bg-destructive" : highestUsage >= 80 ? "bg-warning" : "bg-success"}`} />
                  {isSelfHost ? "No usage limit" : overallTone.label}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl">
                    {formatNumber(messageStat.used)}
                  </span>
                  <span className="pb-2 text-sm text-muted-foreground">
                    {isSelfHost || messageStat.limit === null ? "messages this cycle" : `of ${formatNumber(messageStat.limit)} messages`}
                  </span>
                </div>

                <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${
                      isSelfHost ? "bg-primary/30" : getUsageTone(messagePercent).bar
                    }`}
                    style={{ width: isSelfHost ? "100%" : `${messagePercent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {isSelfHost || messageRemaining === null
                      ? "No platform-enforced limit"
                      : `${formatNumber(messageRemaining)} messages remaining`}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{isSelfHost ? "∞" : `${messagePercent}% used`}</span>
                </div>
              </div>
            </div>

            <div className="grid border-t border-border/60 bg-muted/25 sm:grid-cols-3">
              {[
                ["Cycle", usageSnapshot?.period || "Current month"],
                ["Resets", isSelfHost ? "No reset" : formatDate(usageSnapshot?.resetsAt)],
                ["Status", isSelfHost ? "Unmetered" : overallTone.label],
              ].map(([label, value], index) => (
                <div key={label} className={`px-6 py-4 ${index > 0 ? "border-t border-border/60 sm:border-l sm:border-t-0" : ""}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <p className="mt-1.5 text-xs font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:col-span-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {isSelfHost ? "Deployment" : "Current plan"}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> In good standing
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{isSelfHost ? "Self-hosted" : planMeta.label}</h2>
                {!isSelfHost && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ${currentPlanDef?.priceMonthlyUsd ?? 0} USD / month
                  </p>
                )}
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              {isSelfHost
                ? "Your workspace runs on private infrastructure with no InteraOne usage caps."
                : (currentPlanDef?.summary || planMeta.description)}
            </p>

            <div className="mt-6 space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Next reset</span>
                <span className="font-semibold text-foreground">{isSelfHost ? "Not applicable" : formatDate(usageSnapshot?.resetsAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-semibold text-foreground">{isSelfHost ? "Unlimited" : `${highestUsage}% peak`}</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              {isSelfHost ? (
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-center text-[11px] font-medium text-primary">
                  No platform quotas
                </div>
              ) : (
                <Button asChild variant="outline" className="h-9 w-full">
                  <Link to="/dashboard/settings/billing/plans">View plan details</Link>
                </Button>
              )}
            </div>
          </aside>
        </div>

        {!isSelfHost && highestUsage >= 80 && (
          <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${overallTone.surface}`}>
            <div className="flex items-start gap-2.5">
              <p className="text-xs leading-5">
                <strong>{highestUsage >= 100 ? "A workspace limit has been reached." : "Your workspace is approaching a plan limit."}</strong>{" "}
                Compare plans before capacity affects your workflow.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0 border-current bg-card/80">
              <Link to="/dashboard/settings/billing/plans">Compare plans</Link>
            </Button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Resource allocation</h2>
              <p className="mt-1 text-xs text-muted-foreground">Detailed capacity across your workspace.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {isSelfHost ? "Live · unmetered" : `Resets in ${daysUntilReset ?? "—"} days`}
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(210px,1.2fr)_90px_110px_minmax(170px,1fr)] border-b border-border/60 bg-muted/25 px-6 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid">
            <span>Resource</span>
            <span>Used</span>
            <span>Remaining</span>
            <span>Utilization</span>
          </div>

          <div className="divide-y divide-border/60">
            {resourceStats.map(({ resource, stat }) => (
              <AllocationRow key={resource.key} resource={resource} stat={stat} unmetered={isSelfHost} />
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm md:grid-cols-2">
          <div className="p-5 sm:px-6">
            <div>
              <h3 className="text-xs font-semibold text-foreground">When AI messages run out</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Automation pauses, while human agents can continue replying to conversations.</p>
            </div>
          </div>
          <div className="border-t border-border/60 p-5 sm:px-6 md:border-l md:border-t-0">
            <div>
              <h3 className="text-xs font-semibold text-foreground">Agent and contact capacity</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Limits are checked when records are added; upgrades unlock capacity after activation.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

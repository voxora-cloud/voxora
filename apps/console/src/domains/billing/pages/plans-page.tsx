import { useEffect, useState } from "react";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Loader } from "@/shared/ui/loader";
import { Button } from "@/shared/ui/button";

type BillingPortalResponse = {
  success: boolean;
  message: string;
  data?: { url: string; provider?: string };
};

type PlanTier = "free" | "pro" | "proplus";
type PaidPlan = Exclude<PlanTier, "free">;

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


const FALLBACK_PLANS: PlanDefinition[] = [
  {
    plan: "free",
    priceMonthlyUsd: 0,
    summary: "For exploring InteraOne and running a lightweight support workflow.",
    features: ["Everything in OSS core", "InteraOne branding", "Community support"],
    limits: { messages: 50, humanAgents: 1, contacts: 10 },
  },
  {
    plan: "pro",
    priceMonthlyUsd: 9,
    summary: "For growing teams ready to automate more customer conversations.",
    features: ["InteraOne branding", "Standard email support", "Advanced analytics", "API access"],
    limits: { messages: 500, humanAgents: 2, contacts: 500 },
  },
  {
    plan: "proplus",
    priceMonthlyUsd: 39,
    summary: "For established teams that need volume, control, and premium support.",
    features: [
      "Everything in Pro",
      "Remove InteraOne branding",
      "Priority email & chat support",
      "Custom integrations & webhooks",
      "SLA guarantee",
    ],
    limits: { messages: 5000, humanAgents: 10, contacts: 10000 },
  },
];

const PLAN_META: Record<PlanTier, { label: string; eyebrow: string }> = {
  free: { label: "Starter", eyebrow: "For getting started" },
  pro: { label: "Pro", eyebrow: "For growing support teams" },
  proplus: { label: "Pro Plus", eyebrow: "For scaling operations" },
};

const LIMIT_ITEMS: Array<{
  key: keyof PlanDefinition["limits"];
  label: string;
}> = [
  { key: "messages", label: "AI messages / month" },
  { key: "humanAgents", label: "Human agents" },
  { key: "contacts", label: "Saved contacts" },
];

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString();
}


function PlanMark({ plan }: { plan: PlanTier }) {
  const barSets: Record<PlanTier, Array<{ x: number; y: number; height: number }>> = {
    free: [
      { x: 18, y: 24, height: 17 },
      { x: 28, y: 16, height: 25 },
      { x: 38, y: 24, height: 17 },
    ],
    pro: [
      { x: 8, y: 29, height: 12 },
      { x: 18, y: 21, height: 20 },
      { x: 28, y: 12, height: 29 },
      { x: 38, y: 21, height: 20 },
      { x: 48, y: 29, height: 12 },
    ],
    proplus: [
      { x: 4, y: 31, height: 10 },
      { x: 12, y: 25, height: 16 },
      { x: 20, y: 17, height: 24 },
      { x: 28, y: 9, height: 32 },
      { x: 36, y: 17, height: 24 },
      { x: 44, y: 25, height: 16 },
      { x: 52, y: 31, height: 10 },
    ],
  };
  const dotSets: Record<PlanTier, number[]> = {
    free: [24, 36],
    pro: [20, 30, 40],
    proplus: [14, 22, 30, 38, 46],
  };

  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12 overflow-visible text-foreground"
      viewBox="0 0 60 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {barSets[plan].map((bar, index) => (
        <rect
          key={`${plan}-bar-${bar.x}`}
          x={bar.x}
          y={bar.y}
          width="3.5"
          height={bar.height}
          rx="1.75"
          className={plan === "proplus" && index === 3 ? "fill-primary" : "fill-current"}
        />
      ))}
      {dotSets[plan].map((cx, index) => (
        <circle
          key={`${plan}-dot-${cx}`}
          cx={cx}
          cy="48"
          r="2"
          className={plan === "proplus" && index % 2 === 1 ? "fill-primary" : "fill-current"}
        />
      ))}
    </svg>
  );
}

function SelfHostedView() {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary px-6 py-7 text-primary-foreground sm:px-8 sm:py-9">
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
              Deployment active
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Self-hosted, fully in your control.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/75">
              Your open-source core is active on private infrastructure with no platform billing or metered usage.
            </p>
          </div>
          <div className="min-w-44 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">Current cost</p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-semibold tracking-tight">$0</span>
              <span className="pb-1 text-xs text-primary-foreground/60">platform fee</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Core features", "Unlocked"],
          ["Usage limits", "Unmetered"],
          ["Data hosting", "Your infrastructure"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-base font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Need enterprise controls?</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add white-labeling, custom SSO, audit logs, priority SLAs, and implementation support to your deployment.
            </p>
          </div>
        </div>
        <Button asChild className="h-9 shrink-0 px-4 shadow-sm">
          <a href="mailto:sales@InteraOne.cloud?subject=InteraOne%20EE%20Self-hosted%20License">
            Talk to sales
          </a>
        </Button>
      </section>
    </div>
  );
}

interface PlanCardProps {
  plan: PlanDefinition;
  canBuy: boolean;
  loading: boolean;
  selectedPlan: PaidPlan;
  isCurrentPlan: boolean;
  onUpgrade: (plan: PaidPlan) => void;
}

function PlanCard({ plan, canBuy, loading, selectedPlan, isCurrentPlan, onUpgrade }: PlanCardProps) {
  const meta = PLAN_META[plan.plan];
  const isFeatured = plan.plan === "pro";
  const isThisPlanLoading = loading && selectedPlan === plan.plan;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors duration-200 ${
        isFeatured ? "border-primary/50 ring-1 ring-primary/15" : "border-border/70"
      }`}
    >
      {isFeatured && <div className="h-1 w-full bg-primary" />}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <PlanMark plan={plan.plan} />
          {isCurrentPlan && (
            <span className="inline-flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Your plan
            </span>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">{meta.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.eyebrow}</p>
        </div>

        <div className="mt-7 flex items-end gap-1.5">
          <span className="text-4xl font-semibold tracking-[-0.04em] text-foreground">${plan.priceMonthlyUsd}</span>
          <span className="pb-1 text-xs text-muted-foreground">USD / month</span>
        </div>
        <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{plan.summary}</p>

        <div className="my-5 grid grid-cols-3 divide-x divide-border/70 rounded-xl border border-border/70 bg-muted/45 py-3">
          {LIMIT_ITEMS.map(({ key, label }) => (
            <div key={key} className="px-2 text-center">
              <p className="text-xs font-semibold text-foreground">{formatLimit(plan.limits[key])}</p>
              <p className="mt-0.5 text-[9px] leading-3 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>



        <div className="mt-6">
          {isCurrentPlan ? (
            <Button variant="outline" className="h-10 w-full" disabled>
              Your current plan
            </Button>
          ) : plan.plan === "free" ? (
            <Button variant="outline" className="h-10 w-full" disabled>
              Included by default
            </Button>
          ) : (
            <Button
              variant={isFeatured ? "default" : "outline"}
              className={`h-10 w-full cursor-pointer ${isFeatured ? "shadow-md shadow-primary/15" : "border-primary text-primary hover:bg-accent"}`}
              disabled={!canBuy || loading}
              onClick={() => canBuy && onUpgrade(plan.plan as PaidPlan)}
            >
              {isThisPlanLoading ? (
                "Opening checkout…"
              ) : (
                `Choose ${meta.label}`
              )}
            </Button>
          )}
          <p className="mt-2.5 text-center text-[10px] text-muted-foreground">Monthly billing · Cancel anytime</p>
        </div>
      </div>

      {!canBuy && !isCurrentPlan && plan.plan !== "free" && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-lg border border-warning/25 bg-card/95 px-3 py-2 text-[10px] font-semibold text-warning shadow-sm backdrop-blur">
          Enterprise module required
        </div>
      )}
    </article>
  );
}

export function PlansPage() {
  const localPlan = (authApi.getOrgPlan() || "free") as PlanTier;
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(localPlan);
  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [mode, setMode] = useState<"cloud" | "self-host">("self-host");
  const [eeAvailable, setEeAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("pro");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEntitlements, setIsLoadingEntitlements] = useState(true);

  useEffect(() => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      setIsLoadingEntitlements(false);
      return;
    }

    const loadEntitlements = async () => {
      try {
        const res = await apiClient.get<EntitlementsResponse>(
          `/organizations/${orgId}/billing/entitlements?t=${Date.now()}`
        );
        const data = res.data;
        if (!data) return;
        setCurrentPlan(data.currentPlan || localPlan);
        setPlans(data.plans?.length ? data.plans : FALLBACK_PLANS);
        setMode(data.entitlements?.mode || "self-host");
        setEeAvailable(Boolean(data.entitlements?.ee?.isAvailable));
      } catch {
        // Keep the safe self-hosted fallback when billing services are unavailable.
      } finally {
        setIsLoadingEntitlements(false);
      }
    };

    void loadEntitlements();
  }, [localPlan]);

  const openBillingPortal = async (plan: PaidPlan) => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      setError("We couldn’t find an active organization for this account.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedPlan(plan);
    try {
      const response = await apiClient.get<BillingPortalResponse>(
        `/organizations/${orgId}/billing/portal?targetPlan=${plan}`,
      );
      const url = response.data?.url;
      if (url) window.location.href = url;
      else setError("Checkout is temporarily unavailable. Please try again in a moment.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingEntitlements) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <Loader size="md" />
      </div>
    );
  }

  const isSelfHost = mode === "self-host";
  const canBuy = !isSelfHost && eeAvailable;
  const order: PlanTier[] = ["free", "pro", "proplus"];
  const sortedPlans = plans.slice().sort((a, b) => order.indexOf(a.plan) - order.indexOf(b.plan));
  const activePlan = sortedPlans.find((plan) => plan.plan === currentPlan);

  return (
    <div className="w-full px-4 pb-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-7">
        <header className="flex flex-col gap-5 border-b border-border/60 pb-6 pt-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="h-px w-5 bg-primary/60" />
              Workspace billing
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Plans &amp; Billing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isSelfHost
                ? "Your deployment, license access, and enterprise upgrade options in one place."
                : "Simple monthly pricing that grows with your customer support operation."}
            </p>
          </div>
          {!isSelfHost && (
            <div className="flex items-center gap-2 self-start text-[11px] font-medium text-muted-foreground sm:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Payments are securely processed
            </div>
          )}
        </header>

        {isSelfHost ? (
          <SelfHostedView />
        ) : (
          <>
            <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Current subscription</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{PLAN_META[currentPlan].label}</h2>
                    {currentPlan !== "free" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 cursor-pointer px-2.5 text-[11px] font-medium"
                        onClick={() => openBillingPortal(currentPlan)}
                        disabled={loading}
                      >
                        {loading && selectedPlan === currentPlan ? "Loading…" : "Manage Subscription"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  ${activePlan?.priceMonthlyUsd ?? 0}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">USD / month</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Billed monthly · Cancel anytime</p>
              </div>
            </section>

            <section>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Choose the right plan</h2>
                  <p className="mt-1 text-sm text-muted-foreground">All prices are in USD. Upgrade whenever your team is ready.</p>
                </div>
                <span className="self-start rounded-lg border border-border/70 bg-muted/50 px-3 py-1.5 text-[11px] font-semibold text-foreground">
                  Monthly billing
                </span>
              </div>

              {!eeAvailable && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
                  <span><strong>Plan upgrades are currently locked.</strong> The Enterprise Edition billing module is not available on this deployment.</span>
                </div>
              )}

              <div className="grid items-stretch gap-4 md:grid-cols-3">
                {sortedPlans.map((plan) => (
                  <PlanCard
                    key={plan.plan}
                    plan={plan}
                    canBuy={canBuy}
                    loading={loading}
                    selectedPlan={selectedPlan}
                    isCurrentPlan={plan.plan === currentPlan}
                    onUpgrade={openBillingPortal}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {error && (
          <div role="alert" className="mx-auto flex max-w-2xl items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-xs leading-5 text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

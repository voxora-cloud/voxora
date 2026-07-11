import { useEffect, useState } from "react";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Loader } from "@/shared/ui/loader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/shared/ui/card";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Star,
  ServerIcon,
  LockIcon,
  InfoIcon,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Loader2,
  MessageSquare,
  UserCheck,
  BookUser,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingPortalResponse = {
  success: boolean;
  message: string;
  data?: { url: string; provider?: string };
};

type PlanTier = "free" | "pro" | "proplus";
type PaidPlan = "pro" | "proplus";

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
      eeFeatures: {
        billing?: { enabled: boolean; requiredPlan: PlanTier };
        contacts?: { enabled: boolean; requiredPlan: PlanTier };
        "white-label"?: { enabled: boolean; requiredPlan: PlanTier };
      };
      limits: PlanDefinition["limits"];
    };
  };
};

// ─── Static data ──────────────────────────────────────────────────────────────

const FALLBACK_PLANS: PlanDefinition[] = [
  {
    plan: "free",
    priceMonthlyUsd: 0,
    summary: "Starter plan for small support workflows.",
    features: ["Everything in OSS core", "InteraOne branding", "Community support"],
    limits: { messages: 50, humanAgents: 1, contacts: 10 },
  },
  {
    plan: "pro",
    priceMonthlyUsd: 9,
    summary: "Built for growing support teams.",
    features: ["InteraOne branding", "Standard email support", "Advanced analytics", "API access"],
    limits: { messages: 500, humanAgents: 2, contacts: 500 },
  },
  {
    plan: "proplus",
    priceMonthlyUsd: 39,
    summary: "High-volume plan for fast scaling teams.",
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

const formatLimit = (value: number | null): string => {
  if (value === null) return "Unlimited";
  return value.toLocaleString();
};

const planMeta: Record<PlanTier, { icon: React.ReactNode }> = {
  free: { icon: <Star className="h-4 w-4 text-muted-foreground" /> },
  pro: { icon: <Zap className="h-4 w-4 text-primary" /> },
  proplus: { icon: <Crown className="h-4 w-4 text-primary animate-pulse" /> },
};

const planDisplayName: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  proplus: "Pro+",
};

const limitItems: {
  key: "messages" | "humanAgents" | "contacts";
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "messages", label: "Messages/month", icon: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> },
  { key: "humanAgents", label: "Human agents", icon: <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> },
  { key: "contacts", label: "Contacts", icon: <BookUser className="h-3.5 w-3.5 text-muted-foreground" /> },
];

// ─── Self-hosted banner ───────────────────────────────────────────────────────

function SelfHostedBanner() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/40 shadow-inner">
            <ServerIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Self-Hosted Deployment
              </h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                Active &amp; Unlimited
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
              You are running on your own private infrastructure. All open-source core features are unlocked and fully active without any billing restrictions or limits.
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Need Enterprise Grade compliance &amp; white-labeling?
            </p>
            <p className="text-xs text-muted-foreground max-w-xl">
              Unlock proprietary modules like complete white-label custom widgets, priority SLAs, custom SSO integrations, and advanced auditing logs on your self-hosted instance.
            </p>
          </div>
          <a
            href="mailto:sales@InteraOne.cloud?subject=InteraOne%20EE%20Self-hosted%20License"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Contact sales
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Plan card (cloud) ────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanDefinition;
  isPopular: boolean;
  canBuy: boolean;
  loading: boolean;
  selectedPlan: PaidPlan;
  onUpgrade: (plan: PaidPlan) => void;
}

function PlanCard({ plan, isPopular, canBuy, loading, selectedPlan, onUpgrade }: PlanCardProps) {
  const meta = planMeta[plan.plan];
  const isUpgradeable = plan.plan === "pro" || plan.plan === "proplus";

  return (
    <div className="relative flex flex-col group">
      {isPopular && (
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
            Most Popular
          </span>
        </div>
      )}

      <Card
        className={`relative flex flex-col h-full bg-card/60 backdrop-blur-xl border border-border transition-all duration-300 ${
          !canBuy
            ? "opacity-60 grayscale-[10%]"
            : isPopular
              ? "ring-1 ring-primary/40 shadow-md hover:shadow-lg hover:border-primary/50"
              : "hover:shadow-sm hover:border-primary/20"
        }`}
      >
        {/* locked overlay */}
        {!canBuy && (
          <div className="absolute inset-0 bg-background/5 backdrop-blur-[1px] rounded-xl z-10 flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-1.5 rounded-lg border bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <LockIcon className="h-3.5 w-3.5 text-amber-500" />
              EE License Required
            </div>
          </div>
        )}

        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-primary/5 border border-border/40">
                {meta.icon}
              </span>
              <span>{planDisplayName[plan.plan]}</span>
            </div>
            {plan.plan !== "free" && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                Premium
              </span>
            )}
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight">${plan.priceMonthlyUsd}</span>
            <span className="text-xs font-medium text-muted-foreground">/ month</span>
          </div>
          <CardDescription className="text-xs pt-1.5 leading-relaxed min-h-[40px]">
            {plan.summary}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-6 pt-0 px-6 pb-6">
          <div className="border-t border-border/60" />

          {/* Features list */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Key Features
            </p>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={`${plan.plan}-${feature}`} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-tight">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border/60" />

          {/* Plan Limits block */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Limits Included
            </p>
            <div className="grid grid-cols-1 gap-2">
              {limitItems.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-muted/40 border px-3 py-2">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/75">{icon}</span>
                    {label}
                  </span>
                  <span className="text-xs font-bold text-foreground">{formatLimit(plan.limits[key])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="mt-auto pt-4">
            {isUpgradeable && (
              <Button
                onClick={() => canBuy && onUpgrade(plan.plan as PaidPlan)}
                className={`group w-full py-5 rounded-lg font-semibold text-xs tracking-wide transition-all duration-200 ${
                  canBuy ? "cursor-pointer" : "cursor-not-allowed"
                } ${plan.plan === "proplus" ? "bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20" : "bg-primary hover:bg-primary/95 text-primary-foreground"}`}
                variant={plan.plan === "proplus" ? "outline" : "default"}
                disabled={!canBuy || loading}
              >
                {loading && selectedPlan === plan.plan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to secure gateway…
                  </>
                ) : (
                  <>
                    Upgrade to {planDisplayName[plan.plan]}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

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
          `/organizations/${orgId}/billing/entitlements`
        );
        const data = res.data;
        if (!data) return;
        setCurrentPlan(data.currentPlan || localPlan);
        setPlans(data.plans?.length ? data.plans : FALLBACK_PLANS);
        setMode(data.entitlements?.mode || "self-host");
        setEeAvailable(Boolean(data.entitlements?.ee?.isAvailable));
      } catch {
        // Keep fallback values when entitlements endpoint is unavailable.
      } finally {
        setIsLoadingEntitlements(false);
      }
    };

    void loadEntitlements();
  }, [localPlan]);

  const openBillingPortal = async (plan: PaidPlan) => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      setError("Organization not found");
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedPlan(plan);
    try {
      const res = await apiClient.get<BillingPortalResponse>(
        `/organizations/${orgId}/billing/portal?targetPlan=${plan}`
      );
      const url = res.data?.url || null;
      if (url) window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const isSelfHost = mode === "self-host";
  const canBuy = !isSelfHost && eeAvailable;

  const order: PlanTier[] = ["free", "pro", "proplus"];
  const allSortedPlans = plans
    .slice()
    .sort((a, b) => order.indexOf(a.plan) - order.indexOf(b.plan));

  const plansForGrid = isSelfHost
    ? []
    : allSortedPlans.filter((p) => p.plan !== currentPlan);

  if (isLoadingEntitlements) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-10">
      <div className="w-full max-w-4xl space-y-8">
        {/* Page header */}
        <div className="text-center space-y-1.5 pt-2">
          <h1 className="text-2xl font-bold text-foreground">Plans &amp; Billing</h1>
          <p className="text-sm text-muted-foreground">
            {isSelfHost
              ? "Your organization is self-hosted. All core features are unrestricted."
              : "Select a billing plan to unlock advanced routing and platform features."}
          </p>
        </div>

        {/* Self-hosted banner */}
        {isSelfHost && <SelfHostedBanner />}

        {/* Available Plans Grid — centered */}
        {!isSelfHost && plansForGrid.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="text-sm font-semibold text-foreground">Available Plans</h2>
              <p className="text-xs text-muted-foreground">Choose a plan that fits your business scale</p>
              {!eeAvailable && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <LockIcon className="h-3.5 w-3.5" />
                  Upgrades Locked — EE module unavailable
                </span>
              )}
            </div>

            <div
              className={`mx-auto grid gap-6 ${
                plansForGrid.length === 1
                  ? "max-w-sm grid-cols-1"
                  : plansForGrid.length === 2
                    ? "max-w-2xl sm:grid-cols-2"
                    : "max-w-4xl sm:grid-cols-3"
              }`}
            >
              {plansForGrid.map((plan) => (
                <PlanCard
                  key={plan.plan}
                  plan={plan}
                  isPopular={plan.plan === "pro" && currentPlan === "free"}
                  canBuy={canBuy}
                  loading={loading}
                  selectedPlan={selectedPlan}
                  onUpgrade={openBillingPortal}
                />
              ))}
            </div>

            {!eeAvailable && (
              <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
                <InfoIcon className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  <strong>Enterprise Edition module not detected.</strong> Paid plans and portal upgrades require
                  the EE core module to be compiled and active on the deploy server. Contact support or check configurations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-xs text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import { Loader } from "@/shared/ui/loader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/shared/ui/card";
import {
  Check,
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

const ALL_COMPARE_FEATURES = [
  "Everything in OSS core",
  "API access",
  "Advanced analytics",
  "Standard email support",
  "Remove InteraOne branding",
  "Priority email & chat support",
  "Custom integrations & webhooks",
  "SLA guarantee"
];

function hasFeature(planTier: PlanTier, feature: string): boolean {
  if (feature === "Everything in OSS core") return true;
  if (planTier === "free") {
    return false;
  }
  if (planTier === "pro") {
    return ["API access", "Advanced analytics", "Standard email support"].includes(feature);
  }
  if (planTier === "proplus") {
    return true; // ProPlus has everything
  }
  return false;
}


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

const planMeta: Record<
  PlanTier,
  {
    icon: React.ReactNode;
    label: string;
    badgeBg: string;
  }
> = {
  free: {
    icon: <Star className="h-4 w-4" />,
    label: "Free Starter",
    badgeBg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
  },
  pro: {
    icon: <Zap className="h-4 w-4 animate-pulse" />,
    label: "Pro",
    badgeBg: "bg-primary/10 text-primary border-primary/20",
  },
  proplus: {
    icon: <Crown className="h-4 w-4" />,
    label: "ProPlus",
    badgeBg: "bg-primary/10 text-primary border-primary/20",
  },
};

const limitItems: {
  key: "messages" | "humanAgents" | "contacts";
  label: string;
  icon: React.ReactNode;
}[] = [
    { key: "messages", label: "AI messages", icon: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> },
    { key: "humanAgents", label: "Human agents", icon: <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> },
    { key: "contacts", label: "Database contacts", icon: <BookUser className="h-3.5 w-3.5 text-muted-foreground" /> },
  ];

// ─── Self-hosted banner ───────────────────────────────────────────────────────

function SelfHostedBanner() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/65 backdrop-blur-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-border/40 shadow-inner">
            <ServerIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Self-Hosted Deployment
              </h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5">
                Active &amp; Unlimited
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
              You are running on your own private infrastructure. All open-source core features are unlocked and fully active without any billing restrictions or limits.
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              Need Enterprise Grade compliance &amp; white-labeling?
            </p>
            <p className="text-xs text-muted-foreground max-w-xl">
              Unlock proprietary modules like complete white-label custom widgets, priority SLAs, custom SSO integrations, and advanced auditing logs on your self-hosted instance.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 font-bold shadow-sm hover:opacity-95 transition-all duration-200">
            <a href="mailto:sales@InteraOne.cloud?subject=InteraOne%20EE%20Self-hosted%20License">
              Contact sales
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan card (cloud) ────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanDefinition;
  canBuy: boolean;
  loading: boolean;
  selectedPlan: PaidPlan;
  onUpgrade: (plan: PaidPlan) => void;
  isCurrentPlan: boolean;
}

function PlanCard({ plan, canBuy, loading, selectedPlan, onUpgrade, isCurrentPlan }: PlanCardProps) {
  const meta = planMeta[plan.plan];
  const isFeatured = plan.plan === "pro";

  // Hostinger pricing layouts
  const originalPrice = plan.plan === "pro" ? 49 : plan.plan === "proplus" ? 99 : null;
  const discountLabel = plan.plan === "pro" ? "Special offer • 80% off" : plan.plan === "proplus" ? "Save 60%" : "Free Forever";

  return (
    <div className="relative flex flex-col group h-full">
      {/* Absolute top-right discount badge */}
      <div className="absolute top-4 right-4 z-20">
        <span className="bg-[#ffb800] text-zinc-950 font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded shadow-sm">
          {discountLabel}
        </span>
      </div>

      <Card
        className={`relative flex flex-col h-full rounded-[24px] border transition-all duration-300 ${isCurrentPlan
          ? "border-primary/60 ring-1 ring-primary/20 bg-primary/[0.01]"
          : !canBuy
            ? "opacity-60 grayscale-[10%]"
            : isFeatured
              ? "bg-[#0f0c29] border-[#292262] text-white shadow-2xl hover:scale-[1.01]"
              : "bg-white dark:bg-[#0c0d12] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-md hover:shadow-xl hover:scale-[1.01]"
          }`}
      >
        {/* locked overlay */}
        {!canBuy && !isCurrentPlan && (
          <div className="absolute inset-0 bg-background/5 backdrop-blur-[1.5px] rounded-[24px] z-10 flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-1.5 rounded-xl border bg-card/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <LockIcon className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              EE License Required
            </div>
          </div>
        )}

        <CardHeader className="pb-3 pt-6 px-6">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg border ${isFeatured ? "bg-white/10 border-white/15 text-white" : "bg-primary/5 border-border/60 text-primary"}`}>
              {meta.icon}
            </span>
            <span className={`text-base font-extrabold tracking-tight ${isFeatured ? "text-white" : "text-zinc-900 dark:text-white"}`}>
              {meta.label}
            </span>
          </div>

          <div className="mt-5">
            {originalPrice && (
              <p className="text-[11px] line-through text-zinc-400 dark:text-zinc-500 font-semibold mb-0.5">
                ${originalPrice}
              </p>
            )}
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black tracking-tight ${isFeatured ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                ${plan.priceMonthlyUsd}
              </span>
              <span className={`text-xs ${isFeatured ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"}`}>/mo</span>
            </div>
          </div>

          <CardDescription className={`text-xs pt-2.5 leading-relaxed min-h-[42px] ${isFeatured ? "text-zinc-400" : "text-muted-foreground/90"}`}>
            {plan.summary}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col pt-0 px-6 pb-6">
          {/* Action button */}
          <div className="pt-2 pb-4">
            {isCurrentPlan ? (
              <Button
                className={`w-full py-5 rounded-xl font-bold text-xs tracking-wider cursor-not-allowed shadow-none border-2 ${isFeatured
                  ? "bg-primary/50 border-none text-white/80"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 bg-transparent"
                  }`}
                variant="outline"
                disabled
              >
                Your Current Plan
              </Button>
            ) : plan.plan === "free" ? (
              <Button
                className="w-full py-5 rounded-xl font-bold text-xs tracking-wider border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 bg-transparent cursor-not-allowed"
                variant="outline"
                disabled
              >
                Choose plan
              </Button>
            ) : (
              <Button
                onClick={() => canBuy && onUpgrade(plan.plan as PaidPlan)}
                className={`w-full py-5 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 ${canBuy ? "cursor-pointer" : "cursor-not-allowed"
                  } ${isFeatured
                    ? "bg-primary hover:bg-primary/95 text-primary-foreground border-none shadow-lg shadow-primary/10"
                    : "border-2 border-primary text-primary hover:bg-primary/5 bg-transparent"
                  }`}
                variant={isFeatured ? "default" : "outline"}
                disabled={!canBuy || loading}
              >
                {loading && selectedPlan === plan.plan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    Choose plan
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
            <p className={`text-[10px] text-center mt-2.5 ${isFeatured ? "text-zinc-500" : "text-muted-foreground/60"}`}>
              Billed monthly. Cancel anytime.
            </p>
          </div>

          <div className={`border-t ${isFeatured ? "border-white/10" : "border-zinc-100 dark:border-zinc-800"} my-4`} />

          {/* Compare checklist matching Hostinger style */}
          <div className="space-y-3 flex-1">
            <ul className="space-y-2.5">
              {ALL_COMPARE_FEATURES.map((feature) => {
                const included = hasFeature(plan.plan, feature);
                return (
                  <li key={`${plan.plan}-${feature}`} className="flex items-center gap-2.5 text-xs">
                    {included ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className={`leading-tight ${isFeatured ? "text-zinc-200" : "text-zinc-700 dark:text-zinc-300"}`}>
                          {feature}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`h-4 w-4 flex items-center justify-center text-xs shrink-0 font-bold ${isFeatured ? "text-zinc-600" : "text-zinc-300 dark:text-zinc-700"}`}>
                          —
                        </span>
                        <span className={`leading-tight line-through ${isFeatured ? "text-zinc-600" : "text-zinc-400 dark:text-zinc-600"}`}>
                          {feature}
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={`border-t ${isFeatured ? "border-white/10" : "border-zinc-100 dark:border-zinc-800"} my-4`} />

          {/* Limits block layout */}
          <div className="space-y-3 pt-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isFeatured ? "text-zinc-400" : "text-muted-foreground/60"}`}>
              Limits Included:
            </p>
            <ul className="space-y-2.5">
              {limitItems.map(({ key, label, icon }) => (
                <li key={key} className="flex items-center gap-2.5 text-xs">
                  <span className={`h-4.5 w-4.5 flex items-center justify-center shrink-0 ${isFeatured ? "text-zinc-400" : "text-muted-foreground/75"}`}>
                    {icon}
                  </span>
                  <span className={`leading-tight ${isFeatured ? "text-zinc-200" : "text-zinc-700 dark:text-zinc-300"}`}>
                    <strong>{formatLimit(plan.limits[key])}</strong> {label}
                  </span>
                </li>
              ))}
            </ul>
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
          `/organizations/${orgId}/billing/entitlements?t=${Date.now()}`
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

  const plansForGrid = isSelfHost ? [] : allSortedPlans;

  if (isLoadingEntitlements) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-14 px-4 sm:px-6">
      <div className="w-full max-w-4xl space-y-8">

        {/* Page header */}
        <div className="flex flex-col items-center gap-1.5 border-b border-border/50 pb-6 pt-2 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Plans &amp; Billing
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSelfHost
              ? "Your organization is self-hosted. All core features are unrestricted."
              : "Select a billing plan to unlock advanced routing, increased thresholds, and premium platform features."}
          </p>
        </div>

        {/* Self-hosted banner */}
        {isSelfHost && <SelfHostedBanner />}

        {/* Available Plans Grid — centered */}
        {!isSelfHost && plansForGrid.length > 0 && (
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Available Plans</h2>
              <p className="text-xs text-muted-foreground">Choose a plan that fits your business scale</p>
              {!eeAvailable && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <LockIcon className="h-3.5 w-3.5 animate-pulse" />
                  Upgrades Locked — Enterprise Edition module unavailable
                </span>
              )}
            </div>

            <div
              className={`mx-auto grid gap-6 ${plansForGrid.length === 1
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
                  canBuy={canBuy}
                  loading={loading}
                  selectedPlan={selectedPlan}
                  onUpgrade={openBillingPortal}
                  isCurrentPlan={plan.plan === currentPlan}
                />
              ))}
            </div>

            {!eeAvailable && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
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
          <div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-xs text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

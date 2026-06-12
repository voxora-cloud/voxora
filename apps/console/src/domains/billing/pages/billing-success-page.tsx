import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Sparkles, ArrowRight, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { apiClient } from "@/shared/lib/api-client";
import { authApi } from "@/domains/auth/api/auth.api";
import { useAuthStore } from "@/domains/auth/store/auth.store";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 60 seconds

type PlanTier = "free" | "pro" | "proplus";

interface EntitlementsResponse {
  success: boolean;
  data?: { currentPlan: PlanTier };
}

export function BillingSuccessPage() {
  const setOrganization = useAuthStore((s) => s.setOrganization);
  const organization = useAuthStore((s) => s.organization);

  const previousPlan = useRef<PlanTier>(
    (authApi.getOrgPlan() ?? "free") as PlanTier,
  );
  const pollCount = useRef(0);

  const [status, setStatus] = useState<"polling" | "confirmed" | "timeout">(() =>
    authApi.getActiveOrgId() ? "polling" : "timeout",
  );
  const [newPlan, setNewPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) {
      return;
    }

    const interval = setInterval(async () => {
      pollCount.current += 1;

      try {
        const res = await apiClient.get<EntitlementsResponse>(
          `/organizations/${orgId}/billing/entitlements`,
        );
        const plan = res?.data?.currentPlan;

        if (plan && plan !== previousPlan.current && plan !== "free") {
          // Plan upgraded — sync to store + localStorage
          authApi.setOrgPlan(plan);
          if (organization) {
            setOrganization({ ...organization, plan });
          }
          setNewPlan(plan);
          setStatus("confirmed");
          clearInterval(interval);
          return;
        }
      } catch {
        // silently retry
      }

      if (pollCount.current >= MAX_POLLS) {
        setStatus("timeout");
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [organization, setOrganization]);

  const PLAN_LABELS: Record<PlanTier, string> = {
    free: "Free",
    pro: "Pro",
    proplus: "Pro+",
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md">
        {/* Icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5">
            {status === "polling" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-9 w-9 text-primary" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          {status === "polling" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Payment received</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirming your plan upgrade…
              </p>
            </>
          )}
          {status === "confirmed" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">You're on {PLAN_LABELS[newPlan!]}!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your plan is active. All new features are unlocked for your team.
              </p>
            </>
          )}
          {status === "timeout" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Payment successful!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your payment was received. Plan activation may take a moment — refresh billing to confirm.
              </p>
            </>
          )}
        </div>

        {/* What's next card */}
        {status !== "polling" && (
          <div className="mb-6 rounded-xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              What's next
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Explore new features unlocked for your team.",
                "Visit billing anytime to review your subscription.",
                "Invite more human agents on your new plan.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {status !== "polling" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/dashboard" className="flex-1">
              <Button className="group w-full cursor-pointer">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Go to Dashboard
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/dashboard/settings/billing/plans" className="flex-1">
              <Button variant="outline" className="w-full cursor-pointer">
                View Billing
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

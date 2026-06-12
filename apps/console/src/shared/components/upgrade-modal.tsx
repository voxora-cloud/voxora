import { useState, useCallback } from "react";
import { X, Zap } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { authApi } from "@/domains/auth/api/auth.api";
import { getInteraOneMode, isEeEnabledByEnv } from "@/shared/ee";

interface LimitReachedPayload {
  limitType: string;
  plan: string;
  limit: number;
  currentUsage: number;
  upgradeRequired?: boolean;
  resetsAt?: string;
}

interface UpgradeModalProps {
  payload: LimitReachedPayload;
  onClose: () => void;
}

const LIMIT_LABELS: Record<string, string> = {
  messages: "AI messages",
  teams: "teams",
  humanAgents: "human agents",
  contacts: "contacts",
  knowledgeItems: "knowledge items",
};

export function UpgradeModal({ payload, onClose }: UpgradeModalProps) {
  const billingVisible =
    getInteraOneMode() === "cloud" && isEeEnabledByEnv();
  const role = authApi.getOrgRole();

  const label = LIMIT_LABELS[payload.limitType] ?? payload.limitType;
  const resetsText = payload.resetsAt
    ? `Resets on ${new Date(payload.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
          <Zap className="h-5 w-5 text-amber-500" />
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold">
          {label.charAt(0).toUpperCase() + label.slice(1)} limit reached
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You've used{" "}
          <span className="font-medium text-foreground">
            {payload.currentUsage} / {payload.limit}
          </span>{" "}
          {label} on the{" "}
          <span className="capitalize font-medium text-foreground">{payload.plan}</span> plan.
          {resetsText && (
            <>
              {" "}
              <span className="text-muted-foreground">{resetsText}.</span>
            </>
          )}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {billingVisible && role === "owner" ? (
            <Link to="/dashboard/settings/billing/plans" onClick={onClose} className="w-full">
              <Button className="w-full" size="sm">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Upgrade plan
              </Button>
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              Contact your organization owner to upgrade the plan.
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-muted-foreground">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Global upgrade modal state ────────────────────────────────────────────────

let _showUpgradeModal: ((payload: LimitReachedPayload) => void) | null = null;

export function registerUpgradeModalHandler(
  handler: (payload: LimitReachedPayload) => void,
) {
  _showUpgradeModal = handler;
}

export function triggerUpgradeModal(payload: LimitReachedPayload) {
  _showUpgradeModal?.(payload);
}

// ── Root-level upgrade modal wrapper (add once in App.tsx or DashboardLayout) ─

export function UpgradeModalRoot() {
  const [payload, setPayload] = useState<LimitReachedPayload | null>(null);

  const show = useCallback((p: LimitReachedPayload) => setPayload(p), []);
  registerUpgradeModalHandler(show);

  if (!payload) return null;
  return <UpgradeModal payload={payload} onClose={() => setPayload(null)} />;
}

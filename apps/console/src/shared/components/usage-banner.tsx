import { useEffect, useState } from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { Link } from "react-router";
import { apiClient } from "@/shared/lib/api-client";
import { authApi } from "@/domains/auth/api/auth.api";
import { getInteraOneMode, isEeEnabledByEnv } from "@/shared/ee";

interface UsageStat {
  used: number;
  limit: number | null;
  pct: number;
}

interface UsageSnapshot {
  period: string;
  resetsAt: string;
  usage: {
    messages: UsageStat;
    humanAgents: UsageStat;
    contacts: UsageStat;
    teams: UsageStat;
    knowledgeItems: UsageStat;
  };
}

interface UsageApiResponse {
  success: boolean;
  data: UsageSnapshot;
}

const HIGH_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 100;
const POLL_INTERVAL_MS = 60_000; // re-check every minute

export function UsageBanner() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const orgId = authApi.getActiveOrgId();
  const billingVisible =
    getInteraOneMode() === "cloud" && isEeEnabledByEnv();
  const role = authApi.getOrgRole();

  useEffect(() => {
    if (!orgId || !billingVisible) return;

    const fetchUsage = async () => {
      try {
        const res = await apiClient.get<UsageApiResponse>(
          `/organizations/${orgId}/billing/usage`,
        );
        if (res?.data) setSnapshot(res.data);
      } catch {
        // silently fail — banner is non-critical
      }
    };

    fetchUsage();
    const id = setInterval(fetchUsage, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [orgId, billingVisible]);

  if (!snapshot || dismissed || !billingVisible) return null;

  // Find the worst stat
  const stats = Object.entries(snapshot.usage) as [string, UsageStat][];
  const worst = stats
    .filter(([, s]) => s.limit !== null && s.pct >= HIGH_THRESHOLD)
    .sort(([, a], [, b]) => b.pct - a.pct)[0];

  if (!worst) return null;

  const [limitKey, stat] = worst;
  const isCritical = stat.pct >= CRITICAL_THRESHOLD;

  const LABELS: Record<string, string> = {
    messages: "AI messages",
    humanAgents: "human agents",
    contacts: "contacts",
    knowledgeItems: "knowledge items",
  };

  const label = LABELS[limitKey] ?? limitKey;
  const resetsDate = snapshot.resetsAt
    ? new Date(snapshot.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm mb-3 ${isCritical
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {isCritical ? (
          <>
            <strong>{label.charAt(0).toUpperCase() + label.slice(1)} limit reached.</strong>{" "}
            AI responses are paused.{resetsDate && ` Resets ${resetsDate}.`}
          </>
        ) : (
          <>
            You've used <strong className="font-mono tabular-nums">{stat.pct}%</strong> of your monthly {label}.{" "}
            {resetsDate && `Resets ${resetsDate}.`}
          </>
        )}
      </span>

      {billingVisible && role === "owner" && (
        <Link
          to="/dashboard/settings/billing/plans"
          className="shrink-0 flex items-center gap-1 rounded-md bg-current/10 px-2.5 py-1 text-xs font-medium hover:bg-current/20 transition-colors"
        >
          <Zap className="h-3 w-3" />
          Upgrade
        </Link>
      )}

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-current/60 hover:text-current transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

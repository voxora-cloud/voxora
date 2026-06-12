import { Link } from "react-router";
import { XCircle, AlertTriangle, RefreshCw, LayoutDashboard, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function BillingFailedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md">
        {/* Glow ring */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive/30 bg-gradient-to-br from-destructive/20 to-destructive/5">
            <XCircle className="h-9 w-9 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Payment failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't complete your payment. Your plan has not been changed.
          </p>
        </div>

        {/* Tips card */}
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Common reasons
          </p>
          <ul className="space-y-2 text-sm">
            {[
              "Insufficient funds or card declined.",
              "Incorrect card details or expiry date.",
              "Card issuer blocked the transaction.",
              "3D Secure authentication was not completed.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/dashboard/settings/billing/plans" className="flex-1">
            <Button className="group w-full cursor-pointer">
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Try again
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link to="/dashboard" className="flex-1">
            <Button variant="outline" className="group w-full cursor-pointer">
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:support@interaone.com"
            className="text-primary underline-offset-2 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

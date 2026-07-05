import { Card } from "@/shared/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className="min-h-32 cursor-default gap-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {displayValue}
        </h3>
        {change && (
          <span
            className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </Card>
  );
}

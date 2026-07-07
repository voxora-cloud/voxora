const emptyAnalyticsMessage =
  "Currently, we don’t have enough data to show this information.";

export function AnalyticsEmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
      <p className="text-sm text-muted-foreground">{emptyAnalyticsMessage}</p>
    </div>
  );
}

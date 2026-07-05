import { Button } from "@/shared/ui/button";
import type { CreateWidgetData } from "../types";
import { Bot, Eye, Globe, Info, Loader2, Palette, Save, X } from "lucide-react";

interface WidgetActionsPanelProps {
  formData: CreateWidgetData;
  isSaving: boolean;
  isExistingWidget: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function WidgetActionsPanel({
  formData,
  isSaving,
  isExistingWidget,
  onSave,
  onReset,
}: WidgetActionsPanelProps) {
  const summaryItems = [
    {
      icon: Palette,
      label: "Theme",
      value: formData.appearance.theme === "light" ? "Light" : "Dark",
    },
    {
      icon: Eye,
      label: "Visibility",
      value: formData.behavior.showWidget ? "Visible" : "Hidden",
    },
    {
      icon: Bot,
      label: "AI responses",
      value: formData.ai.enabled ? "Enabled" : "Disabled",
    },
    {
      icon: Globe,
      label: "Domain",
      value:
        formData.domainVerificationStatus === "verified"
          ? "Verified"
          : formData.verifiedDomain
            ? "Not verified"
            : "Not configured",
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Widget summary</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Current configuration</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {isExistingWidget ? "Configured" : "Draft"}
          </span>
        </div>

        <dl className="divide-y divide-border/50">
          {summaryItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <dt className="min-w-0 flex-1 text-xs text-muted-foreground">{label}</dt>
              <dd className="text-right text-xs font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2.5 border-t border-border/60 bg-muted/15 p-4">
        <div className="flex gap-2 rounded-lg border border-border/60 bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p>Update the configuration after making changes for them to take effect.</p>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm cursor-pointer transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isExistingWidget ? "Update Configuration" : "Create Widget"}
            </>
          )}
        </Button>

        {isExistingWidget && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onReset}
          >
            <X className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        )}
      </div>
    </section>
  );
}

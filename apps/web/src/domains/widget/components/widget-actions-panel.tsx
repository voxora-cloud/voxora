import { Button } from "@/shared/ui/button";
import { Loader2, Save, X } from "lucide-react";

interface WidgetActionsPanelProps {
  isSaving: boolean;
  isExistingWidget: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function WidgetActionsPanel({
  isSaving,
  isExistingWidget,
  onSave,
  onReset,
}: WidgetActionsPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 space-y-4">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 cursor-pointer transition-all"
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
            variant="outline"
            className="w-full h-12 rounded-xl border-border hover:bg-muted/40 cursor-pointer"
            onClick={onReset}
          >
            <X className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        )}
      </div>
    </div>
  );
}

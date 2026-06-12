import type { FormEvent } from "react";
import type { CreateWidgetData } from "../types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface WidgetAppearanceFormProps {
  formData: CreateWidgetData;
  validationErrors: {
    displayName?: string;
  };
  onInputChange: (field: keyof CreateWidgetData, value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function WidgetAppearanceForm({
  formData,
  validationErrors,
  onInputChange,
  onSubmit,
}: WidgetAppearanceFormProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 lg:p-8">

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="space-y-3">
            <Label
              htmlFor="displayName"
              className="text-sm font-medium text-foreground/90"
            >
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Acme Support"
              value={formData.displayName}
              onChange={(e) => onInputChange("displayName", e.target.value)}
              className={`h-12 rounded-xl border-border bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-text ${
                validationErrors.displayName ? "border-red-500/50" : ""
              }`}
              required
            />
            {validationErrors.displayName && (
              <p className="text-xs text-red-500">
                {validationErrors.displayName}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Shown in the widget header
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

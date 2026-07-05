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
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Display name</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The name visitors see in the widget header.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="sr-only"
            >
              Widget name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Acme Support"
              value={formData.displayName}
              onChange={(e) => onInputChange("displayName", e.target.value)}
              className={`h-11 rounded-lg border-border bg-background shadow-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 cursor-text ${
                validationErrors.displayName ? "border-red-500/50" : ""
              }`}
              required
            />
            {validationErrors.displayName && (
              <p className="text-xs text-red-500">
                {validationErrors.displayName}
              </p>
            )}
        </div>
      </form>
    </section>
  );
}

import type { FormEvent } from "react";
import type { CreateWidgetData } from "../types";
import { FileUpload } from "@/shared/ui/file-upload";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface WidgetAppearanceFormProps {
  formData: CreateWidgetData;
  validationErrors: {
    displayName?: string;
    backgroundColor?: string;
  };
  onInputChange: (field: keyof CreateWidgetData, value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onUploadSuccess: (data: {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
  }) => void;
  onUploadError: (error: string) => void;
  onFileRemove: () => void;
  existingWidget: CreateWidgetData | null;
  savedLogoUrl: string;
}

export function WidgetAppearanceForm({
  formData,
  validationErrors,
  onInputChange,
  onSubmit,
  onUploadSuccess,
  onUploadError,
  onFileRemove,
  existingWidget,
  savedLogoUrl,
}: WidgetAppearanceFormProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 lg:p-8">
        <h2 className="text-xl font-semibold mb-6">Appearance</h2>

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

          <div className="space-y-3">
            <Label
              htmlFor="backgroundColor"
              className="text-sm font-medium text-foreground/90"
            >
              Brand Color
            </Label>

            <div className="p-6 rounded-xl border border-border bg-muted/30 backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-xl border-2 border-border shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: formData.backgroundColor }}
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium">Primary Color</div>
                  <div className="text-xs text-muted-foreground">
                    Used for buttons, links, and accents
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    onInputChange("backgroundColor", e.target.value)
                  }
                  className="w-14 h-14 rounded-lg cursor-pointer border-border p-1"
                  required
                />

                <Input
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    onInputChange("backgroundColor", e.target.value)
                  }
                  placeholder="#10b981"
                  className={`flex-1 h-14 rounded-xl font-mono uppercase border-border bg-background/80 backdrop-blur-sm cursor-text ${
                    validationErrors.backgroundColor ? "border-red-500/50" : ""
                  }`}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>

              {validationErrors.backgroundColor && (
                <p className="text-xs text-red-500">
                  {validationErrors.backgroundColor}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="logoUrl"
              className="text-sm font-medium text-foreground/90"
            >
              Brand Logo
            </Label>

            <FileUpload
              accept="image/*"
              maxSize={2 * 1024 * 1024}
              validate={(file) => {
                if (!file.type.startsWith("image/")) {
                  return "Please select an image file";
                }
                return null;
              }}
              onUploadSuccess={onUploadSuccess}
              onUploadError={onUploadError}
              onRemove={onFileRemove}
              initialPreview={formData.logoUrl}
              initialFileName={existingWidget?.logoUrl ? "Current Logo" : undefined}
              showPreview
              buttonText="Choose from Device"
              buttonVariant="outline"
              helperText="Upload from your device (PNG, JPG, SVG - Max 2MB)"
            />

            {savedLogoUrl && (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
                <div className="w-16 h-16 rounded-xl border border-border overflow-hidden flex items-center justify-center bg-muted/60 flex-shrink-0">
                  <img
                    src={savedLogoUrl}
                    alt="Current logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Current Logo
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This logo will appear in your chat widget
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Square format recommended, minimum 64x64px
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Globe,
  RefreshCw,
  Clock,
} from "lucide-react";
import { AddLiveSourceFormData, FetchMode, SyncFrequency } from "@/lib/interfaces/liveSource";

interface AddLiveSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddLiveSourceFormData) => void;
  isSubmitting: boolean;
}

export default function AddLiveSourceModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddLiveSourceModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AddLiveSourceFormData>>({
    url: "",
    fetchMode: "single",
    crawlDepth: 2,
    syncFrequency: "manual",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setStep(1);
    setFormData({
      url: "",
      fetchMode: "single",
      crawlDepth: 2,
      syncFrequency: "manual",
    });
    setErrors({});
    onClose();
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.url?.trim()) {
      newErrors.url = "URL is required";
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (!formData.url || !formData.fetchMode || !formData.syncFrequency) return;

    const submitData: AddLiveSourceFormData = {
      url: formData.url,
      fetchMode: formData.fetchMode,
      syncFrequency: formData.syncFrequency,
    };

    if (formData.fetchMode === "crawl") {
      submitData.crawlDepth = formData.crawlDepth || 2;
    }

    onSubmit(submitData);
  };

  const getSyncFrequencyLabel = (freq: SyncFrequency) => {
    switch (freq) {
      case "manual":
        return "Manual (on-demand only)";
      case "1hour":
        return "Every 1 hour";
      case "6hours":
        return "Every 6 hours";
      case "daily":
        return "Daily";
      default:
        return freq;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Add Live Source
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 3
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step 1: Add URL */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://company.com/docs"
                  className="pl-10 cursor-text"
                />
              </div>
              {errors.url && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.url}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Enter the URL you want to monitor for updates
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-sync with vector database
              </h4>
              <p className="text-xs text-muted-foreground">
                Content will be automatically fetched, processed, and stored in
                your vector database for AI-powered search and retrieval.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} className="cursor-pointer">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Fetch Mode */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Choose how to fetch content from this URL
            </div>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.fetchMode === "single"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="fetchMode"
                  value="single"
                  checked={formData.fetchMode === "single"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fetchMode: e.target.value as FetchMode,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Single Page</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Fetch content only from this specific URL
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.fetchMode === "crawl"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="fetchMode"
                  value="crawl"
                  checked={formData.fetchMode === "crawl"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fetchMode: e.target.value as FetchMode,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Crawl Subpages
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Follow links and fetch content from related pages
                  </div>
                  {formData.fetchMode === "crawl" && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-foreground">
                        Crawl Depth
                      </label>
                      <Select
                        value={String(formData.crawlDepth || 2)}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            crawlDepth: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger className="mt-1 w-full h-9 text-sm">
                          <SelectValue placeholder="Select crawl depth" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 level (immediate links)</SelectItem>
                          <SelectItem value="2">2 levels (recommended)</SelectItem>
                          <SelectItem value="3">3 levels (extensive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleNext} className="cursor-pointer">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Sync Frequency */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              How often should we check for updates?
            </div>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.syncFrequency === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="syncFrequency"
                  value="manual"
                  checked={formData.syncFrequency === "manual"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      syncFrequency: e.target.value as SyncFrequency,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Manual</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Fetch only when you click the refresh button
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.syncFrequency === "1hour"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="syncFrequency"
                  value="1hour"
                  checked={formData.syncFrequency === "1hour"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      syncFrequency: e.target.value as SyncFrequency,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Every 1 hour</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Best for frequently updated content
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.syncFrequency === "6hours"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="syncFrequency"
                  value="6hours"
                  checked={formData.syncFrequency === "6hours"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      syncFrequency: e.target.value as SyncFrequency,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Every 6 hours</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Good balance of freshness and efficiency
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.syncFrequency === "daily"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="syncFrequency"
                  value="daily"
                  checked={formData.syncFrequency === "daily"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      syncFrequency: e.target.value as SyncFrequency,
                    }))
                  }
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Daily</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    For content that changes less frequently
                  </div>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">URL:</div>
                <div className="text-foreground truncate">{formData.url}</div>
                <div className="text-muted-foreground">Fetch Mode:</div>
                <div className="text-foreground capitalize">
                  {formData.fetchMode}
                  {formData.fetchMode === "crawl" &&
                    ` (depth: ${formData.crawlDepth})`}
                </div>
                <div className="text-muted-foreground">Sync:</div>
                <div className="text-foreground">
                  {getSyncFrequencyLabel(
                    formData.syncFrequency || "manual"
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? "Adding..." : "Add Live Source"}
              </Button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex gap-2 mt-6">
          <div
            className={`h-1 flex-1 rounded-full ${
              step >= 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step >= 3 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

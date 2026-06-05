import { useState } from "react";
import { HelpCircle, Upload } from "lucide-react";
import type { WidgetSuggestion } from "../types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { useKnowledgeItems } from "@/domains/knowledge/hooks";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

interface WidgetSuggestionsFormProps {
  suggestions: WidgetSuggestion[];
  onChange: (suggestions: WidgetSuggestion[]) => void;
}

const MAX_QUICK_ACTIONS = 3;

export function WidgetSuggestionsForm({
  suggestions,
  onChange,
}: WidgetSuggestionsFormProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedFaqIds, setSelectedFaqIds] = useState<Set<string>>(
    () => new Set(),
  );
  const { data: knowledgeItems = [], isLoading: isKnowledgeLoading } =
    useKnowledgeItems();
  const faqItems = knowledgeItems.filter((item) => item.source === "faq");

  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();

  const update = (index: number, patch: Partial<WidgetSuggestion>) => {
    const next = suggestions.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    onChange(next);
  };

  const openImportDialog = () => {
    if (!faqItems.length) {
      toast.info("No FAQs found", {
        description: "Add FAQs in Static Knowledge before importing.",
      });
      return;
    }

    setSelectedFaqIds(
      new Set(
        suggestions
          .filter(
            (suggestion) =>
              suggestion.source === "faq" && suggestion.knowledgeId,
          )
          .map((suggestion) => suggestion.knowledgeId as string)
          .slice(0, MAX_QUICK_ACTIONS),
      ),
    );
    setIsImportOpen(true);
  };

  const toggleFaqSelection = (faqId: string) => {
    setSelectedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        if (next.size >= MAX_QUICK_ACTIONS) {
          toast.error("You can select up to 3 quick actions only");
          return prev;
        }
        next.add(faqId);
      }
      return next;
    });
  };

  const saveSelectedFaqs = () => {
    const currentByKnowledgeId = new Map(
      suggestions
        .filter((suggestion) => suggestion.knowledgeId)
        .map((suggestion) => [suggestion.knowledgeId as string, suggestion]),
    );
    const selected = faqItems
      .filter((faq) => selectedFaqIds.has(faq._id))
      .slice(0, MAX_QUICK_ACTIONS)
      .map<WidgetSuggestion>((faq) => ({
        text: faq.title.trim(),
        showOutside: currentByKnowledgeId.get(faq._id)?.showOutside ?? true,
        enabled: true,
        source: "faq",
        knowledgeId: faq._id,
      }));

    onChange(selected);
    setIsImportOpen(false);
    setSelectedFaqIds(new Set());
    toast.success("Quick actions updated", {
      description: selected.length
        ? `${selected.length} FAQ question${selected.length === 1 ? "" : "s"} selected.`
        : "No FAQ quick actions selected.",
    });
  };

  const visibleSuggestions = suggestions.slice(0, MAX_QUICK_ACTIONS);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
        <div className="p-6 lg:p-8 space-y-5">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Quick Actions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select up to 3 FAQ questions for quick actions. Use Show
                  outside to display them near the launcher.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={openImportDialog}
                disabled={isKnowledgeLoading}
                className="shrink-0 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import FAQs
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {visibleSuggestions.map((suggestion, index) => (
              <div
                key={
                  suggestion.knowledgeId ||
                  `${suggestion.source || "manual"}-${index}`
                }
                className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-muted/20 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Quick Action {index + 1}
                    </Label>
                    {suggestion.source === "faq" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        <HelpCircle className="h-3 w-3" />
                        FAQ
                      </span>
                    )}
                  </div>
                  <Input
                    value={suggestion.text}
                    readOnly
                    className="h-9 text-sm rounded-lg border-border bg-background/80"
                    maxLength={160}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      Show
                      <br />
                      outside
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update(index, { showOutside: !suggestion.showOutside })
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                        suggestion.showOutside
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                      aria-label={`Toggle show outside widget for suggestion ${index + 1}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          suggestion.showOutside
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {visibleSuggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No quick actions configured. Import FAQs from Static Knowledge to
              select quick actions.
            </p>
          )}
        </div>
      </div>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select FAQ Questions</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choose up to 3 questions for widget quick actions.
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {faqItems.map((faq) => {
                const isSelected = selectedFaqIds.has(faq._id);
                const isUnavailable = !normalize(faq.title);
                return (
                  <label
                    key={faq._id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isUnavailable
                        ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isUnavailable}
                      onChange={() => toggleFaqSelection(faq._id)}
                      className="mt-1 h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {faq.title}
                        </span>
                        {isSelected && (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Selected
                          </span>
                        )}
                      </div>
                      {faq.catalog && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {faq.catalog}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveSelectedFaqs}
              className="cursor-pointer"
            >
              Save Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

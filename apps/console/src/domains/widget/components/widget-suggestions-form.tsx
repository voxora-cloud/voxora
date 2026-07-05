import { useState } from "react";
import { MessageSquareDashed, Sparkles } from "lucide-react";
import type { WidgetSuggestion } from "../types/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/ui/dialog";
import { useKnowledgeItems } from "../../knowledge/hooks/useKnowledgeItems";
import { Button } from "@/shared/ui/button";

interface WidgetSuggestionsFormProps {
  suggestions: WidgetSuggestion[];
  onChange: (suggestions: WidgetSuggestion[]) => void;
}

const MAX_SUGGESTIONS = 3;

// ── Styled checkbox ─────────────────────────────────────────────────────────
function FaqCheckbox({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled: boolean;
}) {
  return (
    <span
      className={`
        relative flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0
        transition-all duration-150
        ${checked
          ? "bg-primary border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
          : disabled
            ? "bg-muted/30 border-border/40 opacity-40"
            : "bg-background border-border group-hover:border-primary/60"
        }
      `}
    >
      {checked && (
        <svg
          viewBox="0 0 10 8"
          fill="none"
          className="w-3 h-3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="white"
        >
          <path d="M1 4l2.5 2.5L9 1" />
        </svg>
      )}
    </span>
  );
}

// ── 3-pip progress bar ───────────────────────────────────────────────────────
function SelectionBar({
  selected,
  max,
}: {
  selected: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i < selected ? "bg-primary" : "bg-border"
              }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {selected}
        <span className="mx-0.5 text-border">/</span>
        {max} selected
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function WidgetSuggestionsForm({
  suggestions,
  onChange,
}: WidgetSuggestionsFormProps) {
  const { data: knowledgeItems = [], isLoading: isFaqLoading } =
    useKnowledgeItems();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

  const faqs = knowledgeItems.filter((item) => item.source === "faq");

  const update = (index: number, patch: Partial<WidgetSuggestion>) => {
    const next = suggestions.map((s, i) =>
      i === index ? { ...s, ...patch } : s
    );
    onChange(next);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setTempSelectedIds(
        suggestions.map((s) => s.faqId).filter(Boolean) as string[]
      );
    }
  };

  const toggleFaq = (id: string) => {
    if (tempSelectedIds.includes(id)) {
      setTempSelectedIds(tempSelectedIds.filter((x) => x !== id));
    } else {
      if (tempSelectedIds.length >= MAX_SUGGESTIONS) return;
      setTempSelectedIds([...tempSelectedIds, id]);
    }
  };

  const handleSave = () => {
    const selectedFaqs = faqs.filter((f) => tempSelectedIds.includes(f._id));
    const nextSuggestions = selectedFaqs.map((faq) => {
      const existing = suggestions.find((s) => s.faqId === faq._id);
      return {
        text: faq.title,
        showOutside: existing ? existing.showOutside : false,
        faqId: faq._id,
      };
    });
    onChange(nextSuggestions);
    setIsDialogOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 lg:p-8 space-y-5">

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Up to 3 FAQ suggestions shown as quick-reply buttons in the widget.
            </p>
          </div>

          {/* ── Dialog trigger ────────────────────────────────────────────── */}
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/25 bg-primary/5 hover:bg-primary/10 px-3.5 py-1.5 rounded-lg shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Configure FAQs
              </button>
            </DialogTrigger>

            {/* ── Dialog shell ──────────────────────────────────────────────── */}
            <DialogContent className="max-w-[460px] bg-card border border-border text-card-foreground p-0 overflow-hidden rounded-2xl gap-0">

              {/* Header */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MessageSquareDashed className="h-4 w-4 text-primary" />
                  Configure FAQ Suggestions
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Check up to{" "}
                  <span className="font-semibold text-foreground">3</span> FAQs
                  to show as quick-reply buttons. Uncheck any to remove.
                </p>
              </DialogHeader>

              {/* FAQ list */}
              <div className="px-4 py-3 max-h-[340px] overflow-y-auto space-y-1.5">
                {isFaqLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading FAQs…</p>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <MessageSquareDashed className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">
                      No FAQs found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add FAQ entries in the Knowledge section first.
                    </p>
                  </div>
                ) : (
                  faqs.map((faq) => {
                    const isSelected = tempSelectedIds.includes(faq._id);
                    const isDisabled =
                      !isSelected &&
                      tempSelectedIds.length >= MAX_SUGGESTIONS;

                    return (
                      <label
                        key={faq._id}
                        className={`
                          group flex items-start gap-3.5 p-3.5 rounded-xl border
                          transition-all duration-150 select-none
                          ${isDisabled
                            ? "border-border/40 bg-muted/10 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "border-primary/40 bg-primary/5 cursor-pointer"
                              : "border-border bg-background/60 cursor-pointer hover:border-primary/30 hover:bg-muted/30"
                          }
                        `}
                      >
                        {/* Hidden native checkbox for a11y */}
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() =>
                            !isDisabled && toggleFaq(faq._id)
                          }
                        />

                        {/* Visual checkbox */}
                        <FaqCheckbox
                          checked={isSelected}
                          disabled={isDisabled}
                        />

                        {/* FAQ details */}
                        <div className="flex-1 min-w-0 pt-px">
                          <p
                            className={`text-sm font-medium leading-snug ${isDisabled
                                ? "text-muted-foreground"
                                : "text-foreground"
                              }`}
                          >
                            {faq.title}
                          </p>

                          {faq.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {faq.description}
                            </p>
                          )}

                          {/* Status pill */}
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${faq.status === "indexed"
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : faq.status === "queued"
                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    : faq.status === "indexing"
                                      ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                      : "bg-muted text-muted-foreground border border-border"
                                }`}
                            >
                              {faq.status}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="px-6 py-4 border-t border-border/60 flex items-center justify-between gap-4 bg-muted/20">
                <SelectionBar
                  selected={tempSelectedIds.length}
                  max={MAX_SUGGESTIONS}
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="cursor-pointer h-8 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={faqs.length === 0}
                    className="cursor-pointer h-8 px-4"
                  >
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Active suggestion chips ──────────────────────────────────────── */}
        {suggestions.length > 0 ? (
          <div className="space-y-2.5">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20"
              >
                {/* Number badge */}
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 border border-primary/20">
                  {index + 1}
                </span>

                {/* Label */}
                <span className="flex-1 text-sm text-foreground font-medium truncate">
                  {suggestion.text}
                </span>

                {/* Show-outside toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Show outside
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(index, { showOutside: !suggestion.showOutside })
                    }
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${suggestion.showOutside
                        ? "bg-primary"
                        : "bg-muted-foreground/25"
                      }`}
                    aria-label={`Toggle show outside widget for suggestion ${index + 1
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${suggestion.showOutside
                          ? "translate-x-4"
                          : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border bg-muted/10 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center border border-border">
              <MessageSquareDashed className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No quick actions configured
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click{" "}
                <span className="font-semibold text-primary">
                  Configure FAQs
                </span>{" "}
                above to add suggestion buttons.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

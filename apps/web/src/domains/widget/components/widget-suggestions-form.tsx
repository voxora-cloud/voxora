import { Plus, Trash2 } from "lucide-react";
import type { WidgetSuggestion } from "../types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface WidgetSuggestionsFormProps {
  suggestions: WidgetSuggestion[];
  onChange: (suggestions: WidgetSuggestion[]) => void;
}

const MAX_SUGGESTIONS = 4;

export function WidgetSuggestionsForm({ suggestions, onChange }: WidgetSuggestionsFormProps) {
  const update = (index: number, patch: Partial<WidgetSuggestion>) => {
    const next = suggestions.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(suggestions.filter((_, i) => i !== index));
  };

  const add = () => {
    if (suggestions.length >= MAX_SUGGESTIONS) return;
    onChange([...suggestions, { text: "", showOutside: false }]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="p-6 lg:p-8 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Up to 4 suggestion buttons shown to visitors. Toggle "Show outside widget" to display a chip above the launcher button.
          </p>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20"
            >
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Suggestion {index + 1}</Label>
                <Input
                  value={suggestion.text}
                  onChange={(e) => update(index, { text: e.target.value })}
                  placeholder="e.g. What can you help me with?"
                  className="h-9 text-sm rounded-lg border-border bg-background/80 cursor-text"
                  maxLength={60}
                />
              </div>

              {/* Show outside toggle */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground text-center leading-tight">
                  Show<br />outside
                </span>
                <button
                  type="button"
                  onClick={() => update(index, { showOutside: !suggestion.showOutside })}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    suggestion.showOutside ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  aria-label={`Toggle show outside widget for suggestion ${index + 1}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      suggestion.showOutside ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex-shrink-0"
                aria-label={`Remove suggestion ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {suggestions.length < MAX_SUGGESTIONS && (
          <button
            type="button"
            onClick={add}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Add suggestion
          </button>
        )}

        {suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No suggestions configured — the widget will show a default empty state.
          </p>
        )}
      </div>
    </div>
  );
}

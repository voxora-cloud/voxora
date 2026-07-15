import { ArrowRight, CircleHelp, Clock3, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

interface UnansweredQuestion {
  question: string;
  count: number;
  lastAskedAt: string;
}

interface UnansweredQuestionsCardProps {
  questions?: UnansweredQuestion[];
}

const formatLastAsked = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
};

export function UnansweredQuestionsCard({ questions = [] }: UnansweredQuestionsCardProps) {
  const totalOccurrences = questions.reduce((sum, item) => sum + item.count, 0);
  const topQuestions = questions.slice(0, 4);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CircleHelp className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Unanswered questions</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Knowledge gaps the AI could not answer in the last 30 days.
              </p>
            </div>
          </div>
        </div>
        {totalOccurrences > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {totalOccurrences.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  knowledge gaps
                </p>
              </div>
            </div>
            {questions.length > 4 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Show all
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
                  <DialogHeader className="border-b border-border px-6 py-5 pr-12">
                    <DialogTitle>Unanswered questions</DialogTitle>
                    <DialogDescription>
                      All knowledge gaps the AI could not answer in the last 30 days.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid min-h-0 gap-3 overflow-y-auto px-6 pb-6 md:grid-cols-2">
                    {questions.map((item, index) => (
                      <div
                        key={`${item.question}-${index}`}
                        className="rounded-lg border border-border bg-background/40 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-5 text-foreground">
                              {item.question}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Asked {item.count.toLocaleString()}{" "}
                                {item.count === 1 ? "time" : "times"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                Last seen {formatLastAsked(item.lastAskedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {questions.length > 0 ? (
        <div className="grid gap-3 p-6 md:grid-cols-2">
          {topQuestions.map((item, index) => (
            <div
              key={`${item.question}-${index}`}
              className="rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-muted/25"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 text-sm font-medium leading-5 text-foreground">
                    {item.question}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Asked {item.count.toLocaleString()} {item.count === 1 ? "time" : "times"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      Last seen {formatLastAsked(item.lastAskedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center px-6 py-10 text-center">
          <div>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Lightbulb className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">No knowledge gaps found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unanswered customer questions will appear here automatically.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

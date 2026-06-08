import { Card } from "@/shared/ui/card";
import { HelpCircle, MessageCircleQuestion, TrendingUp } from "lucide-react";

type QuestionRow = {
  question: string;
  count: number;
};

interface MostAskedQuestionsCardProps {
  questions?: QuestionRow[];
}

export function MostAskedQuestionsCard({ questions = [] }: MostAskedQuestionsCardProps) {
  const maxCount = Math.max(...questions.map((question) => question.count), 0);
  const totalCount = questions.reduce((sum, question) => sum + question.count, 0);

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40">
              <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
            </span>
            <h3 className="text-lg font-semibold">Most Asked Questions</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Recurring customer prompts from recent AI conversations.
          </p>
        </div>
        {totalCount > 0 && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-right">
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {totalCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">mentions</div>
          </div>
        )}
      </div>

      {questions.length ? (
        <div className="space-y-3">
          {questions.map((question, index) => {
            const percent = maxCount > 0 ? Math.max(8, Math.round((question.count / maxCount) * 100)) : 0;
            return (
              <div
                key={`${question.question}-${index}`}
                className="rounded-md border border-border/80 bg-background/40 p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
                        {question.question}
                      </p>
                      <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs font-medium tabular-nums text-foreground">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        {question.count.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[15rem] items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
          <div>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/30">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No question data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer questions will appear here once conversations start.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

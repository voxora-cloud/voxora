import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Layers, Users, Sparkles } from "lucide-react";

export function ContactSegmentsPage() {
  return (
    <div className="w-full h-full">
      <Card className="w-full border-muted">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Segments Theme Lab</h3>
              <p className="text-sm text-muted-foreground">
                Preview how segment surfaces render under the global app theme.
              </p>
            </div>
            <Button size="sm" variant="outline" className="cursor-default">
              Global theme preview
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  High Intent Users
                </div>
                <p className="text-sm text-muted-foreground">Visitors with 3+ conversations in the last 7 days.</p>
                <Badge variant="secondary">1,284 contacts</Badge>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  VIP Expansion
                </div>
                <p className="text-sm text-muted-foreground">Enterprise visitors needing white-glove routing.</p>
                <Badge variant="outline">Potential segment</Badge>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4" />
                  Dormant Accounts
                </div>
                <p className="text-sm text-muted-foreground">No activity in 30+ days, suggested reactivation list.</p>
                <Badge variant="destructive">Needs review</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Organize your contacts into smart segments. Segment builder logic is coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

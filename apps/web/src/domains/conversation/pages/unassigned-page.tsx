import { Card, CardContent } from "@/shared/ui/card";
import { MessageSquare } from "lucide-react";

export function ConversationsUnassignedPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/10 w-full h-full">
      <Card className="w-full max-w-lg mx-8 border-muted">
        <CardContent className="text-center p-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Unassigned Conversations
          </h3>
          <p className="text-muted-foreground">
            Manage conversations that are currently in the queue. (Coming Soon)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

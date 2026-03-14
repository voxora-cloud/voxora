import { Card, CardContent } from "@/shared/ui/card";
import { MessageCircle } from "lucide-react";

export function ConversationsInboxPage() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-muted/10 w-full h-full">
      <Card className="w-full max-w-lg mx-8 border-muted">
        <CardContent className="text-center p-6">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Select a conversation
          </h3>
          <p className="text-muted-foreground">
            Choose a conversation from the sidebar to view and manage details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

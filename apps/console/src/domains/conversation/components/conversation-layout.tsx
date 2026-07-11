import type { ReactNode } from "react";
import { RecentConversationsSidebar } from "./recent-sidebar";

interface ConversationLayoutProps {
  children: ReactNode;
}

export function ConversationLayout({ children }: ConversationLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full gap-3 overflow-hidden bg-background">
      <div className="h-full shrink-0">
        <RecentConversationsSidebar />
      </div>
      <div className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

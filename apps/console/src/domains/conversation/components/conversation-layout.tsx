import type { ReactNode } from "react";
import { RecentConversationsSidebar } from "./recent-sidebar";

interface ConversationLayoutProps {
  children: ReactNode;
}

export function ConversationLayout({ children }: ConversationLayoutProps) {
  return (
    <div className="h-full flex w-full">
      <div className="shrink-0 h-full">
        <RecentConversationsSidebar />
      </div>
      <div className="flex-1 h-full overflow-hidden">{children}</div>
    </div>
  );
}

import type { ReactNode } from "react";
import { ConversationSidebar } from "./conversation-sidebar";

interface ConversationLayoutProps {
  children: ReactNode;
}

export function ConversationLayout({ children }: ConversationLayoutProps) {
  return (
    <div className="h-full flex w-full">
      <div className="shrink-0">
        <ConversationSidebar />
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

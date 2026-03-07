import React from "react";
import { ConversationSidebar } from "@/components/agent/conversation-sidebar";

export default function AdminConversationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full flex w-full">
            <div className="shrink-0">
                <ConversationSidebar />
            </div>

            <div className="flex-1 w-full">{children}</div>
        </div>
    );
}

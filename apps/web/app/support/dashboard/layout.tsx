import React from "react"
import { ConversationSidebar } from "@/components/agent/conversation-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full flex w-full">
      {/* Sidebar - always visible within dashboard */}
      <div className="w-full md:w-64 shrink-0">
        <ConversationSidebar />
      </div>

      {/* Nested route content (empty state or chat) */}
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  )
}

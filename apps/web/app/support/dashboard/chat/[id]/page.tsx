"use client"

import { ConversationSidebar } from '@/components/agent/conversation-sidebar'
import { ConversationView } from '@/components/chat/conversation-view'
import React from 'react'

interface ChatPageProps {
  params: {
    id: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  // Use the id directly for now, but prepare for the future Next.js requirement
  // In Next.js 16+, this will need to be: const { id } = React.use(params);
  const { id } = params;
  
  return (
    <div className="h-full flex w-full">
      {/* Sidebar - visible on desktop, hidden on mobile with smaller width */}
      <div className="hidden md:block md:w-60 shrink-0">
        <ConversationSidebar />
      </div>
      
      {/* Chat view - always visible with maximum width */}
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <ConversationView id={id} />
      </div>
    </div>
  )
}

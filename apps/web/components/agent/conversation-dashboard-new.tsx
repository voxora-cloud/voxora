"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"
import { useParams } from "next/navigation"
import { ConversationSidebar } from "@/components/agent/conversation-sidebar"
import { ConversationView } from "@/components/chat/conversation-view"

export function ConversationDashboard() {
  const params = useParams()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  // If we have an ID from the URL params, use it
  useEffect(() => {
    if (params?.id) {
      setSelectedConversationId(params.id as string)
    }
  }, [params])

  return (
    <div className="h-full flex">
      {/* Conversations Sidebar */}
      <div className={`md:flex ${selectedConversationId ? 'hidden' : 'flex'} w-full md:w-80`}>
        <ConversationSidebar />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversationId ? (
          <ConversationView id={selectedConversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96 border-muted">
              <CardContent className="text-center p-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to view and reply to messages
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

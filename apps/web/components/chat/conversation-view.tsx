"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { 
  User, 
  Tag,
  StickyNote,
  ArrowRight,
  MoreVertical,
  Send,
  Paperclip,
  ArrowLeft
} from "lucide-react"

// Define types
interface Message {
  id: string;
  sender: 'agent' | 'customer';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  lastMessage: string;
  timestamp: Date;
  status: string;
  priority: string;
  team: string;
  type: string;
  tags: string[];
  notes: string;
  messages?: Message[];
}

// Mock conversation data (in a real app, you'd fetch this from an API)
const mockConversations: Conversation[] = [
  {
    id: "1",
    customerName: "John Smith",
    customerEmail: "john@example.com",
    subject: "Account Login Issue",
    lastMessage: "I'm having trouble accessing my account after the update.",
    timestamp: new Date(2023, 7, 14, 14, 32),
    status: "active",
    priority: "high",
    team: "Technical",
    type: "chat",
    tags: ["account", "login"],
    notes: "Customer tried password reset but didn't receive email.",
    messages: [
      {
        id: "m1",
        sender: "agent",
        content: "Hello! How can I help you today?",
        timestamp: new Date(2023, 7, 14, 14, 30)
      },
      {
        id: "m2",
        sender: "customer",
        content: "Hi! I'm having trouble with my account login.",
        timestamp: new Date(2023, 7, 14, 14, 31)
      },
      {
        id: "m3",
        sender: "agent",
        content: "I'd be happy to help you with that. Can you tell me what error message you're seeing?",
        timestamp: new Date(2023, 7, 14, 14, 32)
      }
    ]
  },
  {
    id: "2",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    subject: "Billing Question",
    lastMessage: "I was charged twice for my subscription last month.",
    timestamp: new Date(2023, 7, 14, 13, 15),
    status: "waiting",
    priority: "medium",
    team: "Billing",
    type: "chat",
    tags: ["billing", "subscription"],
    notes: "",
    messages: [
      {
        id: "m1",
        sender: "agent",
        content: "Hello Sarah! How can I assist you today?",
        timestamp: new Date(2023, 7, 14, 13, 10)
      },
      {
        id: "m2",
        sender: "customer",
        content: "Hi, I was checking my bank statement and noticed I was charged twice for my subscription last month.",
        timestamp: new Date(2023, 7, 14, 13, 12)
      },
      {
        id: "m3",
        sender: "agent",
        content: "I apologize for that issue. Let me check your billing records right away.",
        timestamp: new Date(2023, 7, 14, 13, 15)
      }
    ]
  },
  {
    id: "3",
    customerName: "Michael Chen",
    customerEmail: "mchen@example.com",
    subject: "Feature Request",
    lastMessage: "Would it be possible to add dark mode to the app?",
    timestamp: new Date(2023, 7, 14, 10, 45),
    status: "new",
    priority: "low",
    team: "Product",
    type: "chat",
    tags: ["feature", "ui"],
    notes: "",
    messages: [
      {
        id: "m1",
        sender: "customer",
        content: "Hello, I've been using your app for a while and I love it. I was wondering if there are any plans to add dark mode?",
        timestamp: new Date(2023, 7, 14, 10, 40)
      },
      {
        id: "m2",
        sender: "agent",
        content: "Hi Michael! Thanks for reaching out. That's a great suggestion! Many users have been requesting this feature.",
        timestamp: new Date(2023, 7, 14, 10, 42)
      },
      {
        id: "m3",
        sender: "customer",
        content: "Would it be possible to add dark mode to the app in the next update?",
        timestamp: new Date(2023, 7, 14, 10, 45)
      }
    ]
  }
]

interface ConversationViewProps {
  id: string;
}

export function ConversationView({ id }: ConversationViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(
    // Find conversation by id
    mockConversations.find(c => c.id === id) || null
  )
  const [message, setMessage] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  const [internalNote, setInternalNote] = useState("")

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Conversation not found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/support/dashboard')}
            >
              Back to Conversations
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSendMessage = () => {
    if (!message.trim() || !conversation) return

    // In a real app, you would send this to your API
    const newMessage: Message = {
      id: `m${conversation.messages?.length ? conversation.messages.length + 1 : 1}`,
      sender: "agent",
      content: message,
      timestamp: new Date()
    }

    if (!conversation.messages) {
      conversation.messages = []
    }

    setConversation({
      ...conversation,
      messages: [...conversation.messages, newMessage]
    })

    setMessage("")
  }

  const handleAddNote = () => {
    if (internalNote.trim()) {
      // In a real app, this would call an API to add the note
      alert(`Note added: ${internalNote}`)
      setInternalNote("")
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "high": return "bg-red-100 text-red-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      case "low": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center" 
          onClick={() => router.push('/support/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Button>
      </div>

      {/* Conversation Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">{conversation.customerName}</CardTitle>
                <CardDescription>{conversation.customerEmail}</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowNotes(!showNotes)}>
                <StickyNote className="mr-1 h-3 w-3" />
                Notes
              </Button>
              <Button variant="outline" size="sm">
                <ArrowRight className="mr-1 h-3 w-3" />
                Transfer
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Conversation Tags & Info */}
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center space-x-2">
              {conversation.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex items-center">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(conversation.priority)}`}>
              {conversation.priority} priority
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Internal Notes */}
      {showNotes && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversation.notes && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-foreground">{conversation.notes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Added by {user?.name || 'Agent'}</p>
                </div>
              )}
              <div className="flex space-x-2">
                <Input
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add internal note..."
                  className="flex-1"
                />
                <Button onClick={handleAddNote} disabled={!internalNote.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex flex-col p-0 h-full">
          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-muted/10">
            <div className="space-y-4">
              {conversation.messages?.map((msg: Message) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md ${
                    msg.sender === 'agent' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border'
                  } rounded-lg px-3 py-2`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className={`text-xs ${
                      msg.sender === 'agent' ? 'opacity-70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(new Date(msg.timestamp))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Message Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input 
                placeholder="Type your message..." 
                className="flex-1"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

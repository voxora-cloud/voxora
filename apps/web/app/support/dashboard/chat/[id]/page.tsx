"use client"

import React from 'react'
import { ConversationView } from "@/components/chat/conversation-view"

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
  messages: Message[];
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

const getPriorityColor = (priority: string) => {
  switch(priority) {
    case "high": return "bg-red-100 text-red-700"
    case "medium": return "bg-yellow-100 text-yellow-700"
    case "low": return "bg-green-100 text-green-700"
    default: return "bg-gray-100 text-gray-700"
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface ChatPageProps {
  params: {
    id: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  return <ConversationView id={params.id} />
}
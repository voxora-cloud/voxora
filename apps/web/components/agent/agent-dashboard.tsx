"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  MessageCircle, 
  Phone,
  Search, 
  Filter,
  Bell, 
  Settings,
  MoreVertical,
  ArrowRight,
  Tag,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  Send,
  Paperclip,
  StickyNote
} from "lucide-react"

interface Conversation {
  id: string
  customerName: string
  customerEmail: string
  subject: string
  lastMessage: string
  timestamp: Date
  status: "new" | "active" | "waiting" | "resolved"
  priority: "low" | "medium" | "high"
  team: string
  tags: string[]
  unreadCount: number
  type: "chat" | "call"
  assignedTo?: string
  notes?: string
}

interface AgentDashboardProps {
  agentName?: string
  agentTeams?: string[]
}

export function AgentDashboard({ 
  agentName = "Sarah Williams", 
  agentTeams = ["Support", "Technical"] 
}: AgentDashboardProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>("1")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterTeam, setFilterTeam] = useState<string>("all")
  const [showNotes, setShowNotes] = useState(false)
  const [internalNote, setInternalNote] = useState("")
  
  const [conversations] = useState<Conversation[]>([
    {
      id: "1",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      subject: "Login Issues",
      lastMessage: "I can't access my account anymore",
      timestamp: new Date(Date.now() - 300000),
      status: "active",
      priority: "high",
      team: "Support",
      tags: ["login", "urgent"],
      unreadCount: 2,
      type: "chat",
      assignedTo: "Sarah Williams",
      notes: "Customer tried password reset 3 times. Escalate to tech team if not resolved."
    },
    {
      id: "2",
      customerName: "Alice Johnson", 
      customerEmail: "alice@company.com",
      subject: "Feature Request",
      lastMessage: "Can we integrate with Slack?",
      timestamp: new Date(Date.now() - 900000),
      status: "waiting",
      priority: "medium",
      team: "Technical",
      tags: ["integration", "slack"],
      unreadCount: 0,
      type: "chat",
      assignedTo: "Sarah Williams"
    },
    {
      id: "3",
      customerName: "Bob Smith",
      customerEmail: "bob@startup.io", 
      subject: "Billing Question",
      lastMessage: "Why was I charged twice?",
      timestamp: new Date(Date.now() - 1800000),
      status: "new",
      priority: "medium",
      team: "Support",
      tags: ["billing"],
      unreadCount: 1,
      type: "chat"
    },
    {
      id: "4",
      customerName: "Emma Davis",
      customerEmail: "emma@tech.com",
      subject: "API Documentation",
      lastMessage: "Call ended - follow up needed",
      timestamp: new Date(Date.now() - 3600000),
      status: "resolved",
      priority: "low", 
      team: "Technical",
      tags: ["api", "documentation"],
      unreadCount: 0,
      type: "call",
      assignedTo: "Mike Johnson"
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "text-blue-500"
      case "active": return "text-green-500"
      case "waiting": return "text-yellow-500"
      case "resolved": return "text-gray-500"
      default: return "text-gray-500"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "low": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <Circle className="h-3 w-3" />
      case "active": return <AlertCircle className="h-3 w-3" />
      case "waiting": return <Clock className="h-3 w-3" />
      case "resolved": return <CheckCircle className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const statusMatch = filterStatus === "all" || conv.status === filterStatus
    const teamMatch = filterTeam === "all" || conv.team === filterTeam
    return statusMatch && teamMatch
  })

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const handleTransfer = () => {
    // TODO: Implement transfer functionality
    console.log("Transfer conversation")
  }

  const handleAddNote = () => {
    if (internalNote.trim()) {
      // TODO: Save internal note
      console.log("Adding note:", internalNote)
      setInternalNote("")
      setShowNotes(false)
    }
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-background px-2 text-xs"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
            </select>
            <select 
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-background px-2 text-xs"
            >
              <option value="all">All Teams</option>
              {agentTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                selectedConversation === conversation.id ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`${getStatusColor(conversation.status)}`}>
                      {getStatusIcon(conversation.status)}
                    </span>
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {conversation.customerName}
                    </h3>
                    {conversation.type === "call" && (
                      <Phone className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    {conversation.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
                
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(conversation.timestamp)}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(conversation.priority)}`}>
                    {conversation.priority}
                  </span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                    {conversation.team}
                  </span>
                </div>
                
                <div className="flex space-x-1">
                  {conversation.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-foreground">Agent Dashboard</h1>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{agentName}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {agentName.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground">{agentName}</div>
                <div className="text-xs text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                  Online
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Content */}
        <div className="flex-1 p-6">
          {selectedConversation ? (
            <div className="h-full">
              {/* Conversation Header */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {conversations.find(c => c.id === selectedConversation)?.customerName}
                        </CardTitle>
                        <CardDescription>
                          {conversations.find(c => c.id === selectedConversation)?.customerEmail}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNotes(!showNotes)}>
                        <StickyNote className="mr-1 h-3 w-3" />
                        Notes
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleTransfer}>
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
                      {conversations.find(c => c.id === selectedConversation)?.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex items-center">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(
                      conversations.find(c => c.id === selectedConversation)?.priority || "low"
                    )}`}>
                      {conversations.find(c => c.id === selectedConversation)?.priority} priority
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
                      {conversations.find(c => c.id === selectedConversation)?.notes && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-foreground">
                            {conversations.find(c => c.id === selectedConversation)?.notes}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Added by Sarah Williams</p>
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
              <Card className="flex-1">
                <CardContent className="h-96 flex flex-col p-4">
                  {/* Messages would go here - simplified for demo */}
                  <div className="flex-1 bg-muted/30 rounded-lg p-4 mb-4">
                    <p className="text-center text-muted-foreground">
                      Chat messages would appear here...
                    </p>
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input placeholder="Type your message..." className="flex-1" />
                    <Button>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to start helping customers
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

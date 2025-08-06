"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/auth-context"
import { 
  MessageCircle, 
  Phone,
  Search, 
  Filter,
  MoreVertical,
  ArrowRight,
  Tag,
  User,
  Paperclip,
  Send,
  StickyNote,
  UserMinus
} from "lucide-react"

// Mock conversation data
const mockConversations = [
  {
    id: "1",
    customerName: "John Smith",
    customerEmail: "john@example.com",
    subject: "Account Login Issue",
    lastMessage: "I'm having trouble accessing my account after the update.",
    timestamp: new Date(2023, 7, 14, 14, 32),
    unreadCount: 0,
    status: "active",
    priority: "high",
    team: "Technical",
    type: "chat",
    tags: ["account", "login"],
    notes: "Customer tried password reset but didn't receive email."
  },
  {
    id: "2",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    subject: "Billing Question",
    lastMessage: "I was charged twice for my subscription last month.",
    timestamp: new Date(2023, 7, 14, 13, 15),
    unreadCount: 2,
    status: "waiting",
    priority: "medium",
    team: "Billing",
    type: "chat",
    tags: ["billing", "subscription"],
    notes: ""
  },
  {
    id: "3",
    customerName: "Michael Chen",
    customerEmail: "mchen@example.com",
    subject: "Feature Request",
    lastMessage: "Would it be possible to add dark mode to the app?",
    timestamp: new Date(2023, 7, 14, 10, 45),
    unreadCount: 0,
    status: "new",
    priority: "low",
    team: "Product",
    type: "chat",
    tags: ["feature", "ui"],
    notes: ""
  },
  {
    id: "4",
    customerName: "Olivia Wilson",
    customerEmail: "olivia@example.com",
    subject: "API Integration Help",
    lastMessage: "I'm receiving a 403 error when trying to authenticate.",
    timestamp: new Date(2023, 7, 13, 16, 20),
    unreadCount: 1,
    status: "active",
    priority: "high",
    team: "Technical",
    type: "chat",
    tags: ["api", "integration"],
    notes: "Developer ticket - needs senior review"
  },
  {
    id: "5",
    customerName: "James Rodriguez",
    customerEmail: "james@example.com",
    subject: "Cannot Update Profile",
    lastMessage: "Every time I try to save my changes, the page refreshes.",
    timestamp: new Date(2023, 7, 13, 11, 5),
    unreadCount: 0,
    status: "resolved",
    priority: "medium",
    team: "Technical",
    type: "call",
    tags: ["profile", "bug"],
    notes: "Resolved: Browser cache issue. Customer was advised to clear cache."
  }
]

export function ConversationDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth()
  
  // State
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTeam, setFilterTeam] = useState("all")
  const [internalNote, setInternalNote] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferEmail, setTransferEmail] = useState("")
  
  // Use mock data
  const conversations = mockConversations
  
  // Auth user data
  const userTeams = user?.teams?.map(team => team.name) || ["Technical", "Billing", "Product"]
  
  // Filtered conversations based on status and team
  const filteredConversations = conversations.filter((conversation) => {
    const statusMatch = filterStatus === "all" || conversation.status === filterStatus
    const teamMatch = filterTeam === "all" || conversation.team === filterTeam
    return statusMatch && teamMatch
  })
  
  // Helper functions
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case "new": return "text-blue-500"
      case "active": return "text-green-500"
      case "waiting": return "text-yellow-500"
      case "resolved": return "text-gray-500"
      default: return "text-gray-500"
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case "new": return "🔵"
      case "active": return "🟢"
      case "waiting": return "🟡"
      case "resolved": return "⚪️"
      default: return "⚪️"
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "high": return "bg-red-100 text-red-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      case "low": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }
  
  // Event handlers
  const handleAddNote = () => {
    if (internalNote.trim()) {
      // In a real app, this would call an API to add the note
      alert(`Note added: ${internalNote}`)
      setInternalNote("")
    }
  }
  
  const handleTransfer = () => {
    setShowTransferModal(true)
  }
  
  const executeTransfer = () => {
    if (!transferEmail.trim()) {
      alert("Please enter an agent email")
      return
    }
    
    const conversation = conversations.find(c => c.id === selectedConversation)
    
    if (conversation) {
      console.log(`Transferring conversation ${conversation.id} to ${transferEmail}`)
      // In real app, this would call an API
      alert(`Conversation "${conversation.subject}" transferred to ${transferEmail}`)
      setShowTransferModal(false)
      setTransferEmail("")
    }
  }
  
  // Authentication checks - do these after all hooks are called
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">V</span>
          </div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    )
  }
  
  // Auth check - redirect if not authenticated or not agent
  if (!isAuthenticated || (user?.role !== 'agent' && user?.role !== 'admin' && user?.role !== 'founder')) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  return (
    <div className="h-full flex">
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
              {userTeams.map(team => (
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

      {/* Main Conversation Content */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <div className="h-full flex flex-col">
            {/* Conversation Header */}
            <Card className="rounded-none border-0 border-b">
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
              <Card className="mb-4 mx-4 mt-4">
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
            <div className="flex-1 flex flex-col px-4 pb-4">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-muted/10 p-4 rounded-lg">
                <div className="space-y-4">
                  {/* Sample messages - replace with real data */}
                  <div className="flex justify-end">
                    <div className="max-w-xs bg-primary text-primary-foreground rounded-lg px-3 py-2">
                      <p className="text-sm">Hello! How can I help you today?</p>
                      <span className="text-xs opacity-70">12:34 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-xs bg-background border rounded-lg px-3 py-2">
                      <p className="text-sm">Hi! I&apos;m having trouble with my account login.</p>
                      <span className="text-xs text-muted-foreground">12:35 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-xs bg-primary text-primary-foreground rounded-lg px-3 py-2">
                      <p className="text-sm">I&apos;d be happy to help you with that. Can you tell me what error message you&apos;re seeing?</p>
                      <span className="text-xs opacity-70">12:36 PM</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message Input */}
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input placeholder="Type your message..." className="flex-1" />
                  <Button>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="text-center p-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to start helping customers
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Transfer Conversation</CardTitle>
              <CardDescription>
                Transfer this conversation to another agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent Email</label>
                  <Input 
                    placeholder="agent@company.com" 
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        executeTransfer()
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowTransferModal(false)
                      setTransferEmail("")
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={executeTransfer} className="flex-1">
                    <UserMinus className="mr-2 h-4 w-4" />
                    Transfer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

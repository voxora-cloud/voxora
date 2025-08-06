"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { 
  MessageCircle, 
  Phone,
  Search, 
  Filter,
  Plus,
  User,
  Tag,
  StickyNote,
  ArrowRight,
  MoreVertical,
  Send,
  Paperclip
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

// Define types for our conversation components
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

export function ConversationDashboard() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  
  // State
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTeam, setFilterTeam] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Use mock data
  const conversations = mockConversations
  
  // Auth user data
  const userTeams = user?.teams?.map(team => team.name) || ["Technical", "Billing", "Product"]
  
  // Filtered conversations based on status, team and search query
  const filteredConversations = conversations.filter((conversation) => {
    const statusMatch = filterStatus === "all" || conversation.status === filterStatus;
    const teamMatch = filterTeam === "all" || conversation.team === filterTeam;
    const searchMatch = !searchQuery || 
      conversation.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && teamMatch && searchMatch;
  });
  
  // Helper functions
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
      <div className={`md:w-80 border-r border-border bg-card flex flex-col ${selectedConversation ? 'hidden md:flex' : 'w-full'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-primary/10 text-primary">
                {filteredConversations.length}
              </Button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
              className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                selectedConversation === conversation.id ? 'bg-accent/30' : ''
              }`}
              onClick={() => router.push(`/support/dashboard/chat/${conversation.id}`)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  conversation.status === "active" ? 'bg-green-100' : 
                  conversation.status === "new" ? 'bg-blue-100' : 
                  conversation.status === "waiting" ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  <span className="text-base font-semibold">
                    {conversation.customerName.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {conversation.customerName}
                    </h3>
                    <div className="flex items-center">
                      <span className={`text-xs ${
                        conversation.status === "active" ? 'text-green-600' : 
                        conversation.status === "new" ? 'text-blue-600' : 
                        conversation.status === "waiting" ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {formatTime(conversation.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate max-w-[80%]">
                      <span className="font-medium text-xs mr-1 text-foreground">{conversation.subject}:</span> 
                      {conversation.lastMessage}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-1 space-x-1">
                    {/* Priority */}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getPriorityColor(conversation.priority)}`}>
                      {conversation.priority}
                    </span>
                    
                    {/* Team */}
                    <span className="text-xs bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded-full">
                      {conversation.team}
                    </span>
                    
                    {/* Tags */}
                    {conversation.tags.slice(0, 1).map((tag) => (
                      <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    
                    {/* Call indicator */}
                    {conversation.type === "call" && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center">
                        <Phone className="h-3 w-3 mr-0.5" /> Call
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col bg-muted/10 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <ConversationView 
            conversation={conversations.find(c => c.id === selectedConversation)!}
            onClose={() => setSelectedConversation(null)}
          />
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

// ConversationView component to display the selected conversation
function ConversationView({ conversation, onClose }: { conversation: Conversation, onClose: () => void }) {
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [internalNote, setInternalNote] = useState("")
  const [showNotes, setShowNotes] = useState(false)

  // Initialize messages array if it doesn't exist
  if (!conversation.messages) {
    conversation.messages = [
      {
        id: "m1",
        sender: "agent",
        content: "Hello! How can I help you today?",
        timestamp: new Date(Date.now() - 60000 * 10)
      },
      {
        id: "m2",
        sender: "customer",
        content: "Hi! I'm having trouble with my account login.",
        timestamp: new Date(Date.now() - 60000 * 8)
      },
      {
        id: "m3",
        sender: "agent",
        content: "I'd be happy to help you with that. Can you tell me what error message you're seeing?",
        timestamp: new Date(Date.now() - 60000 * 5)
      }
    ]
  }

  const handleSendMessage = () => {
    if (!message.trim()) return

    // In a real app, you would send this to your API
    const newMessage: Message = {
      id: `m${conversation.messages!.length + 1}`,
      sender: "agent",
      content: message,
      timestamp: new Date()
    }

    conversation.messages!.push(newMessage)
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
    <div className="h-full flex flex-col p-4 w-full">
      {/* Conversation Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="mr-2 md:hidden"
                onClick={onClose}
              >
                ←
              </Button>
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
              {conversation.tags.map((tag) => (
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
              {conversation.messages!.map((msg) => (
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

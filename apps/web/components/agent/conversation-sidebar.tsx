"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Filter,
  Phone,
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

export function ConversationSidebar() {
  const router = useRouter()
  const { user } = useAuth()
  
  // State
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

  return (
    <div className="w-full md:w-64 border-r border-border bg-card flex flex-col">
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
            className="p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
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
  )
}

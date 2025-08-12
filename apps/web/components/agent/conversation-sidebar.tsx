"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { Search, Bell } from "lucide-react"
import io from 'socket.io-client'

interface Conversation {
  _id: string
  participants: Array<{
    _id: string
    name: string
    email: string
    avatar?: string
  }>
  subject: string
  lastMessage?: {
    content: string
    createdAt: string
    senderId: {
      name: string
    }
  }
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tags: string[]
  metadata?: {
    source?: string
    customer?: {
      name?: string
      email?: string
      phone?: string
      // other widget metadata like initialMessage, startedAt may exist
      initialMessage?: string
      startedAt?: string
    }
  // backward compatibility with older records
  customerName?: string
  }
  unreadCount: number
  createdAt: string
  lastMessageAt?: string
}

export function ConversationSidebar() {
  const router = useRouter()
  const { user } = useAuth()
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)
  const [notifications, setNotifications] = useState<Array<{id: string; type: string; title: string; message: string; timestamp: Date}>>([])

  // Fetch conversations
  useEffect(() => {
    fetchConversations()
  }, [filterStatus])

  // Initialize socket connection for real-time updates
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token')
  const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002', {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      })

      socketInstance.on('connect', () => {
        console.log('Agent socket connected')
      })

      socketInstance.on('new_widget_conversation', (data) => {
        console.log('New widget conversation:', data)
        setNotifications(prev => [...prev, {
          id: data.conversationId,
          type: 'new_conversation',
          title: 'New Customer Message',
          message: `${data.customer.name} started a conversation: ${data.subject}`,
          timestamp: new Date(data.timestamp)
        }])
        
        // Refresh conversations list
        fetchConversations()
      })

      socketInstance.on('new_message', (data) => {
        if (data?.message?.metadata?.source === 'widget') {
          // Update the conversation in the list
          setConversations(prev => prev.map(conv => 
            conv._id === data.conversationId 
              ? { ...conv, lastMessage: data.message, unreadCount: (conv.unreadCount || 0) + 1 }
              : conv
          ))
        }
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'}/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCustomerName = (conversation: Conversation) => {
  return conversation.metadata?.customer?.name ||
       conversation.metadata?.customerName ||
       conversation.participants[0]?.name ||
       'Unknown Customer'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${Math.floor(hours)}h ago`
    return date.toLocaleDateString()
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conversation => {
    const statusMatch = filterStatus === "all" || conversation.status === filterStatus
    const searchMatch = !searchQuery || 
      (conversation.metadata?.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       conversation.metadata?.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       conversation.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return statusMatch && searchMatch
  })

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="p-2 bg-blue-50 border-b border-border">
          {notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className="p-2 bg-white rounded border text-sm mb-1">
              <div className="font-medium">{notification.title}</div>
              <div className="text-gray-600 text-xs">{notification.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className="p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors"
              onClick={() => {
                // Join conversation via socket when clicking
                if (socket) {
                  socket.emit('join_conversation', conversation._id)
                }
                router.push(`/support/dashboard/chat/${conversation._id}`)
              }}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium
                  ${conversation.status === "open" ? 'bg-green-500' :
                    conversation.status === "pending" ? 'bg-yellow-500' :
                    conversation.status === "resolved" ? 'bg-blue-500' : 'bg-gray-500'}
                `}>
                  {getCustomerName(conversation).split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Customer Name & Status */}
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {getCustomerName(conversation)}
                    </h4>
                    <span className={`
                      text-xs px-2 py-1 rounded-full
                      ${conversation.status === "open" ? 'text-green-600 bg-green-100' :
                        conversation.status === "pending" ? 'text-yellow-600 bg-yellow-100' :
                        conversation.status === "resolved" ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'}
                    `}>
                      {conversation.status}
                    </span>
                  </div>

                  {/* Subject */}
                  <p className="text-sm font-medium text-foreground mb-1 truncate">
                    {conversation.subject}
                  </p>

                  {/* Last Message */}
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {conversation.metadata?.source === 'widget' && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                          Widget
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessageAt || conversation.createdAt)}
                      </span>
                    </div>

                    {conversation.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

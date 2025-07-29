"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Paperclip, Smile, MoreVertical, Phone, Video } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "support"
  timestamp: Date
  senderName: string
  avatar?: string
}

interface ChatInterfaceProps {
  conversationId?: string
  isSupport?: boolean
}

export function ChatInterface({ conversationId, isSupport = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      sender: "support",
      timestamp: new Date(Date.now() - 300000),
      senderName: "Sarah Williams",
      avatar: "/avatars/support1.jpg"
    },
    {
      id: "2",
      content: "Hi! I'm having trouble with my account login. It keeps saying my password is incorrect even though I'm sure it's right.",
      sender: "user",
      timestamp: new Date(Date.now() - 240000),
      senderName: "John Doe",
      avatar: "/avatars/user1.jpg"
    },
    {
      id: "3",
      content: "I understand how frustrating that can be. Let me help you resolve this issue. Can you tell me the email address associated with your account?",
      sender: "support",
      timestamp: new Date(Date.now() - 180000),
      senderName: "Sarah Williams"
    }
  ])

  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: isSupport ? "support" : "user",
      timestamp: new Date(),
      senderName: isSupport ? "Support Agent" : "You"
    }

    setMessages(prev => [...prev, message])
    setNewMessage("")

    // Simulate typing indicator for response
    if (!isSupport) {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const response: Message = {
          id: (Date.now() + 1).toString(),
          content: "Thank you for your message. I'm looking into this for you.",
          sender: "support",
          timestamp: new Date(),
          senderName: "Sarah Williams"
        }
        setMessages(prev => [...prev, response])
      }, 2000)
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Chat Header */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {isSupport ? "JD" : "SW"}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">
                {isSupport ? "John Doe" : "Sarah Williams"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isSupport ? "Customer" : "Support Agent"} • Online
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === (isSupport ? "support" : "user") ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
              message.sender === (isSupport ? "support" : "user") ? "flex-row-reverse space-x-reverse" : ""
            }`}>
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">
                  {message.senderName.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              
              <div className={`rounded-2xl px-4 py-2 ${
                message.sender === (isSupport ? "support" : "user")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === (isSupport ? "support" : "user")
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium">SW</span>
              </div>
              <div className="bg-muted text-foreground rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="pr-10"
            />
            <Button variant="ghost" size="icon" type="button" className="absolute right-1 top-1/2 -translate-y-1/2">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

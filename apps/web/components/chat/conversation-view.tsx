"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-context";
import { MoreVertical, Send, Paperclip, ArrowLeft, Clock, Edit, User } from "lucide-react";
import { useRouter } from "next/navigation";
import io, { Socket } from "socket.io-client";
import { RouteConversationDialog } from "./route-conversation-dialog";
import { StatusSelector } from "./status-selector";

// Define types
interface Message {
  _id: string;
  senderId: string;
  content: string;
  type: string;
  metadata: {
    senderName: string;
    senderEmail: string;
    source: string;
  };
  createdAt: string;
}

interface Customer {
  name: string;
  email: string;
  phone?: string;
}

interface ConversationData {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  visitor?: {
    sessionId: string;
    name: string;
    email: string;
    isAnonymous: boolean;
  };
  metadata: {
    customer: Customer;
    source?: string;
  };
  messages: Message[];
}

interface ConversationViewProps {
  conversationId: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const [conversation, setConversation] = useState<ConversationData | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ name: "", email: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const customerTypingHideRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isAgentTypingRef = React.useRef(false);
  const { user } = useAuth();
  const router = useRouter();

  // Initialize socket and fetch conversation
  useEffect(() => {
    if (!conversationId) return;
    let sock: Socket | null = null;

    const fetchConversation = async () => {
      try {
        setLoading(true);

        // Initialize socket connection
        const token = localStorage.getItem("token");
        const socketInstance = io(
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002",
          {
            auth: { token },
            transports: ["websocket", "polling"],
          },
        );

        sock = socketInstance;
        socketInstance.on("connect", () => {
          console.log("Connected to conversation socket");
          // Join the conversation room
          socketInstance.emit("join_conversation", conversationId);
        });

        // Listen for new messages
        socketInstance.on(
          "new_message",
          (data: { conversationId: string; message: Message }) => {
            if (data.conversationId !== conversationId) return;
            // Skip echo of our own agent message, since we do optimistic update
            if (data.message?.metadata?.source === "web") return;
            setMessages((prev) => {
              if (prev.some((m) => m._id === data.message._id)) return prev;
              return [...prev, data.message];
            });
          },
        );

        // Typing indicators from customer
        socketInstance.on(
          "customer_typing",
          (data: { conversationId: string }) => {
            if (data.conversationId !== conversationId) return;
            setIsCustomerTyping(true);
            if (customerTypingHideRef.current)
              clearTimeout(customerTypingHideRef.current);
            customerTypingHideRef.current = setTimeout(
              () => setIsCustomerTyping(false),
              3000,
            );
          },
        );

        socketInstance.on(
          "customer_stopped_typing",
          (data: { conversationId: string }) => {
            if (data.conversationId !== conversationId) return;
            setIsCustomerTyping(false);
            if (customerTypingHideRef.current) {
              clearTimeout(customerTypingHideRef.current);
              customerTypingHideRef.current = null;
            }
          },
        );

        // Listen for visitor info updates
        socketInstance.on(
          "visitor_info_updated",
          (data: { conversationId: string; visitorName: string; visitorEmail: string }) => {
            if (data.conversationId !== conversationId) return;
            setConversation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                visitor: {
                  ...prev.visitor!,
                  name: data.visitorName,
                  email: data.visitorEmail,
                  isAnonymous: false,
                },
              };
            });
          },
        );

        setSocket(socketInstance);

        // Fetch conversation data and messages
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1"}/conversations/${conversationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConversation(data.data.conversation);
            setMessages(data.data.messages || []);
          }
        } else {
          // Handle case where conversation doesn't exist yet or failed to fetch
          console.log("Could not fetch conversation, it might be new");
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();

    return () => {
      try {
        if (sock) {
          sock.emit("leave_conversation", conversationId);
          sock.off("new_message");
          sock.off("customer_typing");
          sock.off("customer_stopped_typing");
          sock.off("visitor_info_updated");
          sock.disconnect();
        }
        // ensure typing is stopped
        if (isAgentTypingRef.current && sock) {
          try {
            sock.emit("typing_stop", { conversationId });
          } catch {
            void 0;
          }
          isAgentTypingRef.current = false;
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (customerTypingHideRef.current)
          clearTimeout(customerTypingHideRef.current);
      } catch {
        // no-op
      }
    };
  }, [conversationId]); // socket is intentionally omitted to avoid recreating connection

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      conversationId,
      content: newMessage,
      type: "text",
      metadata: {
        senderName: user?.name || "Agent",
        senderEmail: user?.email || "",
        source: "web",
      },
    };

    // stop typing when sending
    if (isAgentTypingRef.current) {
      try {
        socket.emit("typing_stop", { conversationId });
      } catch {
        void 0;
      }
      isAgentTypingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }

    // Send via socket
    socket.emit("send_message", messageData);

    // Add optimistic update
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      senderId: user?.id || "agent",
      content: newMessage,
      type: "text",
      metadata: messageData.metadata,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Emit agent typing events with debounce
  const handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    const val = e.target.value;
    setNewMessage(val);
    if (!socket) return;
    if (conversationId && !isAgentTypingRef.current && val.trim().length > 0) {
      socket.emit("typing_start", { conversationId });
      isAgentTypingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (isAgentTypingRef.current) {
        socket.emit("typing_stop", { conversationId });
        isAgentTypingRef.current = false;
      }
    }, 1500);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAgentMessage = (message: Message) => {
    return message.metadata?.source === "web" || message.senderId === user?.id;
  };

  const handleUpdateCustomerInfo = async () => {
    if (!updateForm.name.trim() && !updateForm.email.trim()) {
      alert("Please provide at least a name or email");
      return;
    }

    if (!conversation?.visitor?.sessionId) {
      alert("Cannot update visitor info: session ID not found");
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1"}/conversations/${conversationId}/visitor`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: updateForm.name.trim() || undefined,
            email: updateForm.email.trim() || undefined,
            sessionId: conversation.visitor.sessionId,
          }),
        },
      );

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            visitor: {
              ...prev.visitor!,
              name: updateForm.name || prev.visitor!.name,
              email: updateForm.email || prev.visitor!.email,
              isAnonymous: !(updateForm.name && updateForm.email),
            },
          };
        });
        
        setIsUpdateDialogOpen(false);
        setUpdateForm({ name: "", email: "" });
        alert("Customer information updated successfully!");
      } else {
        alert(`Failed to update: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating customer info:", error);
      alert("Failed to update customer information");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateDialog = () => {
    // Pre-fill form with current data
    setUpdateForm({
      name: conversation?.visitor?.name || "",
      email: conversation?.visitor?.email || "",
    });
    setIsUpdateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const customerName =
    conversation?.visitor?.name || 
    conversation?.metadata?.customer?.name || 
    "Anonymous User";
  const customerEmail = 
    conversation?.visitor?.email !== "anonymous@temp.local"
      ? conversation?.visitor?.email
      : conversation?.metadata?.customer?.email || "No email provided";
  const isAnonymous = conversation?.visitor?.isAnonymous ?? true;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/support/dashboard")}
            className="md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
              <span className="text-blue-700 font-semibold">
                {customerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
              {isAnonymous && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white" title="Anonymous user"></span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">{customerName}</h2>
                {isAnonymous && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                    Anonymous
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{customerEmail}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openUpdateDialog}
                className="cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                Update Info
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Customer Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={updateForm.name}
                    onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                    placeholder="Customer name"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={updateForm.email}
                    onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="cursor-text"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsUpdateDialogOpen(false)}
                    disabled={isUpdating}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateCustomerInfo}
                    disabled={isUpdating}
                    className="cursor-pointer"
                  >
                    {isUpdating ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <RouteConversationDialog 
            conversationId={conversationId}
            onRouted={() => {
              // Refresh conversation data
              const fetchUpdated = async () => {
                const token = localStorage.getItem("token");
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/conversations/${conversationId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.ok) {
                  const data = await response.json();
                  setConversation(data.data.conversation);
                }
              };
              fetchUpdated();
            }}
          />

          <StatusSelector
            conversationId={conversationId}
            currentStatus={conversation?.status || "open"}
            onStatusChange={(newStatus) => {
              if (conversation) {
                setConversation({ ...conversation, status: newStatus });
              }
            }}
          />
          
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${isAgentMessage(message) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                max-w-[70%] px-4 py-3 rounded-lg
                ${
                  isAgentMessage(message)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }
              `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium opacity-75">
                    {message.metadata?.senderName ||
                      (isAgentMessage(message) ? "You" : "Customer")}
                  </span>
                  <span className="text-xs opacity-50 ml-2">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {isCustomerTyping && (
        <div className="px-4 pb-2 text-sm text-muted-foreground italic">
          Customer is typing…
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 min-h-[80px] resize-none"
            disabled={loading}
          />
          <div className="flex flex-col space-y-2">
            <Button variant="outline" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || loading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

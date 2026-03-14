import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { useAuth } from "@/domains/auth/hooks";
import { MoreVertical, Send, Paperclip, ArrowLeft, Clock, User } from "lucide-react";
import { useNavigate } from "react-router";
import io, { Socket } from "socket.io-client";
import { RouteConversationDialog } from "./route-conversation-dialog";
import { StatusSelector } from "./status-selector";
import { useQueryClient } from "@tanstack/react-query";
import { useConversationDetail, useUpdateVisitorInfo } from "../hooks";
import type { ConversationDetail, ConversationMessage } from "../types/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

interface ConversationViewProps {
  conversationId: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ name: "", email: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isAgentTypingRef = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conversationResponse, isLoading } = useConversationDetail(conversationId);
  const updateVisitorInfo = useUpdateVisitorInfo();
  const basePath = "/dashboard/conversations/inbox";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isCustomerTyping]);

  useEffect(() => {
    if (!conversationId) return undefined;
    let sock: Socket | null = null;

    const token = localStorage.getItem("token");
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    sock = socketInstance;
    socketInstance.on("connect", () => {
      socketInstance.emit("join_conversation", conversationId);
    });

    socketInstance.on(
      "new_message",
      (data: { conversationId: string; message: ConversationMessage }) => {
        if (data.conversationId !== conversationId) return;
        if (data.message?.metadata?.source === "web") return;
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
      },
    );

    socketInstance.on(
      "customer_typing",
      (data: { conversationId: string }) => {
        if (data.conversationId !== conversationId) return;
        setIsCustomerTyping(true);
        if (customerTypingHideRef.current) {
          clearTimeout(customerTypingHideRef.current);
        }
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

    socketInstance.on(
      "visitor_info_updated",
      (data: { conversationId: string; visitorName: string; visitorEmail: string }) => {
        if (data.conversationId !== conversationId) return;
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            visitor: {
              ...prev.visitor,
              name: data.visitorName,
              email: data.visitorEmail,
              isAnonymous: false,
            },
          };
        });
      },
    );

    setSocket(socketInstance);

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
        void 0;
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationResponse?.data?.conversation) return;
    setConversation(conversationResponse.data.conversation);
    setMessages(conversationResponse.data.messages || []);
  }, [conversationResponse]);

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

    if (isAgentTypingRef.current) {
      try {
        socket.emit("typing_stop", { conversationId });
      } catch {
        void 0;
      }
      isAgentTypingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }

    socket.emit("send_message", messageData);

    const tempMessage: ConversationMessage = {
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

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isAgentMessage = (message: ConversationMessage) =>
    message.metadata?.source === "web" || message.senderId === user?.id;

  const getFileUrl = (fileKey: string, downloadUrl?: string) =>
    downloadUrl || `${API_URL}/storage/file?key=${encodeURIComponent(fileKey)}`;

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📕";
    if (mimeType?.includes("word")) return "📝";
    if (mimeType === "text/plain") return "📃";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderMessageContent = (message: ConversationMessage) => {
    if (message.type === "file" || message.type === "image") {
      try {
        const attachment = JSON.parse(message.content) as {
          fileName: string;
          fileSize: number;
          mimeType: string;
          fileKey: string;
          downloadUrl?: string | null;
        };
        const url = attachment.fileKey
          ? getFileUrl(attachment.fileKey, attachment.downloadUrl || undefined)
          : "";

        if (attachment.mimeType?.startsWith("image/") && url) {
          return (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={attachment.fileName}
                className="max-w-[220px] max-h-[180px] rounded-lg block cursor-pointer"
              />
            </a>
          );
        }

        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 no-underline hover:opacity-80"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
              {getFileIcon(attachment.mimeType)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate max-w-[180px]">
                {attachment.fileName}
              </span>
              <span className="text-xs opacity-70">
                {formatFileSize(attachment.fileSize)}
              </span>
            </div>
          </a>
        );
      } catch {
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
      }
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  const sendFileMessage = async (file: File) => {
    if (!socket) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("File too large (max 10 MB)");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const urlResp = await fetch(`${API_URL}/storage/conversation-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
      });

      if (!urlResp.ok) throw new Error("Failed to get upload URL");
      const { data } = await urlResp.json();

      const putResp = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResp.ok) throw new Error("Storage upload failed");

      const fileContent = JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileKey: data.fileKey,
        downloadUrl: data.downloadUrl || null,
      });
      const msgType = file.type.startsWith("image/") ? "image" : "file";
      const messageData = {
        conversationId,
        content: fileContent,
        type: msgType,
        metadata: {
          senderName: user?.name || "Agent",
          senderEmail: user?.email || "",
          source: "web",
        },
      };
      socket.emit("send_message", messageData);

      const tempMessage: ConversationMessage = {
        _id: `temp-${Date.now()}`,
        senderId: user?.id || "agent",
        content: fileContent,
        type: msgType,
        metadata: messageData.metadata,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
    } catch (err: any) {
      alert(`File upload failed: ${err?.message || "Unknown error"}`);
    }
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
      await updateVisitorInfo.mutateAsync({
        conversationId,
        name: updateForm.name.trim() || undefined,
        email: updateForm.email.trim() || undefined,
        sessionId: conversation.visitor.sessionId,
      });

      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          visitor: {
            ...prev.visitor,
            name: updateForm.name || prev.visitor?.name || "",
            email: updateForm.email || prev.visitor?.email || "",
            isAnonymous: !(updateForm.name && updateForm.email),
          },
        };
      });

      setIsUpdateDialogOpen(false);
      setUpdateForm({ name: "", email: "" });
      alert("Customer information updated successfully!");
    } catch (error) {
      console.error("Error updating customer info:", error);
      alert("Failed to update customer information");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateDialog = () => {
    setUpdateForm({
      name: conversation?.visitor?.name || "",
      email: conversation?.visitor?.email || "",
    });
    setIsUpdateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
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
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(basePath)}
            className="md:hidden cursor-pointer"
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
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"
                  title="Anonymous user"
                />
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
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, name: e.target.value })
                    }
                    placeholder="Customer name"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={updateForm.email}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, email: e.target.value })
                    }
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
              queryClient.invalidateQueries({
                queryKey: ["conversation", conversationId],
              });
            }}
          />

          <StatusSelector
            conversationId={conversationId}
            currentStatus={conversation?.status || "open"}
            onStatusChange={(newStatus) => {
              if (conversation) {
                setConversation({ ...conversation, status: newStatus });
              }
              if (newStatus !== "open") {
                navigate(basePath);
              }
            }}
          />

          <Button variant="ghost" size="icon" className="cursor-pointer">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/70 [&::-webkit-scrollbar-track]:bg-transparent">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${
                  isAgentMessage(message) ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={
                    "max-w-[70%] px-4 py-3 rounded-lg " +
                    (isAgentMessage(message)
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border")
                  }
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
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {isCustomerTyping && (
        <div className="px-4 pb-2 text-sm text-muted-foreground italic">
          Customer is typing...
        </div>
      )}

      <div className="p-4 border-t border-border bg-card">
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 min-h-[80px] resize-none cursor-text"
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  sendFileMessage(file);
                  e.target.value = "";
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="cursor-pointer"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              size="icon"
              className="cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

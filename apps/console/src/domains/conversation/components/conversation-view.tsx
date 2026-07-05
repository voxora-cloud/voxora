import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

import { useAuth } from "@/domains/auth/hooks";
import { MoreVertical, Send, ArrowLeft, Clock, User, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Cpu, Bot, ChevronRight, Info } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import io, { Socket } from "socket.io-client";
import { RouteConversationDialog } from "./route-conversation-dialog";
import { StatusSelector } from "./status-selector";
import { UpdateContactDialog } from "./update-contact-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useConversationDetail, useAgentRuns } from "../hooks";
import type { ConversationDetail, ConversationMessage } from "../types/types";
import { useContacts } from "@/domains/contacts/hooks/use-contacts";
import { toContactViewModel } from "@/domains/contacts/types/types";
import { ContactDetailsCard } from "@/domains/contacts/components/contact-details-card";

import { playNotificationSound } from "@/shared/lib/audio";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

function parseMessageContentToHtml(content: string): string {
  if (!content) return "";
  let s = content;

  // Escape HTML tags except our custom interactive ones first
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Restore the specific XML tags we want to parse
  s = s.replace(/&lt;interaone-form\s+id=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/interaone-form&gt;/g, '<interaone-form id="$1">$2</interaone-form>');
  s = s.replace(/&lt;interaone-input\s+name=&quot;([^&]+?)&quot;\s+placeholder=&quot;([^&]+?)&quot;\s*(?:\/)?&gt;/g, '<interaone-input name="$1" placeholder="$2" />');
  s = s.replace(/&lt;interaone-button\s+action=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-button&gt;/g, '<interaone-button action="$1">$2</interaone-button>');
  s = s.replace(/&lt;interaone-checkbox\s+name=&quot;([^&]+?)&quot;&gt;([\s\S]+?)&lt;\/interaone-checkbox&gt;/g, '<interaone-checkbox name="$1">$2</interaone-checkbox>');
  s = s.replace(/&lt;interaone-radio\s+name=&quot;([^&]+?)&quot;\s+options=&quot;([^&]+?)&quot;\s*(?:\/)?&gt;/g, '<interaone-radio name="$1" options="$2" />');

  // Unescape divs to support HTML layout blocks
  s = s.replace(/&lt;div\s*([\s\S]*?)&gt;/g, (_: string, attrs: string) => {
    const cleanAttrs = attrs.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    return `<div ${cleanAttrs}>`.replace(/\s+>/, '>');
  });
  s = s.replace(/&lt;\/div&gt;/g, '</div>');

  // Strip thinking blocks
  s = s.replace(/&lt;thinking&gt;[\s\S]*?&lt;\/thinking&gt;/gi, '');
  s = s.replace(/&lt;thought&gt;[\s\S]*?&lt;\/thought&gt;/gi, '');

  // Parse Form Container
  s = s.replace(/<interaone-form\s+id="([^"]+?)">([\s\S]*?)<\/interaone-form>/g, (_: string, __: string, innerContent: string) => {
    let content = innerContent;
    // Inside form, parse input
    content = content.replace(/<interaone-input\s+name="([^"]+?)"\s+placeholder="([^"]+?)"\s*(?:\/)?>/g,
      '<div class="mb-2"><label class="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">$1</label><div class="w-full px-2.5 py-1.5 text-xs bg-muted/40 border border-border/80 rounded text-muted-foreground/80 select-none">$2</div></div>'
    );
    // Inside form, parse checkbox
    content = content.replace(/<interaone-checkbox\s+name="([^"]+?)">([\s\S]+?)<\/interaone-checkbox>/g,
      '<div class="flex items-center gap-2 mb-2"><input type="checkbox" disabled class="rounded border-border text-primary pointer-events-none scale-90" /><span class="text-xs text-foreground/80">$2</span></div>'
    );
    // Inside form, parse radio
    content = content.replace(/<interaone-radio\s+name="([^"]+?)"\s+options="([^"]+?)"\s*(?:\/)?>/g, (_: string, name: string, optionsStr: string) => {
      const options = optionsStr.split(',').map((o: string) => o.trim());
      const radiosHtml = options.map((opt: string) => `
        <div class="flex items-center gap-2">
          <input type="radio" disabled class="text-primary pointer-events-none scale-90" />
          <span class="text-xs text-foreground/80">${opt}</span>
        </div>
      `).join('');
      return `<div class="mb-2"><label class="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">${name}</label><div class="flex flex-col gap-1.5 pl-1">${radiosHtml}</div></div>`;
    });

    return `
      <div class="border border-border/80 rounded-xl p-3 bg-muted/20 my-2.5 max-w-sm select-none">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 select-none">Form Component (Read-Only)</div>
        <div class="space-y-1">${content}</div>
        <div class="w-full text-center py-1.5 mt-2 bg-secondary text-secondary-foreground border border-border text-xs rounded-lg font-medium opacity-50 select-none">Submit Form</div>
      </div>
    `;
  });

  // Parse stand-alone input
  s = s.replace(/<interaone-input\s+name="([^"]+?)"\s+placeholder="([^"]+?)"\s*(?:\/)?>/g, 
    '<div class="flex items-center gap-2 max-w-sm border border-border/80 rounded-lg bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/90 my-2 select-none"><span class="font-semibold text-foreground">$2</span> <span class="text-[10px] text-muted-foreground/60">(Triage input request)</span></div>'
  );

  // Parse stand-alone suggestion buttons
  s = s.replace(/<interaone-button\s+action="([^"]+?)">([\s\S]+?)<\/interaone-button>/g,
    '<span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border mr-1.5 mb-1.5 shadow-sm opacity-90 select-none cursor-default">$2</span>'
  );

  // Parse stand-alone checkbox
  s = s.replace(/<interaone-checkbox\s+name="([^"]+?)">([\s\S]+?)<\/interaone-checkbox>/g,
    '<div class="flex items-center gap-2 text-xs text-muted-foreground/90 my-2 select-none"><input type="checkbox" disabled class="rounded border-border text-primary scale-90" /><span>$2</span></div>'
  );

  // Parse stand-alone radio
  s = s.replace(/<interaone-radio\s+name="([^"]+?)"\s+options="([^"]+?)"\s*(?:\/)?>/g, (_: string, name: string, optionsStr: string) => {
    const options = optionsStr.split(',').map((o: string) => o.trim());
    const radiosHtml = options.map((opt: string) => `
      <div class="flex items-center gap-2">
        <input type="radio" disabled class="text-primary scale-90" />
        <span>${opt}</span>
      </div>
    `).join('');
    return `
      <div class="my-2 select-none">
        <div class="text-[10px] uppercase font-semibold text-muted-foreground mb-1">${name}</div>
        <div class="flex flex-col gap-1 pl-1 text-xs text-muted-foreground">${radiosHtml}</div>
      </div>
    `;
  });

  // Markdown: Code blocks
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-muted p-2 rounded text-xs font-mono my-2 overflow-x-auto border border-border select-all">$1</pre>');

  // Markdown: Inline code
  s = s.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/60">$1</code>');

  // Markdown: Bold + Italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');

  // Collapse newlines and surrounding indentation between HTML tags to prevent layout gaps
  s = s.replace(/>\s*\n\s*</g, '><');

  return s;
}

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
  const [activeTab, setActiveTab] = useState<"chat" | "runs">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isAgentTypingRef = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: conversationResponse, isLoading } = useConversationDetail(conversationId);
  const { data: contacts = [] } = useContacts();
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(true);

  const matchedContact = useMemo(() => {
    if (!conversation) return null;
    const conversationSessionId = conversation.sessionId;
    if (!conversationSessionId) return null;

    const raw = contacts.find(c => c.sessionId === conversationSessionId) || null;
    return raw ? toContactViewModel(raw) : null;
  }, [contacts, conversation]);

  const contactDetails = useMemo(() => {
    if (!conversation) return null;
    if (matchedContact) return matchedContact;

    const name = conversation.metadata?.customer?.name || conversation.metadata?.customerName || "Anonymous Visitor";
    const email = conversation.metadata?.customer?.email || "";
    const phone = conversation.metadata?.customer?.phone || "";
    const sessionId = conversation.sessionId || "";

    const displayEmail = (email && email !== "anonymous@temp.local" && !email.endsWith("@anonymous.interaone")) ? email : "";

    return {
      id: "temp-contact",
      name,
      email: displayEmail,
      phone: phone || "Not provided",
      sessionId,
      company: conversation.metadata?.customer?.company || "",
      notes: [],
      tags: [],
      conversations: [],
      insights: {
        sentiment: "neutral" as const,
        summary: "No AI insights generated yet.",
        topics: [],
      },
      conflicts: [],
      lastActivity: conversation.createdAt || new Date().toISOString(),
      createdAt: conversation.createdAt || new Date().toISOString(),
      isOnline: false,
      conversationCount: 1,
    };
  }, [matchedContact, conversation]);

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
        
        playNotificationSound();
        
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


    setSocket(socketInstance);

    return () => {
      try {
        if (sock) {
          sock.emit("leave_conversation", conversationId);
          sock.off("new_message");
          sock.off("customer_typing");
          sock.off("customer_stopped_typing");
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

  useEffect(() => {
    if (conversation) {
      window.dispatchEvent(new Event("interaone_recents_updated"));
    }
  }, [conversation]);

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
    message.metadata?.source === "web" ||
    message.metadata?.source === "ai" ||
    message.senderId === "ai-bot" ||
    message.senderId === user?.id;

  const getBubbleClass = (message: ConversationMessage) => {
    const isAi = message.metadata?.source === "ai" || message.senderId === "ai-bot";
    const isAgent = isAgentMessage(message);

    if (isAi) {
      return "bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 text-foreground shadow-sm";
    }
    if (isAgent) {
      return "bg-primary text-primary-foreground shadow-sm";
    }
    return "bg-card border border-border text-foreground shadow-sm";
  };

  const renderMessageHeader = (message: ConversationMessage) => {
    const isAi = message.metadata?.source === "ai" || message.senderId === "ai-bot";
    const isAgent = isAgentMessage(message);

    if (isAi) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 select-none">
          <Bot className="h-3.5 w-3.5" /> AI Assistant
        </span>
      );
    }

    if (isAgent) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-foreground/90 select-none">
          <User className="h-3.5 w-3.5" /> {message.metadata?.senderName || "Support"} (Agent)
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground select-none">
        <User className="h-3.5 w-3.5" /> {message.metadata?.senderName || customerName} (Customer)
      </span>
    );
  };

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
        return (
          <div 
            className="text-sm whitespace-pre-wrap leading-relaxed select-text"
            dangerouslySetInnerHTML={{ __html: parseMessageContentToHtml(message.content) }}
          />
        );
      }
    }

    return (
      <div 
        className="text-sm whitespace-pre-wrap leading-relaxed select-text"
        dangerouslySetInnerHTML={{ __html: parseMessageContentToHtml(message.content) }}
      />
    );
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

  const customerName = contactDetails?.name || "Anonymous User";
  const customerEmail =
    (contactDetails?.email && contactDetails.email !== "anonymous@temp.local")
      ? contactDetails.email
      : "No email provided";
  const isAnonymous = !contactDetails || contactDetails.id === "temp-contact" || contactDetails.email === "";

  return (
    <div className="h-full flex bg-background overflow-hidden w-full">
      {/* Left Chat / Runs Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-r border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const stateFrom = (location.state as any)?.from;
                if (stateFrom) {
                  navigate(stateFrom);
                } else {
                  const isAssignedToMe = conversation?.assignedTo?._id === user?.id || conversation?.assignedTo === user?.id;
                  if (isAssignedToMe) {
                    navigate("/dashboard/conversations/inbox/assigned");
                  } else {
                    navigate("/dashboard/conversations/inbox/open");
                  }
                }
              }}
              className="cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                <span className="text-blue-700 font-semibold">
                  {customerName
                    .split(" ")
                    .map((n: string) => n[0])
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

            <Button
              variant={isContactSidebarOpen ? "secondary" : "outline"}
              className="h-9 w-28 flex items-center justify-center border border-input cursor-pointer text-xs font-semibold"
              onClick={() => setIsContactSidebarOpen(!isContactSidebarOpen)}
              title={isContactSidebarOpen ? "Hide Contact Details" : "Show Contact Details"}
            >
              <Info className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              Info
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card/60 px-4 shrink-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("runs")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "runs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Agent Execution Logs
          </button>
        </div>

        {activeTab === "chat" ? (
          <>
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
                        className={`max-w-[70%] px-4 py-3 rounded-lg ${getBubbleClass(message)}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="mr-4">
                            {renderMessageHeader(message)}
                          </div>
                          <span className="text-xs opacity-50 ml-2 shrink-0">
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
          </>
        ) : (
          <AgentRunsTab conversationId={conversationId} />
        )}
      </div>

      {/* Right User Contact Sidebar */}
      {contactDetails && isContactSidebarOpen && (
        <div className="w-80 shrink-0 flex flex-col h-full bg-background border-l border-border select-none">
          <div className="p-4 border-b border-border bg-card flex items-center justify-between">
            <h3 className="text-sm font-semibold">Contact details</h3>
            <div className="flex items-center gap-1">
              <UpdateContactDialog
                conversationId={conversationId}
                contactId={contactDetails?.id}
                triggerType="icon"
                visitor={{
                  name: contactDetails?.name,
                  email: contactDetails?.email,
                  phone: contactDetails?.phone !== "Not provided" ? contactDetails?.phone : "",
                  company: contactDetails?.company,
                  tags: contactDetails?.tags,
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setIsContactSidebarOpen(false)}
                title="Minimize panel"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <ContactDetailsCard contact={contactDetails} />
          </div>
        </div>
      )}
    </div>
  );
}

function AgentRunsTab({ conversationId }: { conversationId: string }) {
  const { data: runsResponse, isLoading, refetch } = useAgentRuns(conversationId);
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const runs = runsResponse?.data || [];

  const toggleRun = (id: string) => {
    setExpandedRuns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p>Loading agent execution history...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center bg-background">
        <Bot className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="font-semibold text-foreground">No agent runs recorded</p>
        <p className="text-sm mt-1">The AI Agent hasn't processed any turns in this conversation yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/70 [&::-webkit-scrollbar-track]:bg-transparent">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-foreground">Execution History ({runs.length})</h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs cursor-pointer">
          Refresh
        </Button>
      </div>
      <div className="space-y-3">
        {runs.map((run: any) => {
          const isExpanded = !!expandedRuns[run._id];
          const isSuccess = run.status === "success";
          const dateStr = new Date(run.createdAt).toLocaleString();
          const durationSec = (run.duration / 1000).toFixed(2);

          return (
            <div key={run._id} className="border border-border rounded-lg bg-card overflow-hidden transition-all duration-200">
              {/* Header */}
              <div
                onClick={() => toggleRun(run._id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {isSuccess ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{dateStr}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">Msg Ref: {run.messageId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 self-end sm:self-auto">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-foreground">{durationSec}s duration</p>
                    {run.usage && (
                      <p className="text-[10px] text-muted-foreground">
                        Tokens: {run.usage.totalTokens || 0} ({run.usage.promptTokens || 0} in / {run.usage.completionTokens || 0} out)
                      </p>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Collapsible details */}
              {isExpanded && (
                <div className="border-t border-border bg-card/50 p-4 space-y-4">
                  {/* Summary/Error */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-muted/40 p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground font-medium">Status: </span>
                      <span className={`font-semibold capitalize ${isSuccess ? "text-emerald-600" : "text-rose-600"}`}>
                        {run.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Duration: </span>
                      <span className="font-semibold text-foreground">{run.duration} ms ({durationSec}s)</span>
                    </div>
                    {run.usage && (
                      <div>
                        <span className="text-muted-foreground font-medium">Token Usage: </span>
                        <span className="font-semibold text-foreground">
                          {run.usage.promptTokens || 0} prompt / {run.usage.completionTokens || 0} comp ({run.usage.totalTokens || 0} total)
                        </span>
                      </div>
                    )}
                  </div>

                  {!isSuccess && run.error && (
                    <div className="text-xs bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-lg font-mono whitespace-pre-wrap">
                      <span className="font-bold">Error:</span> {run.error}
                    </div>
                  )}

                  {/* Steps */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tool Execution Steps ({run.steps?.length || 0})</h4>
                    {(!run.steps || run.steps.length === 0) ? (
                      <p className="text-xs text-muted-foreground italic">No tools were executed during this run.</p>
                    ) : (
                      <div className="relative border-l border-border pl-4 ml-2 space-y-4">
                        {run.steps.map((step: any, index: number) => {
                          const stepId = `${run._id}-step-${index}`;
                          const isStepExpanded = !!expandedSteps[stepId];
                          const hasStepError = !!step.error;

                          return (
                            <div key={index} className="relative">
                              {/* Timeline dot */}
                              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-card bg-primary" />
                              
                              <div className="border border-border rounded-md bg-background overflow-hidden">
                                <div
                                  onClick={() => toggleStep(stepId)}
                                  className="px-3 py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/40 transition-colors"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Cpu className="h-3.5 w-3.5 text-blue-500" />
                                    <span className="font-semibold text-foreground font-mono">{step.toolName}</span>
                                    {hasStepError ? (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">Error</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-semibold border border-emerald-100">Success</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground">{new Date(step.timestamp).toLocaleTimeString()}</span>
                                    {isStepExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </div>
                                </div>

                                {isStepExpanded && (
                                  <div className="p-3 border-t border-border bg-muted/20 space-y-2 text-xs">
                                    {step.error && (
                                      <div className="bg-rose-50 text-rose-700 p-2 rounded border border-rose-100 font-mono text-[11px]">
                                        <span className="font-bold">Execution Error:</span> {step.error}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-semibold text-muted-foreground mb-1">Arguments:</div>
                                      <pre className="p-2 rounded bg-muted/80 text-[11px] font-mono overflow-x-auto text-foreground">
                                        {JSON.stringify(step.args, null, 2)}
                                      </pre>
                                    </div>
                                    {step.result !== undefined && (
                                      <div>
                                        <div className="font-semibold text-muted-foreground mb-1">Result:</div>
                                        <pre className="p-2 rounded bg-muted/80 text-[11px] font-mono overflow-x-auto text-foreground">
                                          {JSON.stringify(step.result, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

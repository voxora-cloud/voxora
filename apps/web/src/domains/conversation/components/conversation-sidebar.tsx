import { useEffect, useMemo, useState } from "react";
import { Input } from "@/shared/ui/input";
import { useAuth } from "@/domains/auth/hooks";
import { useNavigate } from "react-router";
import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";
import io from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useConversations } from "../hooks";
import type { ConversationListItem } from "../types/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

export function ConversationSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = "/dashboard/conversations/inbox";

  const [isMinimized, setIsMinimized] = useState(false);
  const [filterStatus, setFilterStatus] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: Date;
    }>
  >([]);
  const queryClient = useQueryClient();
  const {
    data: conversations = [],
    isLoading,
  } = useConversations(filterStatus);

  useEffect(() => {
    if (!user) return undefined;

    const token = localStorage.getItem("token");
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("Agent socket connected");
    });

    socketInstance.on("new_widget_conversation", () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socketInstance.on(
      "conversation_removed",
      (data: { conversationId: string }) => {
        queryClient.setQueryData<ConversationListItem[]>(
          ["conversations", filterStatus],
          (prev = []) => prev.filter((conv) => conv._id !== data.conversationId),
        );
      },
    );

    socketInstance.on(
      "status_updated",
      (data: { conversationId: string; status: string }) => {
        queryClient.setQueryData<ConversationListItem[]>(
          ["conversations", filterStatus],
          (prev = []) =>
            prev.filter((conv) => {
              if (conv._id !== data.conversationId) return true;
              return data.status === filterStatus || filterStatus === "all";
            }),
        );
      },
    );

    socketInstance.on(
      "new_message",
      (data: {
        conversationId: string;
        message: {
          content: string;
          createdAt: string;
          senderId: { name: string };
          metadata?: { source?: string };
        };
      }) => {
        if (data?.message?.metadata?.source === "widget") {
          queryClient.setQueryData<ConversationListItem[]>(
            ["conversations", filterStatus],
            (prev = []) =>
              prev.map((conv) =>
                conv._id === data.conversationId
                  ? {
                      ...conv,
                      lastMessage: data.message,
                      unreadCount: (conv.unreadCount || 0) + 1,
                    }
                  : conv,
              ),
          );
        }
      },
    );

    socketInstance.on(
      "visitor_info_updated",
      (data: { conversationId: string; visitorName: string; visitorEmail: string }) => {
        queryClient.setQueryData<ConversationListItem[]>(
          ["conversations", filterStatus],
          (prev = []) =>
            prev.map((conv) =>
              conv._id === data.conversationId
                ? conv.visitor
                ? {
                    ...conv,
                    visitor: {
                      ...conv.visitor,
                      name: data.visitorName,
                      email: data.visitorEmail,
                      isAnonymous: false,
                    },
                  }
                : conv
                : conv,
            ),
        );
      },
    );

    return () => {
      socketInstance.disconnect();
    };
  }, [filterStatus, queryClient, user]);

  const getCustomerName = (conversation: ConversationListItem) => {
    return (
      conversation.visitor?.name ||
      conversation.metadata?.customer?.name ||
      conversation.metadata?.customerName ||
      conversation.participants[0]?.name ||
      "Anonymous User"
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return date.toLocaleDateString();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const filteredConversations = useMemo(() =>
    conversations.filter((conversation) => {
    const statusMatch =
      filterStatus === "all" || conversation.status === filterStatus;
    const searchMatch =
      !searchQuery ||
      conversation.visitor?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.visitor?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.metadata?.customer?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.metadata?.customerName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage?.content
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    return statusMatch && searchMatch;
  }), [conversations, filterStatus, searchQuery]);

  return (
    <div
      className={`h-full flex flex-col bg-background border-r border-border transition-all duration-300 ${
        isMinimized ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`p-4 border-b border-border ${
          isMinimized ? "flex flex-col items-center" : ""
        }`}
      >
        <div
          className={`flex items-center justify-between mb-3 ${
            isMinimized ? "flex-col space-y-4" : ""
          }`}
        >
          {!isMinimized && (
            <h2 className="text-lg font-semibold truncate">Conversations</h2>
          )}
          <div
            className={`flex items-center ${
              isMinimized ? "flex-col space-y-2" : "space-x-1"
            }`}
          >
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-full cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              {isMinimized ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 cursor-text"
            />
          </div>
        )}

        {!isMinimized && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        )}
      </div>

      {notifications.length > 0 && !isMinimized && (
        <div className="p-2 bg-blue-50 border-b border-border">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className="p-2 bg-background rounded border border-border text-sm mb-1"
            >
              <div className="font-medium">{notification.title}</div>
              <div className="text-gray-600 text-xs">
                {notification.message}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/60 [&::-webkit-scrollbar-track]:bg-transparent">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            {isMinimized ? "..." : "Loading conversations..."}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {!isMinimized && "No conversations found"}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className={`p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors ${
                isMinimized ? "flex justify-center" : ""
              }`}
              onClick={() => {
                setNotifications((prev) =>
                  prev.filter((notif) => notif.id !== conversation._id),
                );

                navigate(`${basePath}/chat/${conversation._id}`);
              }}
            >
              <div
                className={`flex items-start ${isMinimized ? "" : "space-x-3"}`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-primary shrink-0">
                    {getCustomerName(conversation)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                </div>

                {!isMinimized && (
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate mb-1">
                      {getCustomerName(conversation)}
                    </h4>

                    {conversation.metadata?.source && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Source: {conversation.metadata.source}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {conversation.lastMessage?.content || "No messages yet"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatTime(
                        conversation.lastMessageAt || conversation.createdAt,
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

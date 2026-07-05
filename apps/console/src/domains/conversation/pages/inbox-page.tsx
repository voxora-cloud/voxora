import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/domains/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { useConversations, useMyConversations } from "../hooks";
import { Input } from "@/shared/ui/input";
import { Loader } from "@/shared/ui/loader";
import {
  MessageCircle,
  Search,
  Inbox,
  User2,
  Mail,
  MessageSquare,
  Globe,
} from "lucide-react";
import type { ConversationListItem } from "../types/types";

const BASE_PATH = "/dashboard/conversations/inbox";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

type Tab = "all" | "mine";

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: "all", label: "Unassigned", icon: Inbox },
  { id: "mine", label: "Assigned to Me", icon: User2 },
];

export function ConversationsInboxPage({ mode = "all" }: { mode?: Tab }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tab = mode;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: allOpen = [], isLoading: loadingAll } = useConversations(statusFilter, { unassigned: true });
  const { data: mine = [], isLoading: loadingMine } = useMyConversations();

  // Socket: invalidate lists on new or escalated conversations
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("new_widget_conversation", handleUpdate);
    socket.on("conversation_pending", handleUpdate);
    socket.on("conversation_assigned", handleUpdate);
    socket.on("status_updated", handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const isLoading =
    (tab === "all" && loadingAll) ||
    (tab === "mine" && loadingMine);

  const rawList: ConversationListItem[] =
    tab === "all" ? allOpen : mine;

  const list = useMemo(() => {
    let filtered = rawList;

    // Filter by search query
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((conv) => {
        const name = (
          conv.metadata?.customer?.name ||
          conv.metadata?.senderName ||
          conv.metadata?.customerName ||
          ""
        ).toLowerCase();
        const email = (
          conv.metadata?.customer?.email ||
          conv.metadata?.senderEmail ||
          ""
        ).toLowerCase();
        const msg = (conv.lastMessage?.content || "").toLowerCase();
        return name.includes(q) || email.includes(q) || msg.includes(q);
      });
    }

    // Filter by channel
    if (channelFilter !== "all") {
      filtered = filtered.filter((conv) => {
        const chan = (conv.channel || conv.metadata?.source || "widget").toLowerCase();
        return chan.includes(channelFilter);
      });
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter((conv) => conv.priority === priorityFilter);
    }

    return filtered;
  }, [rawList, search, channelFilter, priorityFilter]);

  const getVisitorName = (conv: ConversationListItem) =>
    conv.metadata?.customer?.name ||
    conv.metadata?.senderName ||
    conv.metadata?.customerName ||
    "Anonymous User";

  const getRelativeTime = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isEscalated = (conv: ConversationListItem) =>
    !!conv.metadata?.escalatedAt;



  // Render
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-center gap-3 mb-1">
          <Inbox className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Inbox</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Human-escalated conversations waiting for your response.
        </p>
      </div>

      {/* Tab + Search bar */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 border-b border-border flex-wrap">
        <div className="flex rounded-md border border-input bg-background p-0.5 gap-0.5 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id === "all" ? "/dashboard/conversations/inbox/open" : "/dashboard/conversations/inbox/assigned")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors cursor-pointer ${
                tab === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 py-1.5 text-xs bg-background text-foreground border border-input rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-sm font-medium select-none"
          >
            <option value="open">Open Status</option>
            <option value="resolved">Resolved Status</option>
            <option value="closed">Closed Status</option>
            <option value="all">All Statuses</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-9 px-3 py-1.5 text-xs bg-background text-foreground border border-input rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-sm font-medium select-none"
          >
            <option value="all">All Channels</option>
            <option value="widget">Widget / Web</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 py-1.5 text-xs bg-background text-foreground border border-input rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-sm font-medium select-none"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High/Urgent</option>
          </select>

          <div className="relative flex-grow md:flex-initial max-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 cursor-text"
            />
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader size="sm" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No conversations</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "all"
                ? "No open conversations right now."
                : "No conversations are assigned to you."}
            </p>
          </div>
        ) : (
          list.map((conv) => {
            const name = getVisitorName(conv);
            const initials = name
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const escalated = isEscalated(conv);
            const assignedToMe = conv.assignedTo?._id === user?.id;
            const isUnread = conv.unreadCount > 0;
            const channel = conv.channel || conv.metadata?.source || "widget";

            return (
              <div
                key={conv._id}
                onClick={() => navigate(`${BASE_PATH}/chat/${conv._id}`, { state: { from: window.location.pathname } })}
                className="w-full flex items-start gap-4 px-4 py-3.5 hover:bg-muted/40 dark:hover:bg-zinc-900/40 transition-colors border-b border-border/40 cursor-pointer select-none"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold border border-border/20">
                    {initials}
                  </div>
                  {escalated && (
                    <span
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-red-500"
                      title="Escalated to human"
                    />
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-foreground truncate">
                      {name}
                    </span>
                    <span className={`text-[11px] font-medium ${isUnread ? "text-emerald-500 font-semibold" : "text-muted-foreground/80"}`}>
                      {getRelativeTime(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-[13px] truncate ${isUnread ? "text-foreground font-medium" : "text-muted-foreground/90"}`}>
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                    {isUnread && (
                      <span className="shrink-0 flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Channel & Assignment row */}
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 font-medium">
                      {channel.includes("email") ? (
                        <Mail className="h-3.5 w-3.5" />
                      ) : channel.includes("whatsapp") ? (
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                      ) : channel.includes("telegram") ? (
                        <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-indigo-500" />
                      )}
                      <span className="capitalize">{channel.replace(/_channel$/, "")}</span>
                    </div>

                    {conv.assignedTo && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/75 font-medium">
                        <span>•</span>
                        <User2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{assignedToMe ? "You" : conv.assignedTo.name}</span>
                      </span>
                    )}

                    {/* Status dot */}
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/85">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        conv.status === "open"
                          ? "bg-emerald-500"
                          : conv.status === "resolved"
                          ? "bg-blue-400"
                          : "bg-zinc-400"
                      }`} />
                      <span className="capitalize">{conv.status}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      {list.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-card/30">
          <p className="text-[11px] text-muted-foreground">
            {list.length} conversation{list.length !== 1 ? "s" : ""} · Click a row to open the chat
          </p>
        </div>
      )}
    </div>
  );
}

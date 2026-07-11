import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/domains/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { useConversations, useMyConversations } from "../hooks";
import { Input } from "@/shared/ui/input";
import { Loader } from "@/shared/ui/loader";
import { MessageCircle, Search, Inbox, User2 } from "lucide-react";

// ── Brand SVG Icons ──────────────────────────────────────────────────────────
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path fill="#25D366" d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.428a.75.75 0 0 0 .916.916l5.57-1.476A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.523-5.184-1.433l-.37-.22-3.307.876.876-3.308-.22-.37A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#229ED9" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const GmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
    <path d="M0 5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.147C21.69 2.279 24 3.434 24 5.456v.48L12 13.913 0 5.936v-.479z" fill="#FBBC04"/>
  </svg>
);

const WebIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#6366f1"/>
    <path d="M12 2a14.5 14.5 0 0 1 0 20A14.5 14.5 0 0 1 12 2" stroke="#6366f1"/>
    <path d="M2 12h20" stroke="#6366f1"/>
  </svg>
);

const AllChannelsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="7" height="7" rx="1" stroke="#8b5cf6"/>
    <rect x="15" y="3" width="7" height="7" rx="1" stroke="#06b6d4"/>
    <rect x="2" y="14" width="7" height="7" rx="1" stroke="#10b981"/>
    <rect x="15" y="14" width="7" height="7" rx="1" stroke="#f59e0b"/>
  </svg>
);
import type { ConversationListItem } from "../types/types";

const BASE_PATH = "/dashboard/conversations/inbox";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

type Tab = "all" | "mine";

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: "all", label: "Unassigned", icon: Inbox },
  { id: "mine", label: "Assigned to Me", icon: User2 },
];

const CHANNEL_FILTERS: {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    id: "all",
    label: "All",
    icon: AllChannelsIcon,
    activeClass: "bg-primary/10 ring-1 ring-primary/30",
    inactiveClass: "hover:bg-muted/60",
  },
  {
    id: "web",
    label: "Web",
    icon: WebIcon,
    activeClass: "bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-300 dark:ring-indigo-700",
    inactiveClass: "hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
  },
  {
    id: "email",
    label: "Email",
    icon: GmailIcon,
    activeClass: "bg-red-100 dark:bg-red-900/40 ring-1 ring-red-300 dark:ring-red-700",
    inactiveClass: "hover:bg-red-50 dark:hover:bg-red-900/20",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    activeClass: "bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-emerald-300 dark:ring-emerald-700",
    inactiveClass: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: TelegramIcon,
    activeClass: "bg-sky-100 dark:bg-sky-900/40 ring-1 ring-sky-300 dark:ring-sky-700",
    inactiveClass: "hover:bg-sky-50 dark:hover:bg-sky-900/20",
  },
];

const getChannelValue = (conv: ConversationListItem) =>
  (conv.channel || conv.metadata?.source || "web")
    .toLowerCase()
    .replace(/_channel$/, "");

const channelMatches = (channel: string, filter: string) => {
  if (filter === "all") return true;
  if (filter === "web")
    return channel.includes("web") || channel.includes("widget");
  return channel.includes(filter);
};

const getChannelDisplay = (channel: string) => {
  if (channel.includes("email")) {
    return {
      label: "Email",
      Icon: GmailIcon,
      className: "text-red-500 dark:text-red-400",
    };
  }
  if (channel.includes("whatsapp")) {
    return {
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      className: "text-emerald-500 dark:text-emerald-400",
    };
  }
  if (channel.includes("telegram")) {
    return {
      label: "Telegram",
      Icon: TelegramIcon,
      className: "text-sky-500 dark:text-sky-400",
    };
  }

  return {
    label: "Web",
    Icon: WebIcon,
    className: "text-indigo-500 dark:text-indigo-400",
  };
};

export function ConversationsInboxPage({ mode = "all" }: { mode?: Tab }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tab = mode;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: allOpen = [], isLoading: loadingAll } = useConversations(
    statusFilter,
    { unassigned: true },
  );
  const { data: mine = [], isLoading: loadingMine } =
    useMyConversations(statusFilter);

  // Socket: invalidate lists on new or escalated conversations
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const handleUpdate = () => {
      // Invalidates all queries whose key starts with "conversations"
      // (covers ["conversations", status, opts] and ["conversations", "mine"])
      queryClient.invalidateQueries({ queryKey: ["conversations"], exact: false });
    };

    socket.on("new_widget_conversation", handleUpdate);
    socket.on("conversation_pending", handleUpdate);
    socket.on("conversation_assigned", handleUpdate);
    socket.on("conversation_escalated", handleUpdate);
    socket.on("status_updated", handleUpdate);
    socket.on("conversation_removed", handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const isLoading =
    (tab === "all" && loadingAll) || (tab === "mine" && loadingMine);

  const rawList: ConversationListItem[] = tab === "all" ? allOpen : mine;

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
        const chan = getChannelValue(conv);
        return channelMatches(chan, channelFilter);
      });
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter((conv) =>
        priorityFilter === "high_urgent"
          ? conv.priority === "high" || conv.priority === "urgent"
          : conv.priority === priorityFilter,
      );
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
              onClick={() =>
                navigate(
                  id === "all"
                    ? "/dashboard/conversations/inbox/open"
                    : "/dashboard/conversations/inbox/assigned",
                )
              }
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
          <div className="flex h-9 items-center rounded-md border border-input bg-background p-0.5 shadow-sm gap-0.5">
            {CHANNEL_FILTERS.map(({ id, label, icon: Icon, activeClass, inactiveClass }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setChannelFilter(id)}
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-all duration-150 cursor-pointer ${
                  channelFilter === id ? activeClass : inactiveClass
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 py-1.5 text-xs bg-background text-foreground border border-input rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-sm font-medium select-none"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high_urgent">High/Urgent</option>
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
            <p className="text-sm font-medium text-foreground">
              No conversations
            </p>
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
            const channel = getChannelValue(conv);
            const channelDisplay = getChannelDisplay(channel);

            return (
              <div
                key={conv._id}
                onClick={() =>
                  navigate(`${BASE_PATH}/chat/${conv._id}`, {
                    state: { from: window.location.pathname },
                  })
                }
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
                    <span
                      className={`text-[11px] font-medium ${isUnread ? "text-emerald-500 font-semibold" : "text-muted-foreground/80"}`}
                    >
                      {getRelativeTime(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p
                      className={`text-[13px] truncate ${isUnread ? "text-foreground font-medium" : "text-muted-foreground/90"}`}
                    >
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
                      <channelDisplay.Icon
                        className={`h-3.5 w-3.5 ${channelDisplay.className}`}
                      />
                      <span>{channelDisplay.label}</span>
                    </div>

                    {conv.assignedTo && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/75 font-medium">
                        <span>•</span>
                        <User2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {assignedToMe ? "You" : conv.assignedTo.name}
                        </span>
                      </span>
                    )}

                    {/* Status dot */}
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/85">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          conv.status === "open"
                            ? "bg-emerald-500"
                            : conv.status === "resolved"
                              ? "bg-blue-400"
                              : "bg-zinc-400"
                        }`}
                      />
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
            {list.length} conversation{list.length !== 1 ? "s" : ""} · Click a
            row to open the chat
          </p>
        </div>
      )}
    </div>
  );
}

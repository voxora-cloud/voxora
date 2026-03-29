import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/domains/auth/hooks";
import { useConversations, useMyConversations, useUnassignedConversations } from "../hooks";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Loader } from "@/shared/ui/loader";
import { Card, CardContent } from "@/shared/ui/card";
import {
  MessageCircle,
  Search,
  AlertTriangle,
  Inbox,
  User2,
  UserX,
  Clock,
  Bot,
} from "lucide-react";
import type { ConversationListItem } from "../types/types";

const BASE_PATH = "/dashboard/conversations/inbox";

type Tab = "all" | "mine" | "unassigned";

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: "all", label: "All Open", icon: Inbox },
  { id: "mine", label: "Assigned to Me", icon: User2 },
  { id: "unassigned", label: "Unassigned / In Queue", icon: UserX },
];

export function ConversationsInboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const { data: allOpen = [], isLoading: loadingAll } = useConversations("open");
  const { data: mine = [], isLoading: loadingMine } = useMyConversations();
  const { data: unassigned = [], isLoading: loadingUnassigned } = useUnassignedConversations();

  const isLoading =
    (tab === "all" && loadingAll) ||
    (tab === "mine" && loadingMine) ||
    (tab === "unassigned" && loadingUnassigned);

  const rawList: ConversationListItem[] =
    tab === "all" ? allOpen : tab === "mine" ? mine : unassigned;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rawList;
    return rawList.filter((conv) => {
      const name =
        conv.visitor?.name ||
        conv.metadata?.customer?.name ||
        conv.metadata?.customerName ||
        "";
      const email =
        conv.visitor?.email || conv.metadata?.customer?.email || "";
      const msg = conv.lastMessage?.content || "";
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        msg.toLowerCase().includes(q)
      );
    });
  }, [rawList, search]);

  const getVisitorName = (conv: ConversationListItem) =>
    conv.visitor?.name ||
    conv.metadata?.customer?.name ||
    conv.metadata?.customerName ||
    "Anonymous";

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

  const isPending = (conv: ConversationListItem) =>
    conv.status === "pending" && !!conv.metadata?.pendingEscalation;

  // Stat counts
  const myCount = mine.length;
  const unassignedCount = unassigned.length;
  const allCount = allOpen.length;

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

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            onClick={() => setTab("all")}
            className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
              tab === "all"
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:bg-muted/50"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">All Open</p>
            <p className="text-2xl font-bold text-foreground">
              {loadingAll ? "—" : allCount}
            </p>
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
              tab === "mine"
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:bg-muted/50"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">Assigned to Me</p>
            <p className="text-2xl font-bold text-foreground">
              {loadingMine ? "—" : myCount}
            </p>
          </button>
          <button
            onClick={() => setTab("unassigned")}
            className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
              tab === "unassigned"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-background hover:bg-muted/50"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-1">In Queue</p>
            <p
              className={`text-2xl font-bold ${
                unassignedCount > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {loadingUnassigned ? "—" : unassignedCount}
            </p>
          </button>
        </div>
      </div>

      {/* Tab + Search bar */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-border">
        <div className="flex rounded-md border border-input bg-background p-0.5 gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors cursor-pointer ${
                tab === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {id === "unassigned" && unassignedCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {unassignedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 cursor-text"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
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
                : tab === "mine"
                ? "No conversations are assigned to you."
                : "No conversations waiting in queue."}
            </p>
          </div>
        ) : (
          list.map((conv) => {
            const name = getVisitorName(conv);
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const escalated = isEscalated(conv);
            const pending = isPending(conv);
            const assignedToMe = conv.assignedTo?._id === user?.id;

            return (
              <button
                key={conv._id}
                onClick={() => navigate(`${BASE_PATH}/chat/${conv._id}`)}
                className="w-full text-left flex items-start gap-3 px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  {escalated && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-red-500 flex items-center justify-center"
                      title="Escalated to human"
                    />
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">{name}</span>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {escalated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Escalated
                      </span>
                    )}
                    {pending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        In Queue
                      </span>
                    )}
                    {conv.metadata?.source && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        <Bot className="h-3 w-3" />
                        {conv.metadata.source}
                      </span>
                    )}
                    {conv.assignedTo && (
                      <span className="text-[10px] text-muted-foreground">
                        → {assignedToMe ? "You" : conv.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time + status */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {getRelativeTime(conv.lastMessageAt || conv.createdAt)}
                  </span>
                  <Badge
                    variant={
                      conv.status === "open"
                        ? "success"
                        : conv.status === "pending"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {conv.status}
                  </Badge>
                </div>
              </button>
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

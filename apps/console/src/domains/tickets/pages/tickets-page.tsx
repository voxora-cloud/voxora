import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Tag,
  ClipboardList,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  User,
  ChevronRight,
  Bot,
  Mail,
  Phone,
  Globe,
  Wifi,
  Send,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { membersApi } from "@/domains/member/api/members.api";
import type { Member } from "@/domains/member/types/types";
import {
  useTickets,
  useAssignTicket,
} from "../hooks";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

// ─── Source badge ─────────────────────────────────────────────────────────────

type TicketSource = "ai" | "agent" | "api" | "widget" | "email" | "whatsapp" | "telegram";

const SOURCE_META: Record<TicketSource, { label: string; icon: React.ReactNode }> = {
  ai: { label: "AI", icon: <Bot className="h-2.5 w-2.5" /> },
  agent: { label: "Agent", icon: <User className="h-2.5 w-2.5" /> },
  api: { label: "API", icon: <Wifi className="h-2.5 w-2.5" /> },
  widget: { label: "Widget", icon: <Globe className="h-2.5 w-2.5" /> },
  email: { label: "Email", icon: <Mail className="h-2.5 w-2.5" /> },
  whatsapp: { label: "WhatsApp", icon: <Phone className="h-2.5 w-2.5" /> },
  telegram: { label: "Telegram", icon: <Send className="h-2.5 w-2.5" /> },
};

function SourcePill({ source }: { source: string }) {
  const meta = SOURCE_META[source as TicketSource] ?? { label: source, icon: null };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 capitalize">
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Status / Priority badges ─────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary dark:text-primary-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Open
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 border border-warning/20 text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
          In Progress
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 border border-success/20 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Resolved
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 border border-secondary/20 text-secondary-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/40 border border-border text-muted-foreground capitalize">
          {status}
        </span>
      );
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "low":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground">
          Low
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary dark:text-primary-foreground">
          Medium
        </span>
      );
    case "high":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/10 border border-warning/20 text-warning">
          High
        </span>
      );
    case "urgent":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 border border-destructive/20 text-destructive animate-pulse">
          <span className="h-1 w-1 rounded-full bg-destructive animate-ping mr-1" />
          Urgent
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/40 border border-border text-muted-foreground capitalize">
          {priority}
        </span>
      );
  }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [members, setMembers] = useState<Member[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: ticketsData,
    isLoading: loading,
    refetch: refetchTickets,
    isRefetching: refreshing,
  } = useTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedToFilter || undefined,
    page: currentPage,
    limit: 10,
  });

  const tickets = ticketsData?.data?.tickets || [];
  const totalTickets = ticketsData?.data?.total || 0;
  const totalPages = ticketsData?.data?.pages || 1;

  const assignTicketMutation = useAssignTicket();

  useEffect(() => {
    membersApi.listMembers().then((res) => {
      if (res.success && res.data?.members) {
        setMembers(res.data.members.filter((m) => m.inviteStatus === "active" && m.user));
      }
    });
  }, []);

  // Socket: invalidate list on any ticket update
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("ticket_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const handleAssignTicket = (ticketId: string, memberUserId: string | null) => {
    assignTicketMutation.mutate({ ticketId, memberId: memberUserId });
  };

  // Local search filter
  const filteredTickets = tickets.filter((t) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      t.title.toLowerCase().includes(term) ||
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(term))
    );
  });

  // Summary metrics
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const unassignedCount = tickets.filter((t) => !t.assignedTo).length;

  const renderPaginationItems = () => {
    const items = [];
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          onClick={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
          className={currentPage === 1 ? "opacity-40 pointer-events-none" : "cursor-pointer"}
        />
      </PaginationItem>
    );
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 5 || i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink isActive={currentPage === i} onClick={() => setCurrentPage(i)} className="cursor-pointer">
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (
        (i === 2 && currentPage > 3) ||
        (i === totalPages - 1 && currentPage < totalPages - 2)
      ) {
        items.push(
          <PaginationItem key={`ellipsis-${i}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          onClick={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
          className={currentPage === totalPages ? "opacity-40 pointer-events-none" : "cursor-pointer"}
        />
      </PaginationItem>
    );
    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TicketIcon className="h-6 w-6 text-primary" />
            Tickets Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer support inquiries, assign tickets, and track resolution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchTickets()}
            disabled={refreshing}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Tickets",
            value: totalTickets,
            icon: <ClipboardList className="h-5 w-5" />,
            color: "text-primary bg-primary/10 border-primary/20",
          },
          {
            label: "Open Tickets",
            value: openCount,
            icon: <Clock className="h-5 w-5" />,
            color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
          },
          {
            label: "Unassigned",
            value: unassignedCount,
            icon: <User className="h-5 w-5" />,
            color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
          },
          {
            label: "Active In Progress",
            value: inProgressCount,
            icon: <CheckCircle className="h-5 w-5" />,
            color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {card.label}
                </p>
                <h4 className="text-2xl font-extrabold tracking-tight mt-0.5">{card.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
            {[
              { label: "All", value: "" },
              { label: "Open", value: "open" },
              { label: "In Progress", value: "in_progress" },
              { label: "Resolved", value: "resolved" },
              { label: "Closed", value: "closed" },
            ].map((tab) => (
              <Button
                key={tab.value}
                variant={statusFilter === tab.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                className="cursor-pointer shrink-0 rounded-lg text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search + selects */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or #..."
                className="pl-9 cursor-text h-8 text-xs"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={assignedToFilter}
              onChange={(e) => { setAssignedToFilter(e.target.value); setCurrentPage(1); }}
              className="h-8 max-w-[180px] rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Assignments</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/45 mb-3" />
            <h5 className="font-semibold text-base">No tickets found</h5>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filter settings. New tickets will appear here as they arrive.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="p-3 w-[110px]">Ticket #</th>
                  <th className="p-3">Title</th>
                  <th className="p-3 w-[120px]">Status</th>
                  <th className="p-3 w-[110px]">Priority</th>
                  <th className="p-3 w-[180px]">Assigned Agent</th>
                  <th className="p-3 w-[110px]">Source</th>
                  <th className="p-3 w-[80px] text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                    className="hover:bg-muted/50 dark:hover:bg-muted/30 cursor-pointer select-none transition-all duration-150 group/row border-b border-border/40 last:border-0"
                  >
                    <td className="p-3 font-mono text-xs font-semibold text-primary/80">
                      #{ticket.ticketNumber || ticket.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold tracking-tight text-foreground group-hover/row:text-primary transition-colors">
                          {ticket.title}
                        </span>
                        {ticket.tags && ticket.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {ticket.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground border border-primary/20"
                              >
                                <Tag className="h-2.5 w-2.5 opacity-70" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(ticket.status)}</td>
                    <td className="p-3">{getPriorityBadge(ticket.priority)}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ticket.assignedTo?.id || ""}
                        onChange={(e) => handleAssignTicket(ticket.id, e.target.value || null)}
                        className="h-7 w-full cursor-pointer rounded-lg border border-border/80 bg-background/50 hover:bg-background px-2 py-0.5 text-xs shadow-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user._id} value={m.user._id}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <SourcePill source={ticket.source} />
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                        className="cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center border-t border-border/40 pt-4 mt-4 gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              Showing page {currentPage} of {totalPages}
            </p>
            <Pagination className="w-auto mx-auto justify-center">
              <PaginationContent>{renderPaginationItems()}</PaginationContent>
            </Pagination>
            <div className="hidden sm:block" />
          </div>
        )}
      </div>
    </div>
  );
}

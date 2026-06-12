import { useEffect, useState } from "react";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Tag,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  User,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import { membersApi } from "@/domains/member/api/members.api";
import { ticketsApi } from "../api/tickets.api";
import type { Ticket } from "../types/types";
import type { Member } from "@/domains/member/types/types";
import {
  useTickets,
  useUpdateTicket,
  useAddTicketNote,
  useAssignTicket,
  useUpdateTicketStatus,
} from "../hooks";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
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

const mergeRequesterContact = (current: Ticket | null, updated: Ticket): Ticket => ({
  ...updated,
  requesterContact:
    updated.requesterContact ??
    (current?.id === updated.id ? current.requesterContact : undefined),
});

const contactValue = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed || "Not provided";
};

type TicketStatus = Ticket["status"];
type TicketPriority = Ticket["priority"];

export function TicketsPage() {
  const queryClient = useQueryClient();

  // State for members (for assignment dropdown)
  const [members, setMembers] = useState<Member[]>([]);

  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // State for viewing ticket details (drawer/modal)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");

  // React Query Hooks
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
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();
  const addNoteMutation = useAddTicketNote();

  const openTicketDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingTicketDetails(ticket.id);

    try {
      const response = await queryClient.fetchQuery({
        queryKey: ["ticket", ticket.id],
        queryFn: () => ticketsApi.getTicket(ticket.id),
      });

      if (response.success && response.data?.ticket) {
        setSelectedTicket((current) =>
          current?.id === ticket.id ? response.data.ticket : current,
        );
      }
    } catch (error) {
      console.error("Failed to fetch ticket details:", error);
    } finally {
      setLoadingTicketDetails((current) => (current === ticket.id ? null : current));
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await membersApi.listMembers();
      if (response.success && response.data?.members) {
        // Filter out pending/inactive members
        const activeMembers = response.data.members.filter(
          (m) => m.inviteStatus === "active" && m.user
        );
        setMembers(activeMembers);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("ticket_updated", (payload: { ticket?: Ticket }) => {
      const ticket = payload?.ticket;
      queryClient.invalidateQueries({ queryKey: ["tickets"] });

      if (ticket) {
        setSelectedTicket((current) =>
          current?.id === ticket.id ? mergeRequesterContact(current, ticket) : current,
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Handle Ticket Assignment
  const handleAssignTicket = (ticketId: string, memberUserId: string | null) => {
    assignTicketMutation.mutate(
      { ticketId, memberId: memberUserId },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.ticket) {
            const updated = res.data.ticket;
            if (selectedTicket && selectedTicket.id === ticketId) {
              setSelectedTicket((current) =>
                current?.id === ticketId ? mergeRequesterContact(current, updated) : current,
              );
            }
          }
        },
      }
    );
  };

  // Handle Ticket Status Change
  const handleUpdateStatus = (ticketId: string, status: "open" | "in_progress" | "resolved" | "closed") => {
    updateStatusMutation.mutate(
      { ticketId, status },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.ticket) {
            const updated = res.data.ticket;
            if (selectedTicket && selectedTicket.id === ticketId) {
              setSelectedTicket((current) =>
                current?.id === ticketId ? mergeRequesterContact(current, updated) : current,
              );
            }
          }
        },
      }
    );
  };

  // Handle Ticket Priority Change
  const handleUpdatePriority = (ticketId: string, priority: "low" | "medium" | "high" | "urgent") => {
    updateTicketMutation.mutate(
      { ticketId, data: { priority } },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.ticket) {
            const updated = res.data.ticket;
            if (selectedTicket && selectedTicket.id === ticketId) {
              setSelectedTicket((current) =>
                current?.id === ticketId ? mergeRequesterContact(current, updated) : current,
              );
            }
          }
        },
      }
    );
  };

  // Handle Adding a Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNoteContent.trim()) return;

    addNoteMutation.mutate(
      { ticketId: selectedTicket.id, content: newNoteContent },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.ticket) {
            setSelectedTicket((current) =>
              current?.id === res.data.ticket.id
                ? mergeRequesterContact(current, res.data.ticket)
                : current,
            );
            setNewNoteContent("");
          }
        },
      }
    );
  };

  // Get status color matching design theme
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

  // Get priority color matching design theme
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground capitalize">
            Low
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary dark:text-primary-foreground capitalize">
            Medium
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/10 border border-warning/20 text-warning capitalize">
            High
          </span>
        );
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 border border-destructive/20 text-destructive animate-pulse capitalize">
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

  // Filter local tickets by search query on title/number
  const filteredTickets = tickets.filter((t) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      t.title.toLowerCase().includes(term) ||
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(term))
    );
  });

  // Calculate metrics
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const unassignedCount = tickets.filter((t) => !t.assignedTo).length;

  // Generate pagination items using custom Pagination components
  const renderPaginationItems = () => {
    const items = [];
    
    // Previous page button
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          onClick={() => {
            if (currentPage > 1) setCurrentPage(currentPage - 1);
          }}
          className={currentPage === 1 ? "opacity-40 pointer-events-none" : "cursor-pointer"}
        />
      </PaginationItem>
    );

    // Dynamic numeric links and ellipses
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 5 || i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={currentPage === i}
              onClick={() => setCurrentPage(i)}
              className="cursor-pointer"
            >
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

    // Next page button
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          onClick={() => {
            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
          }}
          className={currentPage === totalPages ? "opacity-40 pointer-events-none" : "cursor-pointer"}
        />
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
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
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Total Tickets</p>
              <h4 className="text-2xl font-extrabold tracking-tight mt-0.5">{totalTickets}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-sky-500/20">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Open Tickets</p>
              <h4 className="text-2xl font-extrabold tracking-tight mt-0.5">{openCount}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-500/20">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Unassigned</p>
              <h4 className="text-2xl font-extrabold tracking-tight mt-0.5">{unassignedCount}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Active in Progress</p>
              <h4 className="text-2xl font-extrabold tracking-tight mt-0.5">{inProgressCount}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Main filter container */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Quick status filter buttons */}
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
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className="cursor-pointer shrink-0 rounded-lg text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search and select inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket title or #..."
                className="pl-9 cursor-text h-8 text-xs"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
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
              onChange={(e) => {
                setAssignedToFilter(e.target.value);
                setCurrentPage(1);
              }}
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

        {/* Tickets List */}
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
                  <th className="p-3 w-[100px]">Ticket #</th>
                  <th className="p-3">Title</th>
                  <th className="p-3 w-[120px]">Status</th>
                  <th className="p-3 w-[120px]">Priority</th>
                  <th className="p-3 w-[180px]">Assigned Agent</th>
                  <th className="p-3 w-[100px]">Source</th>
                  <th className="p-3 w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => void openTicketDetails(ticket)}
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground border border-primary/20 transition-all hover:bg-accent/80"
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
                        onChange={(e) =>
                          handleAssignTicket(ticket.id, e.target.value || null)
                        }
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 capitalize">
                        {ticket.source}
                      </span>
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => void openTicketDetails(ticket)}
                        className="cursor-pointer"
                      >
                        Details
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination using shared Pagination components */}
        {totalPages > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center border-t border-border/40 pt-4 mt-4 gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              Showing page {currentPage} of {totalPages}
            </p>
            <Pagination className="w-auto mx-auto justify-center">
              <PaginationContent>
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
            <div className="hidden sm:block" />
          </div>
        )}
      </div>

      {/* Sliding Dialog/Modal for Ticket Details & Internal Activity */}
      {selectedTicket && (
        <Dialog
          open={!!selectedTicket}
          onOpenChange={(open) => {
            if (!open) setSelectedTicket(null);
          }}
        >
          <DialogContent className="w-[96vw] max-w-6xl max-h-[92vh] overflow-hidden border-border bg-background p-0 shadow-2xl sm:rounded-lg">
            <DialogHeader className="border-b border-border bg-card px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground">
                      <TicketIcon className="h-3.5 w-3.5" />
                      #{selectedTicket.ticketNumber || selectedTicket.id.slice(-6).toUpperCase()}
                    </span>
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                    <span className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                      {selectedTicket.source}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-semibold leading-tight tracking-normal text-foreground sm:text-2xl">
                    {selectedTicket.title}
                  </DialogTitle>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 pr-8">
                  {selectedTicket.conversationId && (
                    <a
                      href={`/dashboard/conversations/inbox/chat/${selectedTicket.conversationId}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                    >
                      View Inbox Chat
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="grid max-h-[calc(92vh-96px)] grid-cols-1 overflow-y-auto bg-muted/20 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-5 p-4 sm:p-6">
                <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h5 className="text-sm font-semibold text-foreground">Description</h5>
                    {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                      <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                        {selectedTicket.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-h-24 whitespace-pre-wrap rounded-md border border-border/70 bg-background p-4 text-sm leading-6 text-foreground">
                    {selectedTicket.description || (
                      <span className="italic text-muted-foreground">No description provided.</span>
                    )}
                  </div>
                  {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 sm:hidden">
                      {selectedTicket.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h5 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        Internal Notes & Activity
                      </h5>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedTicket.notes?.length
                          ? `${selectedTicket.notes.length} internal update${selectedTicket.notes.length === 1 ? "" : "s"} recorded`
                          : "No internal updates recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[36vh] min-h-56 overflow-y-auto p-4">
                    {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                      <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                        {selectedTicket.notes.map((note) => (
                          <div key={note.id} className="relative pl-7">
                            <span
                              className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                                note.authorType === "ai" ? "bg-primary" : "bg-muted-foreground"
                              }`}
                            />
                            <div className="rounded-lg border border-border bg-background p-3">
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                  {note.authorType === "ai" && (
                                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                      AI
                                    </span>
                                  )}
                                  {note.author}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(note.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                                {note.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-border bg-background">
                        <div className="relative max-w-sm px-6 py-8 text-center">
                          <div className="mx-auto mb-4 flex w-32 items-center justify-center">
                            <span className="h-3 w-3 rounded-full bg-primary" />
                            <span className="h-px flex-1 bg-border" />
                            <span className="h-3 w-3 rounded-full border border-border bg-card" />
                            <span className="h-px flex-1 bg-border" />
                            <span className="h-3 w-3 rounded-full border border-border bg-card" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No activity yet</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Add the first internal note to create an audit trail for this ticket.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} className="border-t border-border p-4">
                    <Textarea
                      placeholder="Add an internal note..."
                      rows={3}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="min-h-20 resize-none cursor-text bg-background text-sm"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                        className="cursor-pointer"
                      >
                        {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                      </Button>
                    </div>
                  </form>
                </section>
              </div>

              <aside className="space-y-4 border-t border-border bg-card p-4 sm:p-6 lg:border-l lg:border-t-0">
                <section className="rounded-lg border border-border bg-background p-4">
                  <h6 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Management
                  </h6>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Status
                      </Label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) =>
                          handleUpdateStatus(selectedTicket.id, e.target.value as TicketStatus)
                        }
                        className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Priority
                      </Label>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) =>
                          handleUpdatePriority(selectedTicket.id, e.target.value as TicketPriority)
                        }
                        className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Assignment
                      </Label>
                      <select
                        value={selectedTicket.assignedTo?.id || ""}
                        onChange={(e) =>
                          handleAssignTicket(selectedTicket.id, e.target.value || null)
                        }
                        className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user._id} value={m.user._id}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h6 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Requester
                    </h6>
                    {loadingTicketDetails === selectedTicket.id && (
                      <span className="text-[10px] font-medium text-muted-foreground">Loading...</span>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
                      {contactValue(selectedTicket.requesterContact?.fullName).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {contactValue(selectedTicket.requesterContact?.fullName)}
                      </p>
                      <div className="mt-3 space-y-2 text-xs">
                        <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contactValue(selectedTicket.requesterContact?.email)}</span>
                        </p>
                        <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contactValue(selectedTicket.requesterContact?.phone)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-background p-4">
                  <h6 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Agent
                  </h6>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
                      {(selectedTicket.assignedTo?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      {selectedTicket.assignedTo ? (
                        <>
                          <p className="truncate text-sm font-semibold text-foreground">
                            {selectedTicket.assignedTo.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {selectedTicket.assignedTo.email}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-foreground">Unassigned</p>
                          <p className="mt-1 text-xs text-muted-foreground">Awaiting claim</p>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-background p-4">
                  <h6 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ticket Details
                  </h6>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Source</dt>
                      <dd className="font-medium capitalize text-foreground">{selectedTicket.source}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="text-right font-medium text-foreground">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd className="text-right font-medium text-foreground">
                        {new Date(selectedTicket.updatedAt).toLocaleString()}
                      </dd>
                    </div>
                    {selectedTicket.resolvedAt && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Resolved</dt>
                        <dd className="text-right font-medium text-success">
                          {new Date(selectedTicket.resolvedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {selectedTicket.closedAt && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Closed</dt>
                        <dd className="text-right font-medium text-muted-foreground">
                          {new Date(selectedTicket.closedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </aside>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

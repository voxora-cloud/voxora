import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Ticket as TicketIcon,
  MessageSquare,
  Mail,
  Phone,
  Building2,
  User,
  Tag,
  ExternalLink,
  Clock,
  Bot,
  Send,
  Globe,
  Wifi,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  Inbox,
  ArrowUpRight,
  Zap,
  Shield,
  Sparkles,
  CornerDownRight,
  CalendarDays,
  Hash,
} from "lucide-react";
import { membersApi } from "@/domains/member/api/members.api";
import type { Member } from "@/domains/member/types/types";
import {
  useTicket,
  useUpdateTicket,
  useAddTicketNote,
  useAssignTicket,
  useUpdateTicketStatus,
} from "../hooks";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketSource = "ai" | "agent" | "api" | "widget" | "email" | "whatsapp" | "telegram";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

// ─── Meta maps ────────────────────────────────────────────────────────────────

const SOURCE_META: Record<TicketSource, { label: string; icon: React.ReactNode; gradient: string; ring: string }> = {
  ai:       { label: "AI",       icon: <Bot className="h-3.5 w-3.5" />,      gradient: "from-violet-500 to-purple-600",   ring: "ring-violet-500/30" },
  agent:    { label: "Agent",    icon: <User className="h-3.5 w-3.5" />,     gradient: "from-slate-500 to-slate-600",     ring: "ring-slate-400/30" },
  api:      { label: "API",      icon: <Wifi className="h-3.5 w-3.5" />,     gradient: "from-sky-500 to-cyan-600",        ring: "ring-sky-500/30" },
  widget:   { label: "Widget",   icon: <Globe className="h-3.5 w-3.5" />,    gradient: "from-emerald-500 to-teal-600",    ring: "ring-emerald-500/30" },
  email:    { label: "Email",    icon: <Mail className="h-3.5 w-3.5" />,     gradient: "from-amber-500 to-orange-500",    ring: "ring-amber-500/30" },
  whatsapp: { label: "WhatsApp", icon: <Phone className="h-3.5 w-3.5" />,    gradient: "from-green-500 to-emerald-600",  ring: "ring-green-500/30" },
  telegram: { label: "Telegram", icon: <Send className="h-3.5 w-3.5" />,     gradient: "from-blue-500 to-indigo-600",    ring: "ring-blue-500/30" },
};

const STATUS_META: Record<TicketStatus, { label: string; icon: React.ReactNode; pill: string; bar: string; pulse: boolean }> = {
  open:        { label: "Open",        icon: <span className="h-1.5 w-1.5 rounded-full bg-current" />, pill: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",     bar: "bg-blue-500",      pulse: true  },
  in_progress: { label: "In Progress", icon: <Clock className="h-3 w-3" />,                            pill: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400", bar: "bg-amber-500",     pulse: true  },
  resolved:    { label: "Resolved",    icon: <CheckCircle2 className="h-3 w-3" />,                     pill: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", pulse: false },
  closed:      { label: "Closed",      icon: <XCircle className="h-3 w-3" />,                          pill: "bg-muted/80 border-border text-muted-foreground",                         bar: "bg-muted-foreground", pulse: false },
};

const PRIORITY_META: Record<TicketPriority, { label: string; pill: string; dot: string; glow: boolean }> = {
  low:    { label: "Low",    pill: "bg-muted/80 border-border text-muted-foreground",                                   dot: "bg-muted-foreground", glow: false },
  medium: { label: "Medium", pill: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",               dot: "bg-blue-500",         glow: false },
  high:   { label: "High",   pill: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",        dot: "bg-orange-500",       glow: false },
  urgent: { label: "Urgent", pill: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse",     dot: "bg-red-500",          glow: true  },
};

// ─── Small badge components ───────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const m = SOURCE_META[source as TicketSource] ?? { label: source, icon: <Globe className="h-3.5 w-3.5" />, gradient: "from-slate-500 to-slate-600", ring: "" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${m.gradient} px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ring-2 ${m.ring}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status as TicketStatus];
  if (!m) return <span className="text-xs capitalize text-muted-foreground">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${m.pill}`}>
      {m.pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : m.icon}
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority as TicketPriority];
  if (!m) return <span className="text-xs capitalize text-muted-foreground">{priority}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${m.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Note item ────────────────────────────────────────────────────────────────

function NoteItem({ note }: {
  note: { id: string; author: string; authorType: "ai" | "agent" | "system"; content: string; createdAt: string };
}) {
  const isAI     = note.authorType === "ai";
  const isSystem = note.authorType === "system";
  const avatarGradient = isAI ? "from-violet-500 to-purple-600" : isSystem ? "from-slate-400 to-slate-500" : "from-primary to-primary/80";

  return (
    <div className="relative flex gap-4">
      {/* Avatar column */}
      <div className="relative z-10 shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient} text-[11px] font-bold text-white shadow-md ring-2 ring-background`}>
          {isAI ? "AI" : isSystem ? "S" : note.author.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Bubble */}
      <div className="min-w-0 flex-1 pb-2">
        <div className={`rounded-2xl rounded-tl-sm border p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md ${
          isAI ? "border-violet-500/20 bg-violet-500/5" : isSystem ? "border-border bg-muted/40" : "border-border bg-card"
        }`}>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{note.author}</span>
            {isAI && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-500 border border-violet-500/20">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </span>
            )}
            {isSystem && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border border-border">
                <Shield className="h-2.5 w-2.5" /> System
              </span>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {new Date(note.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-[1.75] text-foreground/90">{note.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketId);
  const [members, setMembers] = useState<Member[]>([]);
  const [newNote, setNewNote]   = useState("");

  const assignTicket  = useAssignTicket();
  const updateStatus  = useUpdateTicketStatus();
  const updateTicket  = useUpdateTicket();
  const addNote       = useAddTicketNote();

  useEffect(() => {
    membersApi.listMembers().then((res) => {
      if (res.success && res.data?.members)
        setMembers(res.data.members.filter((m) => m.inviteStatus === "active" && m.user));
    });
  }, []);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !newNote.trim()) return;
    addNote.mutate({ ticketId, content: newNote }, { onSuccess: () => setNewNote("") });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <TicketIcon className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading ticket details…</p>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-10 w-10 text-destructive/50" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">Ticket not found</p>
          <p className="mt-1.5 text-sm text-muted-foreground">This ticket may have been deleted or you may not have access.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/tickets")} className="gap-2 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back to Tickets
        </Button>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const contactName    = ticket.contactProfile?.name  || ticket.requesterContact?.fullName || null;
  const contactEmail   = ticket.contactProfile?.email || ticket.requesterContact?.email    || null;
  const contactPhone   = ticket.contactProfile?.phone || ticket.requesterContact?.phone    || null;
  const contactCompany = ticket.contactProfile?.company || null;
  const contactTags    = ticket.contactProfile?.tags    || [];
  const contactInitial = contactName ? contactName.charAt(0).toUpperCase() : "?";
  const conversations  = ticket.contactProfile?.conversations || [];
  const statusM        = STATUS_META[ticket.status as TicketStatus] ?? { bar: "bg-muted-foreground" };
  const priorityM      = PRIORITY_META[ticket.priority as TicketPriority] ?? { dot: "bg-muted-foreground" };


  return (
    <div className="space-y-6">

      {/* Page header card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        {/* Breadcrumb row */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => navigate("/dashboard/tickets")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tickets
          </button>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          <span className="flex items-center gap-1 font-mono font-bold text-foreground">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {ticket.ticketNumber || ticket.id.slice(-8).toUpperCase()}
          </span>
          <button
            onClick={() => void refetch()}
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {/* Chips */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/50 px-3 py-1 font-mono text-xs font-bold text-muted-foreground">
            <TicketIcon className="h-3.5 w-3.5" />
            #{ticket.ticketNumber || ticket.id.slice(-8).toUpperCase()}
          </span>
          <SourceBadge source={ticket.source} />
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary/80"
            >
              <Tag className="h-2.5 w-2.5 opacity-60" />
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {ticket.title}
        </h1>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Created {new Date(ticket.createdAt).toLocaleString()}
          </span>
          {ticket.updatedAt !== ticket.createdAt && (
            <span className="flex items-center gap-1.5">
              </span>
            )}
            {ticket.conversationId && (
              <Link
                to={`/dashboard/conversations/inbox/chat/${ticket.conversationId}`}
                className="flex items-center gap-1 font-semibold text-primary transition-opacity hover:opacity-80"
              >
                <Inbox className="h-3.5 w-3.5" />
                Jump to conversation
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

      {/* Body grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">

          {/* ═══════════════════ LEFT COLUMN ═══════════════════════════════ */}
          <div className="space-y-6">

            {/* Description */}
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-6 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Description</h2>
              </div>
              <div className="p-6">
                {ticket.description ? (
                  <div className="min-h-[5rem] rounded-xl bg-muted/30 p-5 text-sm leading-7 text-foreground/90 whitespace-pre-wrap font-[450]">
                    {ticket.description}
                  </div>
                ) : (
                  <div className="flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center">
                    <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
                    <p className="text-sm italic text-muted-foreground/70">No description provided</p>
                  </div>
                )}

                {ticket.resolutionNote && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Resolution Note
                      </p>
                      <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                        {ticket.resolutionNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Contact Conversations */}
            {conversations.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Inbox className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Contact Conversations</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
                        {ticket.conversationId && " · origin highlighted"}
                      </p>
                    </div>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                    {conversations.length}
                  </span>
                </div>

                <div className="divide-y divide-border/40">
                  {conversations.map((conv) => {
                    const isOrigin = conv.id === ticket.conversationId;
                    const convStatusColor =
                      conv.status === "open"     ? "bg-blue-500"    :
                      conv.status === "resolved" ? "bg-emerald-500" : "bg-muted-foreground/40";

                    return (
                      <div
                        key={conv.id}
                        className={`group relative flex items-center gap-4 px-6 py-4 transition-all duration-200 ${
                          isOrigin ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Origin accent bar */}
                        {isOrigin && (
                          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" />
                        )}

                        {/* Status dot */}
                        <div className="relative shrink-0">
                          <span className={`flex h-2.5 w-2.5 rounded-full ${convStatusColor}`} />
                          {isOrigin && (
                            <span className={`absolute inset-0 animate-ping rounded-full ${convStatusColor} opacity-60`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {isOrigin && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary border border-primary/20">
                                <TicketIcon className="h-2.5 w-2.5" />
                                Ticket Origin
                              </span>
                            )}
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize border ${
                              conv.status === "open"     ? "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" :
                              conv.status === "resolved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>
                              {conv.status}
                            </span>
                          </div>
                          <p className={`truncate text-sm ${isOrigin ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                            {conv.lastMessage || "No preview available"}
                          </p>
                          {conv.updatedAt && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {new Date(conv.updatedAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* CTA */}
                        {isOrigin ? (
                          <button
                            onClick={() => navigate(`/dashboard/conversations/inbox/chat/${conv.id}`)}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:opacity-90 active:scale-[0.97]"
                          >
                            <Inbox className="h-3 w-3" />
                            Open & Reply
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/dashboard/conversations/inbox/chat/${conv.id}`)}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground opacity-0 shadow-sm transition-all hover:bg-muted group-hover:opacity-100"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            View
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Notes & Activity */}
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-6 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Activity & Notes</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {ticket.notes?.length
                      ? `${ticket.notes.length} note${ticket.notes.length === 1 ? "" : "s"} — internal only`
                      : "No activity yet"}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-6">
                {/* Timeline */}
                {ticket.notes && ticket.notes.length > 0 ? (
                  <div className="relative space-y-4 before:absolute before:left-[17px] before:top-10 before:h-[calc(100%-3rem)] before:w-px before:bg-border/60">
                    {ticket.notes.map((note) => (
                      <NoteItem key={note.id} note={note} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-14 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
                      <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">No activity yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Add the first note below to start the audit trail.</p>
                    </div>
                  </div>
                )}

                {/* Add Note form */}
                <form onSubmit={handleAddNote} className="mt-8">
                  <div className="flex items-center gap-2 mb-3">
                    <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Add Internal Note
                    </Label>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="ticket-note-input"
                      placeholder="Write an internal note visible only to agents…"
                      rows={4}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="resize-none rounded-xl border-border/60 bg-background text-sm leading-relaxed transition-shadow focus:shadow-md"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground/60">Not visible to customers</p>
                      <Button
                        id="ticket-add-note-btn"
                        type="submit"
                        size="sm"
                        disabled={addNote.isPending || !newNote.trim()}
                        className="cursor-pointer gap-1.5 rounded-xl px-4 font-semibold shadow-sm"
                      >
                        {addNote.isPending ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            Adding…
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            Post Note
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>

          {/* ═══════════════════ RIGHT SIDEBAR ═════════════════════════════ */}
          <aside className="space-y-4 lg:sticky lg:top-[4.5rem] lg:self-start">

            {/* ── Management card ──────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-5 py-3.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Manage</h3>
              </div>
              <div className="space-y-4 p-5">
                {/* Status */}
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Status</Label>
                  <div className="relative">
                    <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${statusM.bar}`} />
                    <select
                      id="ticket-status-select"
                      value={ticket.status}
                      onChange={(e) =>
                        updateStatus.mutate({ ticketId: ticket.id, status: e.target.value as TicketStatus })
                      }
                      className="h-9 w-full cursor-pointer appearance-none rounded-xl border border-input bg-background pl-7 pr-3 text-xs font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Priority</Label>
                  <div className="relative">
                    <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${priorityM.dot}`} />
                    <select
                      id="ticket-priority-select"
                      value={ticket.priority}
                      onChange={(e) =>
                        updateTicket.mutate({ ticketId: ticket.id, data: { priority: e.target.value as TicketPriority } })
                      }
                      className="h-9 w-full cursor-pointer appearance-none rounded-xl border border-input bg-background pl-7 pr-3 text-xs font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Assign */}
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Assigned To</Label>
                  <select
                    id="ticket-assign-select"
                    value={ticket.assignedTo?.id || ""}
                    onChange={(e) =>
                      assignTicket.mutate({ ticketId: ticket.id, memberId: e.target.value || null })
                    }
                    className="h-9 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-xs font-medium shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— Unassigned —</option>
                    {members.map((m) => (
                      <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                    ))}
                  </select>

                  {/* Current assignee pill */}
                  {ticket.assignedTo && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-[11px] font-bold text-primary">
                        {ticket.assignedTo.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{ticket.assignedTo.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{ticket.assignedTo.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Contact card ──────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-5 py-3.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
              </div>

              {contactName || contactEmail ? (
                <div className="p-5 space-y-4">
                  {/* Avatar row */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 text-base font-extrabold text-primary shadow-inner ring-2 ring-primary/10">
                        {contactInitial}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{contactName ?? "Unknown"}</p>
                      {contactCompany && (
                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />{contactCompany}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info fields */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate text-[11px] text-foreground/80 font-medium">
                        {contactEmail ?? <span className="italic text-muted-foreground">Not provided</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate text-[11px] text-foreground/80 font-medium">
                        {contactPhone ?? <span className="italic text-muted-foreground">Not provided</span>}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {contactTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {contactTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* View profile link */}
                  {ticket.contactId && (
                    <Link
                      to="/dashboard/contacts/all-contacts"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background py-2 text-xs font-semibold text-foreground/80 transition-all hover:bg-muted hover:text-foreground"
                    >
                      View Full Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
                    <User className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">No contact linked to this ticket</p>
                </div>
              )}
            </div>

            {/* ── Details card ──────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-5 py-3.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Details</h3>
              </div>
              <dl className="divide-y divide-border/40 px-5 py-1">
                {[
                  { label: "Source",  value: <SourceBadge source={ticket.source} /> },
                  { label: "Status",  value: <StatusBadge status={ticket.status} /> },
                  { label: "Priority",value: <PriorityBadge priority={ticket.priority} /> },
                  { label: "Created", value: <span className="text-right text-xs font-medium text-foreground">{new Date(ticket.createdAt).toLocaleString()}</span> },
                  { label: "Updated", value: <span className="text-right text-xs font-medium text-foreground">{new Date(ticket.updatedAt).toLocaleString()}</span> },
                  ...(ticket.resolvedAt ? [{ label: "Resolved", value: <span className="text-right text-xs font-medium text-emerald-500">{new Date(ticket.resolvedAt).toLocaleString()}</span> }] : []),
                  ...(ticket.closedAt   ? [{ label: "Closed",   value: <span className="text-right text-xs font-medium text-muted-foreground">{new Date(ticket.closedAt).toLocaleString()}</span>   }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[11px] font-medium text-muted-foreground shrink-0">{label}</dt>
                    <dd className="flex items-center justify-end">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
      </div>
    </div>
  );
}

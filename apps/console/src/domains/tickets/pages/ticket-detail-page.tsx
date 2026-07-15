import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  Hash,
  Inbox,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Wifi,
} from "lucide-react";
import { membersApi } from "@/domains/member/api/members.api";
import type { Member } from "@/domains/member/types/types";
import { Button } from "@/shared/ui/button";

import { Textarea } from "@/shared/ui/textarea";
import {
  useAddTicketNote,
  useAssignTicket,
  useTicket,
  useUpdateTicket,
  useUpdateTicketStatus,
} from "../hooks";
import { ContactDialog } from "@/domains/contacts/components/contact-form";
import { Loader } from "@/shared/ui/loader";
import { ChannelIcon } from "@/shared/ui/channel-icon";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

const STATUS_META: Record<TicketStatus, { label: string; color: string; soft: string }> = {
  open: {
    label: "Open",
    color: "bg-emerald-500",
    soft: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  in_progress: {
    label: "In progress",
    color: "bg-amber-500",
    soft: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  resolved: {
    label: "Resolved",
    color: "bg-blue-500",
    soft: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  closed: {
    label: "Closed",
    color: "bg-muted-foreground",
    soft: "border-border bg-muted text-muted-foreground",
  },
};

const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-500" },
  medium: { label: "Medium", color: "text-blue-500" },
  high: { label: "High", color: "text-orange-500" },
  urgent: { label: "Urgent", color: "text-red-500" },
};

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI Assistant",
  agent: "Agent",
  api: "API",
  widget: "Widget",
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const CHANNEL_SOURCES = new Set(["widget", "email", "whatsapp", "telegram"]);

function SourceLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {CHANNEL_SOURCES.has(source) && (
        <ChannelIcon channel={source} className="h-3 w-3 shrink-0" />
      )}
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

function SelectField({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-2.5 pr-7 text-xs font-medium text-foreground shadow-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function PaneSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-border/70 px-4 py-4 last:border-b-0 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-foreground">{title}</h2>
        <span className="h-px w-2.5 bg-muted-foreground/40" />
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-xs leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Avatar({
  label,
  variant = "person",
}: {
  label: string;
  variant?: "person" | "ai" | "system";
}) {
  const styles =
    variant === "ai"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
      : variant === "system"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/12 text-primary";

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-[11px] font-bold ${styles}`}
    >
      {variant === "ai" ? <Bot className="h-4 w-4" /> : variant === "system" ? <RefreshCw className="h-3.5 w-3.5" /> : label.charAt(0).toUpperCase()}
    </div>
  );
}

function TimelineEntry({
  author,
  role,
  time,
  children,
  variant = "person",
}: {
  author: string;
  role?: string;
  time: string;
  children: ReactNode;
  variant?: "person" | "ai" | "system";
}) {
  const isSystem = variant === "system";

  return (
    <article className={`flex gap-3 px-5 py-4 sm:px-6 ${isSystem ? "bg-muted/20" : "bg-card"}`}>
      <Avatar label={author} variant={variant} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-0.5">
          <p className="text-xs font-bold text-foreground">
            {author}
            {role && <span className="font-medium text-muted-foreground"> · {role}</span>}
          </p>
          <time className="ml-auto shrink-0 text-[11px] text-muted-foreground">{time}</time>
        </div>
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">{children}</div>
      </div>
    </article>
  );
}

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketId);
  const [members, setMembers] = useState<Member[]>([]);
  const [newNote, setNewNote] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);


  const assignTicket = useAssignTicket();
  const updateStatus = useUpdateTicketStatus();
  const updateTicket = useUpdateTicket();
  const addNote = useAddTicketNote();

  useEffect(() => {
    membersApi.listMembers().then((response) => {
      if (response.success && response.data?.members) {
        setMembers(response.data.members.filter((member) => member.inviteStatus === "accepted" && member.user));
      }
    });
  }, []);

  const handleAddNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticketId || !newNote.trim()) return;

    addNote.mutate(
      { ticketId, content: newNote },
      {
        onSuccess: () => {
          setNewNote("");
          setComposerOpen(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader size="md" />
          <span>Loading ticket…</span>
        </div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex h-[65vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-9 w-9 text-destructive/60" />
        <div>
          <p className="font-bold text-foreground">Ticket not found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been removed or you may not have access.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard/tickets")}>
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Button>
      </div>
    );
  }

  const status = STATUS_META[ticket.status] ?? STATUS_META.open;
  const priority = PRIORITY_META[ticket.priority] ?? PRIORITY_META.medium;
  const ticketNumber = ticket.ticketNumber || ticket.id.slice(-8).toUpperCase();
  const contactName = ticket.contactProfile?.name || ticket.requesterContact?.fullName || "Unknown contact";
  const contactEmail = ticket.contactProfile?.email || ticket.requesterContact?.email;
  const contactPhone = ticket.contactProfile?.phone || ticket.requesterContact?.phone;
  const contactCompany = ticket.contactProfile?.company;
  const contactTags = ticket.contactProfile?.tags || [];

  const ticketTags = ticket.tags || [];
  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  const formatShortDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid min-h-[calc(100vh-10.5rem)] lg:grid-cols-[190px_minmax(0,1fr)_270px] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        <aside className="border-b border-border bg-muted/25 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 divide-x divide-border/70 lg:block lg:divide-x-0">
            <section className="border-border/70 p-4 lg:border-b">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
                <span className={`h-2 w-2 rounded-full ${status.color}`} />
                Status: <span className="font-medium">{status.label}</span>
              </p>
              <SelectField
                ariaLabel="Ticket status"
                value={ticket.status}
                onChange={(value) =>
                  updateStatus.mutate({ ticketId: ticket.id, status: value as TicketStatus })
                }
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </SelectField>
            </section>

            <section className="border-border/70 p-4 lg:border-b">
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">Priority</p>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <ArrowUpRight className={`h-3.5 w-3.5 ${priority.color}`} />
                {priority.label}
              </div>
              <SelectField
                ariaLabel="Ticket priority"
                value={ticket.priority}
                onChange={(value) =>
                  updateTicket.mutate({
                    ticketId: ticket.id,
                    data: { priority: value as TicketPriority },
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </SelectField>
            </section>

            <section className="border-border/70 p-4 lg:border-b">
              <p className="mb-3 text-[11px] font-bold text-muted-foreground">Assignee</p>
              <div className="mb-2 flex items-center gap-2">
                <Avatar label={ticket.assignedTo?.name || "Unassigned"} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {ticket.assignedTo?.name || "Unassigned"}
                  </p>
                  {ticket.assignedTo?.email && (
                    <p className="truncate text-[10px] text-muted-foreground">{ticket.assignedTo.email}</p>
                  )}
                </div>
              </div>
              <SelectField
                ariaLabel="Ticket assignee"
                value={ticket.assignedTo?.id || ""}
                onChange={(value) =>
                  assignTicket.mutate({ ticketId: ticket.id, memberId: value || null })
                }
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user._id} value={member.user._id}>
                    {member.user.name}
                  </option>
                ))}
              </SelectField>
            </section>

            <section className="p-4">
              <p className="mb-3 text-[11px] font-bold text-muted-foreground">Action items</p>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground transition hover:text-primary"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                Add internal note
              </button>
              {ticket.conversationId && (
                <Link
                  to={`/dashboard/conversations/inbox/chat/${ticket.conversationId}?ticketId=${ticket.id}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <Inbox className="h-4 w-4 text-primary-foreground/80" />
                  Open conversation
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                </Link>
              )}
            </section>
          </div>
        </aside>

        <main className="min-w-0 bg-card">
          <header className="border-b border-border px-5 py-5 sm:px-7" data-tour-id="page-ticket-detail-heading">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">#{ticketNumber}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.soft}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
                    {status.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    via <SourceLabel source={ticket.source} />
                  </span>
                </div>
                <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
                  {ticket.title}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                title="Refresh ticket"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <section className="border-b border-border px-5 py-5 sm:px-7" data-tour-id="page-ticket-detail-description">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-bold text-foreground">Description</h2>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
              <p className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">
                {ticket.description || "No description was provided for this ticket."}
              </p>
            </div>
          </section>

          <section data-tour-id="page-ticket-detail-timeline">
            <div className="flex items-center justify-between border-b border-border bg-muted/15 px-5 py-3 sm:px-7">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-bold text-foreground">Conversation timeline</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {ticket.notes?.length || 0} update{ticket.notes?.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="divide-y divide-border/70">
              {ticket.notes && ticket.notes.length > 0 ? (
                ticket.notes.map((note) => (
                  <TimelineEntry
                    key={note.id}
                    author={note.author}
                    role={note.authorType === "system" ? undefined : note.authorType === "ai" ? "AI assistant" : "Support agent"}
                    time={formatDateTime(note.createdAt)}
                    variant={note.authorType === "ai" ? "ai" : note.authorType === "system" ? "system" : "person"}
                  >
                    {note.content}
                  </TimelineEntry>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground/35" />
                  <p className="mt-2 text-xs font-semibold text-foreground">No timeline activity yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Internal notes and updates will appear here.</p>
                </div>
              )}

              {ticket.resolutionNote && (
                <TimelineEntry
                  author="Resolution"
                  time={formatDateTime(ticket.resolvedAt || ticket.updatedAt)}
                  variant="system"
                >
                  <span className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0" />
                    {ticket.resolutionNote}
                  </span>
                </TimelineEntry>
              )}
            </div>
          </section>

          <section className="border-t border-border bg-muted/10 p-4 sm:p-5">
            {composerOpen ? (
              <form onSubmit={handleAddNote} className="rounded-lg border border-border bg-card p-3 shadow-xs">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-foreground">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Internal note
                  <span className="font-medium text-muted-foreground">· visible to agents only</span>
                </div>
                <Textarea
                  autoFocus
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Write an internal note…"
                  rows={3}
                  className="resize-none bg-background text-sm"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setComposerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!newNote.trim() || addNote.isPending}>
                    <Send className="h-3.5 w-3.5" />
                    {addNote.isPending ? "Posting…" : "Post note"}
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add an internal note to the timeline
              </button>
            )}
          </section>
        </main>

        <aside className="border-t border-border bg-muted/30 lg:border-l lg:border-t-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-bold text-foreground">Ticket intelligence</p>
            </div>
          </div>

          <div data-tour-id="page-ticket-detail-contact">
          <PaneSection title="Contact details">
            <div className="mb-3 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar label={contactName} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{contactName}</p>
                  {contactCompany && <p className="truncate text-[10px] text-muted-foreground">{contactCompany}</p>}
                </div>
              </div>
              <ContactDialog
                mode="update"
                contactId={ticket.contactId || undefined}
                conversationId={ticket.conversationId || undefined}
                contact={{
                  name: contactName,
                  email: contactEmail || "",
                  phone: contactPhone || "",
                  company: contactCompany || "",
                  tags: contactTags,
                }}
                triggerType="icon"
                onSuccess={() => void refetch()}
              />
            </div>
            <dl className="space-y-1.5">
              <DetailRow label="Email">
                <span className="block truncate">{contactEmail || "Not provided"}</span>
              </DetailRow>
              <DetailRow label="Phone">{contactPhone || "Not provided"}</DetailRow>
              <DetailRow label="Company">{contactCompany || "Not provided"}</DetailRow>
            </dl>
            {contactTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {contactTags.map((tag) => (
                  <span key={tag} className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </PaneSection>
          </div>

          <PaneSection title="Ticket properties">
            <dl className="space-y-1.5">
              <DetailRow label="Created">{formatShortDate(ticket.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatShortDate(ticket.updatedAt)}</DetailRow>
              <DetailRow label="Source"><SourceLabel source={ticket.source} /></DetailRow>
              <DetailRow label="Priority">
                <span className={priority.color}>{priority.label}</span>
              </DetailRow>
              <DetailRow label="Tags">
                {ticketTags.length > 0 ? (
                  <span className="block break-words">{ticketTags.join(", ")}</span>
                ) : (
                  "None"
                )}
              </DetailRow>
            </dl>
          </PaneSection>




          <PaneSection title="Activity log">
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Ticket updated</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(ticket.updatedAt)}</p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Ticket created</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(ticket.createdAt)}</p>
                </div>
              </div>
            </div>
          </PaneSection>

          <div className="grid grid-cols-2 gap-2 p-4 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-[10px]">
              <Hash className="h-3 w-3" />
              {ticketNumber}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-[10px]">
              {CHANNEL_SOURCES.has(ticket.source) ? (
                <ChannelIcon channel={ticket.source} className="h-3 w-3" />
              ) : ticket.source === "api" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <CircleUserRound className="h-3 w-3" />
              )}
              {SOURCE_LABELS[ticket.source] || ticket.source}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

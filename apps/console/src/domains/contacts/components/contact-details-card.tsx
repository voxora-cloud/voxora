import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Send,
  Sparkles,
  Tags,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { contactsApi } from "../api/contacts.api";
import type { Contact } from "../types/types";
import { useNavigate } from "react-router";
import { ContactDialog } from "./contact-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";

interface ContactDetailsCardProps {
  contact: Contact;
  onResolveConflictsClick?: () => void;
  conversationId?: string;
  onGenerateNote?: () => Promise<string | undefined>;
  isGeneratingNote?: boolean;
  canGenerateNote?: boolean;
}

export function ContactDetailsCard({
  contact,
  onResolveConflictsClick,
  conversationId,
  onGenerateNote,
  isGeneratingNote = false,
  canGenerateNote = true,
}: ContactDetailsCardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newTag, setNewTag] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [isConversationsDialogOpen, setIsConversationsDialogOpen] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim();
    try {
      await contactsApi.addTag(contact.id, tag);
      setNewTag("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await contactsApi.removeTag(contact.id, tag);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return;
    const content = noteDraft.trim();
    try {
      await contactsApi.addNote(contact.id, content);
      setNoteDraft("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  };

  const handleGenerateNote = async () => {
    if (!onGenerateNote) return;
    const generatedNote = await onGenerateNote();
    if (generatedNote?.trim()) {
      setNoteDraft(generatedNote);
    }
  };

  const formatRelative = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case "email":
        return <Mail className="h-3 w-3 shrink-0" />;
      case "telegram":
        return <Send className="h-3 w-3 shrink-0 rotate-[-30deg]" />;
      case "whatsapp":
        return <Phone className="h-3 w-3 shrink-0" />;
      default:
        return <MessageSquare className="h-3 w-3 shrink-0" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    const label = channel?.toLowerCase() === "widget" ? "web" : channel;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 capitalize leading-none shrink-0">
        {getChannelIcon(channel)}
        <span>{label}</span>
      </span>
    );
  };

  const initials = contact.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const displayPhone =
    contact.phone && contact.phone !== "Not provided" ? contact.phone : "";
  const displayCompany = contact.company || "Independent";

  return (
    <>
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {contact.name}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.email || displayPhone || "No contact info"}
                  </p>
                </div>
                <ContactDialog
                  mode="update"
                  contactId={contact.id}
                  conversationId={conversationId}
                  contact={{
                    name: contact.name,
                    email: contact.email || "",
                    phone: displayPhone,
                    company: contact.company || "",
                    tags: contact.tags,
                  }}
                  triggerType="icon"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{contact.email}</span>
              </div>
            )}
            {displayPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{displayPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{displayCompany}</span>
            </div>
          </div>

          {contact.conflicts && contact.conflicts.length > 0 && onResolveConflictsClick && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span>{contact.conflicts.length} pending conflicts</span>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={onResolveConflictsClick}
                className="h-7 cursor-pointer border-amber-300 px-2 text-[11px] hover:bg-amber-100/50"
              >
                Resolve
              </Button>
            </div>
          )}
        </section>

        <section className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tags className="h-4 w-4 text-muted-foreground" />
              Tags
            </h3>
            <span className="text-xs text-muted-foreground">
              {contact.tags.length}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {tag}
              </button>
            ))}
            {contact.tags.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag"
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              className="h-8 cursor-text text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              className="cursor-pointer"
            >
              Add
            </Button>
          </div>
        </section>

        <section className="border-t border-border pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            AI insights
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-xs">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="capitalize">
                {contact.insights.sentiment} sentiment
              </span>
            </div>
            <p className="text-xs leading-relaxed">{contact.insights.summary}</p>
            {contact.insights.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {contact.insights.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <NotebookPen className="h-4 w-4 text-muted-foreground" />
              Notes
            </h3>
            <span className="text-xs text-muted-foreground">
              {contact.notes.length}
            </span>
          </div>
          <Textarea
            placeholder="Add internal note"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="min-h-20 cursor-text resize-none text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleAddNote} className="cursor-pointer">
              Add note
            </Button>
            {onGenerateNote && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateNote}
                disabled={isGeneratingNote || !canGenerateNote}
                className="cursor-pointer border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 focus-visible:ring-violet-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGeneratingNote ? "Generating" : "Generate"}
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {contact.notes.map((note) => (
              <div
                key={note.id}
                className="rounded-md border border-border bg-background/60 p-2.5 text-sm"
              >
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.author}</span>
                  <span>{formatRelative(note.createdAt)}</span>
                </div>
                <p className="leading-relaxed">{note.content}</p>
              </div>
            ))}
            {contact.notes.length === 0 && (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            )}
          </div>
        </section>

        <section className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Recent conversations
            </h3>
            <span className="text-xs text-muted-foreground">
              {contact.conversations.length}
            </span>
          </div>
          <div className="space-y-2">
            {contact.conversations.slice(0, 3).map((conversation) => (
              <button
                key={conversation.id}
                onClick={() =>
                  navigate(`/dashboard/conversations/inbox/chat/${conversation.id}`)
                }
                className="w-full rounded-md border border-border bg-background/60 p-2.5 text-left text-sm transition-colors hover:bg-muted/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge variant="secondary" className="capitalize">
                      {conversation.status}
                    </Badge>
                    {getChannelBadge(conversation.channel)}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(conversation.updatedAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {conversation.lastMessage}
                </p>
              </button>
            ))}
            {contact.conversations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No recent conversations.
              </p>
            )}
            {contact.conversations.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1 text-xs text-primary hover:underline"
                onClick={() => setIsConversationsDialogOpen(true)}
              >
                View all ({contact.conversations.length})
              </Button>
            )}
          </div>
        </section>
      </div>

      <Dialog open={isConversationsDialogOpen} onOpenChange={setIsConversationsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              All Conversations
            </DialogTitle>
            <DialogDescription>
              Browse all conversation history for {contact.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {contact.conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  setIsConversationsDialogOpen(false);
                  navigate(`/dashboard/conversations/inbox/chat/${conversation.id}`);
                }}
                className="rounded-lg border border-border p-3 text-sm cursor-pointer hover:bg-muted/40 transition-all select-none duration-150"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize leading-none shrink-0 ${
                      (conversation.status as string) === "open"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                        : (conversation.status as string) === "pending"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                        : (conversation.status as string) === "resolved"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {conversation.status}
                    </span>
                    {getChannelBadge(conversation.channel)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(conversation.updatedAt)}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{conversation.lastMessage}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

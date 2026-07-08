import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, BadgeCheck, AlertTriangle, MessageSquare, Mail, Send, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{contact.name}</h2>
            <p className="text-sm text-muted-foreground">{contact.email || contact.phone}</p>
          </div>
           <ContactDialog
            mode="update"
            contactId={contact.id}
            conversationId={conversationId}
            contact={{
              name: contact.name,
              email: contact.email || "",
              phone: contact.phone !== "Not provided" ? contact.phone : "",
              company: contact.company || "",
              tags: contact.tags,
            }}
            triggerType="icon"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {contact.company || "Independent"}
        </div>
        <div className="flex flex-wrap gap-2">
          {contact.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add tag"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            className="cursor-text"
          />
          <Button variant="outline" onClick={handleAddTag} className="cursor-pointer">
            Add
          </Button>
        </div>
        {contact.conflicts && contact.conflicts.length > 0 && onResolveConflictsClick && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 space-y-2 mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <span>{contact.conflicts.length} pending conflicts</span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={onResolveConflictsClick}
              className="text-[11px] h-7 px-2 cursor-pointer border-amber-300 hover:bg-amber-100/50"
            >
              Resolve
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-muted/40">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            AI insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="capitalize">{contact.insights.sentiment} sentiment</span>
          </div>
          <p className="text-xs leading-relaxed">{contact.insights.summary}</p>
          {contact.insights.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {contact.insights.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Notes</h3>
          <span className="text-xs text-muted-foreground">
            {contact.notes.length} notes
          </span>
        </div>
        <Textarea
          placeholder="Add internal note for this customer"
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          className="min-h-20 cursor-text"
        />
        <div className="flex flex-wrap items-center gap-2">
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
              className="cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGeneratingNote ? "Generating" : "Generate note"}
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {contact.notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{note.author}</span>
                <span>{formatRelative(note.createdAt)}</span>
              </div>
              <p>{note.content}</p>
            </div>
          ))}
          {contact.notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recent conversations</h3>
        <div className="space-y-2">
          {contact.conversations.slice(0, 3).map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => navigate(`/dashboard/conversations/inbox/chat/${conversation.id}`)}
              className="rounded-lg border border-border p-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="capitalize">
                    {conversation.status}
                  </Badge>
                  {getChannelBadge(conversation.channel)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRelative(conversation.updatedAt)}
                </span>
              </div>
              <p className="text-muted-foreground">{conversation.lastMessage}</p>
            </div>
          ))}
          {contact.conversations.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent conversations.</p>
          )}
          {contact.conversations.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-1 cursor-pointer"
              onClick={() => setIsConversationsDialogOpen(true)}
            >
              View all ({contact.conversations.length})
            </Button>
          )}
        </div>
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

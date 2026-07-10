import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ContactDetailsCard } from "../components/contact-details-card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  Clock,
  MessagesSquare,
  AlertTriangle,
  Loader2,
  Tag,
} from "lucide-react";
import { ContactDialog } from "@/domains/contacts/components/contact-form";
import {
  useContacts,
  usePendingConflicts,
  useResolveConflict,
  useDeleteContacts,
  useBulkAddTags
} from "../hooks/use-contacts";
import type { ContactListItem, Contact } from "../types/types";
import { usePagination } from "@/shared/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/shared/ui/pagination";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";

const TAG_OPTIONS = ["VIP", "Enterprise", "Trial", "Billing", "At Risk"];
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "recent", label: "Most recent activity" },
  { value: "conversations", label: "Conversations" },
  { value: "created", label: "Date created" },
];

const FILTER_ACTIVITY = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const FILTER_CONVERSATIONS = [
  { value: "1-2", label: "1-2 conversations" },
  { value: "3-10", label: "3-10 conversations" },
  { value: "10+", label: "10+ conversations" },
];






const toContactViewModel = (item: ContactListItem): Contact => ({
  id: item.id,
  name: item.name,
  email: item.email,
  phone: item.phone,
  company: item.company,
  tags: item.tags || [],
  lastActivity: item.lastActivity,
  createdAt: item.createdAt,
  isOnline: false,
  conversationCount: item.conversationCount,
  notes: item.notes || [],
  conversations:
    item.conversations && item.conversations.length > 0
      ? item.conversations
      : [
        {
          id: `conv-${item.id}`,
          status: "open",
          lastMessage: "Conversation context is still syncing.",
          channel: "widget",
          updatedAt: item.updatedAt,
        },
      ],
  insights: {
    summary:
      item.insights?.summary ||
      "No insights yet. Continue conversations to generate AI insights.",
    sentiment: item.insights?.sentiment || "neutral",
    topics: item.insights?.topics || [],
  },
  conflicts: item.conflicts || [],
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

const isRecentlyActive = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  return diff < 30 * 60 * 1000;
};

export function ContactsPage() {
  const navigate = useNavigate();
  const [isConflictSheetOpen, setIsConflictSheetOpen] = useState(false);
  const [focusedConflictContactId, setFocusedConflictContactId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [searchValue, setSearchValue] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [conversationFilter, setConversationFilter] = useState<string>("all");
  const [sortValue, setSortValue] = useState("recent");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [bulkTagsInput, setBulkTagsInput] = useState("");

  const { data: rawContacts = [], isLoading: isLoadingContacts, error: loadErrorData } = useContacts();
  const { data: conflicts = [] } = usePendingConflicts();

  const resolveConflictMutation = useResolveConflict();
  const deleteContactsMutation = useDeleteContacts();
  const bulkAddTagsMutation = useBulkAddTags();

  const loadError = loadErrorData ? loadErrorData.message : "";

  const [addedContacts, setAddedContacts] = useState<Contact[]>([]);
  const contacts = useMemo(() => {
    const mapped = rawContacts.map(toContactViewModel);
    return [...addedContacts, ...mapped];
  }, [rawContacts, addedContacts]);

  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId);

  const filteredContacts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    let result = contacts.filter((contact) => {
      const matchesSearch =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query);

      const tagMatch =
        tagFilters.length === 0 ||
        contact.tags.some((tag) => tagFilters.includes(tag));

      const activityMatch = (() => {
        if (activityFilter === "all") return true;
        if (!contact.lastActivity) return false;
        const lastActivity = new Date(contact.lastActivity).getTime();
        if (isNaN(lastActivity)) return false;
        const hours = Math.max(0, (Date.now() - lastActivity) / (1000 * 60 * 60));
        if (activityFilter === "24h") return hours <= 24;
        if (activityFilter === "7d") return hours <= 24 * 7;
        if (activityFilter === "30d") return hours <= 24 * 30;
        if (activityFilter === "90d") return hours <= 24 * 90;
        return true;
      })();

      const conversationMatch = (() => {
        if (conversationFilter === "all") return true;
        if (conversationFilter === "1-2") return contact.conversationCount <= 2;
        if (conversationFilter === "3-10")
          return contact.conversationCount >= 3 && contact.conversationCount <= 10;
        if (conversationFilter === "10+") return contact.conversationCount >= 10;
        return true;
      })();

      return matchesSearch && tagMatch && activityMatch && conversationMatch;
    });

    result = [...result].sort((a, b) => {
      if (sortValue === "name") return a.name.localeCompare(b.name);
      if (sortValue === "conversations") return b.conversationCount - a.conversationCount;
      if (sortValue === "created")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return result;
  }, [
    contacts,
    searchValue,
    tagFilters,
    activityFilter,
    conversationFilter,
    sortValue,
  ]);

  const {
    currentItems: paginatedContacts,
    currentPage,
    totalPages,
    pageNumbers,
    goToPage,
    goToNext,
    goPrev,
    startItem,
    endItem,
    totalItems,
  } = usePagination(filteredContacts, 10, [searchValue, tagFilters, activityFilter, conversationFilter, sortValue]);

  const toggleBulkSelect = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((contact) => contact.id));
    }
  };

  const handleAddContact = (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    tags: string[];
  }) => {
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      company: payload.company,
      tags: payload.tags,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isOnline: false,
      conversationCount: 0,
      notes: [],
      conversations: [],
      insights: {
        summary: "No insights yet. Start a conversation to generate AI context.",
        sentiment: "neutral",
        topics: [],
      },
      conflicts: [],
    };

    setAddedContacts((prev) => [newContact, ...prev]);
    setSelectedContactId(newContact.id);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    try {
      await deleteContactsMutation.mutateAsync(selectedContacts);
      setSelectedContacts([]);
      setSelectedContactId("");
      setIsDeleteDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete contacts");
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedContacts.length === 0) return;
    const tagsToAdd = bulkTagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;
    try {
      await bulkAddTagsMutation.mutateAsync({ ids: selectedContacts, tags: tagsToAdd });
      setSelectedContacts([]);
      setBulkTagsInput("");
      setIsBulkTagDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add tags");
    }
  };

  const handleBulkExport = () => {
    if (selectedContacts.length === 0) return;
    const selected = contacts.filter((c) => selectedContacts.includes(c.id));
    const headers = ["Name", "Email", "Phone", "Company", "Tags", "Conversation Count", "Last Activity", "Created At"];
    const csvRows = [headers.join(",")];

    for (const c of selected) {
      const row = [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.phone || "").replace(/"/g, '""')}"`,
        `"${(c.company || "").replace(/"/g, '""')}"`,
        `"${(c.tags || []).join("; ").replace(/"/g, '""')}"`,
        c.conversationCount || 0,
        c.lastActivity,
        c.createdAt,
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResolveConflict = async (conflictId: string, action: "apply" | "dismiss") => {
    try {
      await resolveConflictMutation.mutateAsync({ conflictId, action });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve conflict");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4" data-tour-id="page-contacts-heading">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage customer profiles, tags, and conversation context in one workspace.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoadingContacts
              ? "Syncing contacts from database..."
              : loadError
                ? `Showing fallback sample data: ${loadError}`
                : "Live contact data is synced from your organization database."}
          </p>
        </div>
        <div className="flex items-center gap-2" data-tour-id="page-contacts-primary-action">
          <ContactDialog
            mode="create"
            onSubmit={handleAddContact}
            triggerType="custom"
            customTrigger={
              <Button className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Add contact
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] gap-6">
        <Card className="h-full" data-tour-id="page-contacts-filters">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTagFilters((prev) =>
                        prev.includes(tag)
                          ? prev.filter((item) => item !== tag)
                          : [...prev, tag],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${tagFilters.includes(tag)
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Last activity</Label>
              <Select
                value={activityFilter}
                onValueChange={setActivityFilter}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  {FILTER_ACTIVITY.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Conversations</Label>
              <Select
                value={conversationFilter}
                onValueChange={setConversationFilter}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any volume</SelectItem>
                  {FILTER_CONVERSATIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => {
                  setTagFilters([]);
                  setActivityFilter("all");
                  setConversationFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full" data-tour-id="page-contacts-list">
          <CardHeader className="border-b space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4" />
                {totalItems} contacts
              </div>
              <Select value={sortValue} onValueChange={setSortValue}>
                <SelectTrigger className="w-52 cursor-pointer">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative" data-tour-id="page-contacts-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or company"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="pl-10 cursor-text"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts.length > 0 && (
              <button
                onClick={() => {
                  setFocusedConflictContactId(null);
                  setIsConflictSheetOpen(true);
                }}
                className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex items-center justify-between text-sm text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <span>{conflicts.length} Pending Profile Conflicts</span>
                </div>
                <span className="text-xs underline">Review conflicts</span>
              </button>
            )}

            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
                <div className="text-sm text-muted-foreground">
                  {selectedContacts.length} contacts selected
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsBulkTagDialogOpen(true)} className="cursor-pointer">
                    Add tags
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkExport} className="cursor-pointer">
                    Export
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer">
                    Delete
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filteredContacts.length > 0 &&
                    selectedContacts.length === filteredContacts.length
                  }
                  onChange={toggleSelectAll}
                  className="accent-primary cursor-pointer"
                />
                Select all
              </label>
              <span>Showing {startItem}-{endItem} of {totalItems} results</span>
            </div>

            <div className="flex flex-col gap-1">
              {paginatedContacts.map((contact) => {
                const isActive = contact.id === selectedContactId;
                const isSelected = selectedContacts.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      toggleBulkSelect(contact.id);
                    }}
                    className={`w-full text-left py-3.5 px-4 rounded-lg transition-all cursor-pointer border-l-4 select-none ${
                      isActive
                        ? "bg-primary/[0.04] border-l-primary shadow-xs"
                        : isSelected
                        ? "bg-primary/[0.015] border-l-transparent"
                        : "hover:bg-muted/30 border-l-transparent"
                    }`}
                  >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleBulkSelect(contact.id);
                        }}
                        className="accent-primary cursor-pointer"
                      />
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          {contact.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${contact.isOnline
                            ? "bg-emerald-500"
                            : isRecentlyActive(contact.lastActivity)
                              ? "bg-amber-400"
                              : "bg-muted"
                            }`}
                          title={contact.isOnline ? "Online" : "Recently active"}
                        />
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {contact.name}
                          </h3>
                          {contact.conflicts && contact.conflicts.length > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 text-[10px] py-0 px-1 font-medium flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Conflict
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {contact.email || contact.phone || "No contact info"}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {contact.company || "Independent"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{contact.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatRelative(contact.lastActivity)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <MessagesSquare className="h-4 w-4" />
                          <span>{contact.conversationCount} conversations</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

            {totalPages > 1 && (
              <div className="pt-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem className="cursor-pointer">
                      <PaginationPrevious
                        onClick={(e) => { e.preventDefault(); goPrev(); }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {pageNumbers.map((page, idx) => (
                      <PaginationItem key={idx} className="cursor-pointer">
                        {page === "..." ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={(e) => { e.preventDefault(); goToPage(page as number); }}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem className="cursor-pointer">
                      <PaginationNext
                        onClick={(e) => { e.preventDefault(); goToNext(); }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedContact ? (
              <div className="text-sm text-muted-foreground">
                Select a contact to see details.
              </div>
            ) : (
              <ContactDetailsCard
                contact={selectedContact}
                onResolveConflictsClick={() => {
                  setFocusedConflictContactId(selectedContact.id);
                  setIsConflictSheetOpen(true);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Contacts"
        itemName={`${selectedContacts.length} selected contact(s)`}
        isDeleting={deleteContactsMutation.isPending}
      />

      <Dialog open={isBulkTagDialogOpen} onOpenChange={setIsBulkTagDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Add Tags in Bulk
            </DialogTitle>
            <DialogDescription>
              Apply tags to the {selectedContacts.length} selected contacts. Enter tags separated by commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-tags-input">Tags</Label>
              <Input
                id="bulk-tags-input"
                placeholder="e.g. VIP, Enterprise, At Risk"
                value={bulkTagsInput}
                onChange={(e) => setBulkTagsInput(e.target.value)}
                autoFocus
                className="cursor-text"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkTagDialogOpen(false);
                setBulkTagsInput("");
              }}
              disabled={bulkAddTagsMutation.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddTags}
              disabled={bulkAddTagsMutation.isPending || !bulkTagsInput.trim()}
              className="cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground border-0"
            >
              {bulkAddTagsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConflictSheetOpen} onOpenChange={setIsConflictSheetOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Profile Conflicts
            </DialogTitle>
            <DialogDescription>
              {focusedConflictContactId
                ? `Review and resolve conflicting profile details captured for ${selectedContact?.name || "this contact"}.`
                : "Multiple conflicting profile details were captured during user conversations. Resolve them below to maintain profile integrity."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(focusedConflictContactId
              ? conflicts.filter((c) => c.contactId === focusedConflictContactId)
              : conflicts
            ).map((conflict) => (
              <div key={conflict.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{conflict.contactName}</h4>
                    <p className="text-xs text-muted-foreground">{conflict.contactEmail || "No email"}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {conflict.field} Mismatch
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-background border border-border rounded-md p-3">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Current Value</span>
                    <span className="font-medium text-foreground block truncate">
                      {conflict.currentValue || <em className="text-muted-foreground text-xs">Not set</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-amber-600 dark:text-amber-500 block mb-1">Proposed Value</span>
                    <span className="font-medium text-amber-600 dark:text-amber-500 block truncate">
                      {conflict.proposedValue}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      setIsConflictSheetOpen(false);
                      navigate(`/dashboard/conversations/inbox/chat/${conflict.conversationId}`);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                  >
                    View Chat Session
                  </button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict(conflict.id, "dismiss")}
                      className="cursor-pointer text-xs"
                    >
                      Keep Current
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolveConflict(conflict.id, "apply")}
                      className="cursor-pointer text-xs bg-amber-500 hover:bg-amber-600 text-white border-0"
                    >
                      Apply Proposed
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {conflicts.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                All conflicts have been resolved!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

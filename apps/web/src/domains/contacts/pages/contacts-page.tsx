import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  BadgeCheck,
  Clock,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { AddContactForm } from "@/domains/contacts/components/add-contact-form";

const TAG_OPTIONS = ["VIP", "Enterprise", "Trial", "Billing", "At Risk"];
const STATUS_OPTIONS = ["active", "inactive", "blocked"] as const;
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


interface ContactNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface ContactConversation {
  id: string;
  status: "open" | "pending" | "resolved" | "closed";
  lastMessage: string;
  updatedAt: string;
}

interface ContactTimelineEvent {
  id: string;
  label: string;
  timestamp: string;
  detail?: string;
}

interface ContactInsight {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  status: (typeof STATUS_OPTIONS)[number];
  lastActivity: string;
  createdAt: string;
  isOnline: boolean;
  conversationCount: number;
  notes: ContactNote[];
  conversations: ContactConversation[];
  timeline: ContactTimelineEvent[];
  insights: ContactInsight;
}

const CONTACTS_SEED: Contact[] = [
  {
    id: "c-001",
    name: "Amelia Harper",
    email: "amelia@northwind.io",
    phone: "+1 (415) 555-9021",
    company: "Northwind Logistics",
    tags: ["VIP", "Enterprise"],
    status: "active",
    lastActivity: "2026-03-13T09:20:00Z",
    createdAt: "2025-11-02T14:10:00Z",
    isOnline: true,
    conversationCount: 14,
    notes: [
      {
        id: "n-1",
        author: "Jules",
        content: "Handles renewals quarterly. Prefers email follow-up.",
        createdAt: "2026-03-02T16:30:00Z",
      },
    ],
    conversations: [
      {
        id: "conv-101",
        status: "open",
        lastMessage: "Need help with invoice adjustments for March.",
        updatedAt: "2026-03-13T09:18:00Z",
      },
      {
        id: "conv-094",
        status: "resolved",
        lastMessage: "Thanks for the quick response yesterday!",
        updatedAt: "2026-02-27T12:40:00Z",
      },
    ],
    timeline: [
      {
        id: "t-1",
        label: "Conversation escalated to billing",
        timestamp: "2026-03-13T09:10:00Z",
      },
      {
        id: "t-2",
        label: "Tagged as VIP",
        timestamp: "2026-02-08T10:00:00Z",
      },
    ],
    insights: {
      summary: "Billing-related conversations increased this month. Priority attention recommended.",
      sentiment: "neutral",
      topics: ["Billing", "Renewals", "Invoices"],
    },
  },
  {
    id: "c-002",
    name: "Diego Martinez",
    email: "diego@atlaslabs.co",
    phone: "+1 (512) 555-3490",
    company: "Atlas Labs",
    tags: ["Trial"],
    status: "active",
    lastActivity: "2026-03-12T20:05:00Z",
    createdAt: "2026-02-10T09:30:00Z",
    isOnline: false,
    conversationCount: 3,
    notes: [
      {
        id: "n-2",
        author: "Priya",
        content: "Trial ends in 9 days. Interested in automation features.",
        createdAt: "2026-03-07T08:15:00Z",
      },
    ],
    conversations: [
      {
        id: "conv-111",
        status: "pending",
        lastMessage: "Can I export data from the dashboard?",
        updatedAt: "2026-03-12T20:05:00Z",
      },
    ],
    timeline: [
      {
        id: "t-3",
        label: "Trial onboarding call completed",
        timestamp: "2026-02-12T14:00:00Z",
      },
    ],
    insights: {
      summary: "High curiosity about automation and reporting features.",
      sentiment: "positive",
      topics: ["Reporting", "Automation"],
    },
  },
  {
    id: "c-003",
    name: "Sora Lee",
    email: "sora@brightpath.org",
    phone: "+44 20 7946 1001",
    company: "Brightpath",
    tags: ["Billing"],
    status: "inactive",
    lastActivity: "2026-02-18T11:42:00Z",
    createdAt: "2025-06-21T10:05:00Z",
    isOnline: false,
    conversationCount: 9,
    notes: [],
    conversations: [
      {
        id: "conv-077",
        status: "resolved",
        lastMessage: "Invoice has been updated, thanks.",
        updatedAt: "2026-02-18T11:40:00Z",
      },
    ],
    timeline: [
      {
        id: "t-4",
        label: "Account marked inactive",
        timestamp: "2026-02-20T09:00:00Z",
      },
    ],
    insights: {
      summary: "Historically engaged during billing cycles. Reactivate before next renewal.",
      sentiment: "neutral",
      topics: ["Billing", "Invoices"],
    },
  },
  {
    id: "c-004",
    name: "Marcos Silva",
    email: "marcos@zenbyte.ai",
    phone: "+55 11 98888-2244",
    company: "Zenbyte AI",
    tags: ["Enterprise", "At Risk"],
    status: "blocked",
    lastActivity: "2026-01-22T19:20:00Z",
    createdAt: "2025-01-19T12:00:00Z",
    isOnline: false,
    conversationCount: 21,
    notes: [
      {
        id: "n-3",
        author: "Alex",
        content: "Escalate to compliance before reactivation.",
        createdAt: "2026-01-25T09:10:00Z",
      },
    ],
    conversations: [
      {
        id: "conv-052",
        status: "closed",
        lastMessage: "We will revisit next quarter.",
        updatedAt: "2026-01-22T19:20:00Z",
      },
    ],
    timeline: [
      {
        id: "t-5",
        label: "Account blocked",
        timestamp: "2026-01-23T08:00:00Z",
      },
    ],
    insights: {
      summary: "Negative sentiment spike around contract renewal. Needs executive outreach.",
      sentiment: "negative",
      topics: ["Renewal", "Compliance", "Contract"],
    },
  },
];

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
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS_SEED);
  const [selectedContactId, setSelectedContactId] = useState<string>(
    CONTACTS_SEED[0]?.id,
  );
  const [searchValue, setSearchValue] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [conversationFilter, setConversationFilter] = useState<string>("all");
  const [sortValue, setSortValue] = useState("recent");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

      const statusMatch =
        statusFilters.length === 0 || statusFilters.includes(contact.status);

      const tagMatch =
        tagFilters.length === 0 ||
        contact.tags.some((tag) => tagFilters.includes(tag));

      const activityMatch = (() => {
        if (activityFilter === "all") return true;
        const lastActivity = new Date(contact.lastActivity).getTime();
        const hours = (Date.now() - lastActivity) / (1000 * 60 * 60);
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

      return matchesSearch && statusMatch && tagMatch && activityMatch && conversationMatch;
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
    statusFilters,
    tagFilters,
    activityFilter,
    conversationFilter,
    sortValue,
  ]);

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

  const handleAddTag = () => {
    if (!selectedContact || !newTag.trim()) return;
    const nextTag = newTag.trim();
    if (selectedContact.tags.includes(nextTag)) {
      setNewTag("");
      return;
    }

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact.id
          ? { ...contact, tags: [...contact.tags, nextTag] }
          : contact,
      ),
    );
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedContact) return;
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact.id
          ? { ...contact, tags: contact.tags.filter((t) => t !== tag) }
          : contact,
      ),
    );
  };

  const handleAddNote = () => {
    if (!selectedContact || !noteDraft.trim()) return;
    const newNote: ContactNote = {
      id: `note-${Date.now()}`,
      author: "You",
      content: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    };

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === selectedContact.id
          ? { ...contact, notes: [newNote, ...contact.notes] }
          : contact,
      ),
    );
    setNoteDraft("");
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
      status: "active",
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isOnline: false,
      conversationCount: 0,
      notes: [],
      conversations: [],
      timeline: [
        {
          id: `timeline-${Date.now()}`,
          label: "Contact created",
          timestamp: new Date().toISOString(),
        },
      ],
      insights: {
        summary: "No insights yet. Start a conversation to generate AI context.",
        sentiment: "neutral",
        topics: [],
      },
    };

    setContacts((prev) => [newContact, ...prev]);
    setSelectedContactId(newContact.id);
    setIsAddDialogOpen(false);
  };

  const renderStatusBadge = (status: Contact["status"]) => {
    if (status === "active") return <Badge variant="success">Active</Badge>;
    if (status === "blocked") return <Badge variant="destructive">Blocked</Badge>;
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage customer profiles, tags, and conversation context in one workspace.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Use the sidebar theme toggle to preview this page globally.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-180">
              <DialogHeader>
                <DialogTitle>Add new contact</DialogTitle>
                <DialogDescription>
                  Capture customer details so agents can provide faster, more personal support.
                </DialogDescription>
              </DialogHeader>
              <AddContactForm onSubmit={handleAddContact} tagOptions={TAG_OPTIONS} />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] gap-6">
        <Card className="h-full">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Status</Label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilters.includes(status)}
                      onChange={() =>
                        setStatusFilters((prev) =>
                          prev.includes(status)
                            ? prev.filter((item) => item !== status)
                            : [...prev, status],
                        )
                      }
                      className="accent-primary cursor-pointer"
                    />
                    <span className="capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>

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
                    className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                      tagFilters.includes(tag)
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
                  setStatusFilters([]);
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

        <Card className="h-full">
          <CardHeader className="border-b space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4" />
                {filteredContacts.length} contacts
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
            <div className="relative">
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
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
                <div className="text-sm text-muted-foreground">
                  {selectedContacts.length} contacts selected
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    Add tags
                  </Button>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    Export
                  </Button>
                  <Button variant="destructive" size="sm" className="cursor-pointer">
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
              <span>Showing {filteredContacts.length} results</span>
            </div>

            <div className="divide-y divide-border">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`w-full text-left py-4 transition-colors cursor-pointer ${
                    contact.id === selectedContactId
                      ? "bg-muted/40"
                      : "hover:bg-muted/20"
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
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                            contact.isOnline
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
                          {renderStatusBadge(contact.status)}
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
              ))}
            </div>
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
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedContact.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedContact.email || selectedContact.phone}
                      </p>
                    </div>
                    {renderStatusBadge(selectedContact.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedContact.company || "Independent"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag) => (
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
                </div>

                <Card className="bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      <span className="capitalize">{selectedContact.insights.sentiment} sentiment</span>
                    </div>
                    <p>{selectedContact.insights.summary}</p>
                    {selectedContact.insights.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedContact.insights.topics.map((topic) => (
                          <Badge key={topic} variant="outline">
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
                      {selectedContact.notes.length} notes
                    </span>
                  </div>
                  <Textarea
                    placeholder="Add internal note for this customer"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    className="min-h-20 cursor-text"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    className="cursor-pointer"
                  >
                    Add note
                  </Button>
                  <div className="space-y-3">
                    {selectedContact.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{note.author}</span>
                          <span>{formatRelative(note.createdAt)}</span>
                        </div>
                        <p>{note.content}</p>
                      </div>
                    ))}
                    {selectedContact.notes.length === 0 && (
                      <p className="text-sm text-muted-foreground">No notes yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Recent conversations</h3>
                  <div className="space-y-2">
                    {selectedContact.conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary" className="capitalize">
                            {conversation.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelative(conversation.updatedAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    ))}
                    {selectedContact.conversations.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No recent conversations.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Activity timeline</h3>
                  <div className="space-y-3">
                    {selectedContact.timeline.map((event) => (
                      <div key={event.id} className="flex gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-foreground">{event.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(event.timestamp)}
                          </p>
                          {event.detail && (
                            <p className="text-xs text-muted-foreground">
                              {event.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedContact.timeline.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No activity recorded.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

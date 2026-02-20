"use client";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  RefreshCw,
  Trash2,
  FileText,
  File,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  XCircle,
  X,
} from "lucide-react";
import { KnowledgeBase } from "@/lib/interfaces/knowledge";

interface KnowledgeTableProps {
  knowledgeItems: KnowledgeBase[];
  onViewItem: (item: KnowledgeBase) => void;
  onReindexItem: (item: KnowledgeBase) => void;
  onDeleteItem: (item: KnowledgeBase) => void;
  onRetryItem: (item: KnowledgeBase) => void;
}

export default function KnowledgeTable({
  knowledgeItems,
  onViewItem,
  onReindexItem,
  onDeleteItem,
  onRetryItem,
}: KnowledgeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    let result = [...knowledgeItems];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((item) => item.source === sourceFilter);
    }

    return result;
  }, [knowledgeItems, searchQuery, statusFilter, sourceFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || sourceFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "pdf":
      case "docx":
        return <File className="h-4 w-4" />;
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Indexed
          </span>
        );
      case "indexing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="h-3 w-3 animate-spin" />
            Indexing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 text-xs font-medium">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        );
      default:
        return null;
    }
  };

  const formatLastIndexed = (date?: Date) => {
    if (!date) return "—";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left">
              <div className="space-y-2">
                <div className="font-medium text-foreground">Title</div>
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs cursor-text"
                />
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="space-y-2">
                <div className="font-medium text-foreground">Source</div>
                <Select
                  value={sourceFilter}
                  onValueChange={(value) => setSourceFilter(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="space-y-2">
                <div className="font-medium text-foreground">Status</div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="indexed">Indexed</SelectItem>
                    <SelectItem value="indexing">Indexing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-medium text-foreground">Last Indexed</div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Actions</span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-6 text-xs cursor-pointer"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <tr
                key={item._id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    {getSourceIcon(item.source)}
                    <span className="uppercase">{item.source}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatLastIndexed(item.lastIndexed)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewItem(item)}
                      className="h-8 cursor-pointer"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {item.status === "failed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetryItem(item)}
                        className="h-8 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    ) : item.status === "indexed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReindexItem(item)}
                        className="h-8 cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Re-index
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteItem(item)}
                      className="h-8 text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center">
                <div className="text-muted-foreground">
                  {hasActiveFilters
                    ? "No knowledge items match your filters"
                    : "No knowledge items yet"}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

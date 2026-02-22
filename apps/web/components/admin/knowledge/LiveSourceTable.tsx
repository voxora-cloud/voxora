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
  Pause,
  Play,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Globe,
  FileText,
  Newspaper,
  BookOpen as BookOpenIcon,
} from "lucide-react";
import { LiveSource } from "@/lib/interfaces/liveSource";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usePagination } from "@/lib/hooks/usePagination";

interface LiveSourceTableProps {
  sources: LiveSource[];
  onViewSource: (source: LiveSource) => void;
  onPauseSource: (source: LiveSource) => void;
  onResumeSource: (source: LiveSource) => void;
  onRetrySource: (source: LiveSource) => void;
  onDeleteSource: (source: LiveSource) => void;
}

export default function LiveSourceTable({
  sources,
  onViewSource,
  onPauseSource,
  onResumeSource,
  onRetrySource,
  onDeleteSource,
}: LiveSourceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredSources = useMemo(() => {
    let result = [...sources];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((source) =>
        source.url.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((source) => source.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((source) => source.type === typeFilter);
    }

    return result;
  }, [sources, searchQuery, statusFilter, typeFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const {
    currentItems: paginatedSources,
    currentPage,
    totalPages,
    pageNumbers,
    goToPage,
    goToNext,
    goPrev,
    startItem,
    endItem,
    totalItems,
  } = usePagination(filteredSources, 10, [searchQuery, statusFilter, typeFilter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "website":
        return <Globe className="h-4 w-4" />;
      case "page":
        return <FileText className="h-4 w-4" />;
      case "blog":
        return <Newspaper className="h-4 w-4" />;
      case "docs":
        return <BookOpenIcon className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Synced
          </span>
        );
      case "fetching":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="h-3 w-3 animate-spin" />
            Fetching
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
      default:
        return null;
    }
  };

  const formatLastFetch = (date?: Date) => {
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
                <div className="font-medium text-foreground">URL</div>
                <Input
                  placeholder="Search URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs cursor-text"
                />
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="space-y-2">
                <div className="font-medium text-foreground">Type</div>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="page">Page</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="docs">Docs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-medium text-foreground">Last Fetch</div>
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
                    <SelectItem value="synced">Synced</SelectItem>
                    <SelectItem value="fetching">Fetching</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </th>
            <th className="px-4 py-3 text-left">
              <div className="font-medium text-foreground">Changes</div>
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
          {paginatedSources.length > 0 ? (
            paginatedSources.map((source) => (
              <tr
                key={source._id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground max-w-xs truncate">
                    {source.url}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    {getTypeIcon(source.type)}
                    <span className="capitalize">{source.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatLastFetch(source.lastFetch)}
                  </span>
                </td>
                <td className="px-4 py-3">{getStatusBadge(source.status)}</td>
                <td className="px-4 py-3">
                  {source.changesSummary ? (
                    <span className="text-sm text-foreground">
                      {source.changesSummary}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewSource(source)}
                      className="h-8 cursor-pointer"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {source.status === "failed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetrySource(source)}
                        className="h-8 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    ) : source.isPaused ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResumeSource(source)}
                        className="h-8 text-green-600 hover:text-green-700 cursor-pointer"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPauseSource(source)}
                        className="h-8 cursor-pointer"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSource(source)}
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
              <td colSpan={6} className="px-4 py-12 text-center">
                <div className="text-muted-foreground">
                  {hasActiveFilters
                    ? "No live sources match your filters"
                    : "No live sources yet"}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col items-center gap-2 px-4 py-4 border-t border-border">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={goPrev}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "opacity-40 pointer-events-none" : "cursor-pointer"}
                />
              </PaginationItem>

              {pageNumbers.map((page, idx) =>
                page === "..." ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => goToPage(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={goToNext}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "opacity-40 pointer-events-none" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{startItem}–{endItem}</span>{" "}
            of{" "}
            <span className="font-medium text-foreground">{totalItems}</span>{" "}
            sources
          </p>
        </div>
      )}
    </div>
  );
}

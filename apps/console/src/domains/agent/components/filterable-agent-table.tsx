import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Eye, Mail, Search, User, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import type { Agent } from "../types/types";


interface FilterableAgentTableProps {
  agents: Agent[];
  onViewDetails: (agent: Agent) => void;
  onResendInvite: (agentId: string) => void;
}



function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "Never";

  let date: Date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === "string") {
    date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateValue, 10);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }
  } else {
    date = new Date(dateValue);
  }

  if (isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
}

export function FilterableAgentTable({
  agents,
  onViewDetails,
  onResendInvite,
}: FilterableAgentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Apply filters
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      if (
        !agent.user?.name?.toLowerCase().includes(query) &&
        !agent.user?.email?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && agent.inviteStatus !== statusFilter) {
      return false;
    }



    return true;
  });

  const {
    currentItems: paginatedAgents,
    currentPage,
    totalPages,
    pageNumbers,
    goToPage,
    goToNext,
    goPrev,
    startItem,
    endItem,
    totalItems,
  } = usePagination(filteredAgents, 10, [searchQuery, statusFilter]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {/* Agent Column with Search */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Agent</div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-7 h-8 text-xs cursor-text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </th>

              {/* Status Column with Filter */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Status</div>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </th>



              {/* Last Active Column */}
              <th className="px-4 py-3 text-left">
                <div className="font-medium text-foreground">Last Active</div>
              </th>

              {/* Actions Column */}
              <th className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-medium text-foreground">Actions</span>
                  {(searchQuery || statusFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs cursor-pointer"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedAgents.map((agent, index) => {
              const agentId = agent._id || agent.user?._id;

              return (
                <tr
                  key={agentId || `agent-${index}`}
                  className="border-t border-border transition-all duration-300 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {agent.user?.name?.charAt(0) ||
                          agent.user?.email?.charAt(0)?.toUpperCase() ||
                          "A"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {agent.user?.name || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground">{agent.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.inviteStatus === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : agent.inviteStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {agent.inviteStatus}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {formatDate(agent.lastSeen)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-2">
                      {agent.inviteStatus === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-yellow-600 hover:text-yellow-700 cursor-pointer"
                          onClick={() => onResendInvite(agentId)}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Resend
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => onViewDetails(agent)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAgents.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No agents found</h3>
            <p className="text-muted-foreground mt-1">
              {agents.length === 0 ? "No agents have been added yet" : "Try adjusting your filters"}
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-4 border-t border-border">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    size="default"
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
                        size="icon"
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
                    size="default"
                    onClick={goToNext}
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages ? "opacity-40 pointer-events-none" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <p className="text-xs text-muted-foreground">
              Showing {startItem}-{endItem} of {totalItems} agents
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
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
import { Edit, Mail, Search, Trash2, User, X, PowerOff, Power, Loader2 } from "lucide-react";
import type { Member } from "../types/types";
import { authApi } from "@/domains/auth/api/auth.api";

interface FilterableMemberTableProps {
  members: Member[];
  currentUserId?: string;
  onEditMember: (member: Member) => void;
  onDeleteMember: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onResendInvite?: (member: Member) => void;
  // Optimistic update props
  invitingMemberId?: string;
  updatingMemberId?: string;
  deletingMemberId?: string;
  togglingMemberId?: string;
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

export function FilterableMemberTable({
  members,
  currentUserId,
  onEditMember,
  onDeleteMember,
  onToggleStatus,
  onResendInvite,
  invitingMemberId,
  updatingMemberId,
  deletingMemberId,
  togglingMemberId,
}: FilterableMemberTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const currentUserRole = authApi.getOrgRole() || "agent";

  // Apply filters
  const filteredMembers = members.filter((member) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      if (
        !member.user.name?.toLowerCase().includes(query) &&
        !member.user.email?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && member.inviteStatus !== statusFilter) {
      return false;
    }

    // Role filter
    if (roleFilter !== "all" && member.role !== roleFilter) {
      return false;
    }

    return true;
  });

  const {
    currentItems: paginatedMembers,
    currentPage,
    totalPages,
    pageNumbers,
    goToPage,
    goToNext,
    goPrev,
    startItem,
    endItem,
    totalItems,
  } = usePagination(filteredMembers, 10, [searchQuery, statusFilter, roleFilter]);

  const canManageMember = (member: Member): boolean => {
    const activeRole = currentUserRole;
    const targetRole = member.role;
    return (
      activeRole === "owner" || (activeRole === "admin" && targetRole === "agent")
    );
  };

  const isProcessing = (memberId: string): boolean => {
    return (
      memberId === invitingMemberId ||
      memberId === updatingMemberId ||
      memberId === deletingMemberId ||
      memberId === togglingMemberId
    );
  };

  const getProcessingStatus = (memberId: string): string | null => {
    if (memberId === invitingMemberId) return "Inviting...";
    if (memberId === updatingMemberId) return "Updating...";
    if (memberId === deletingMemberId) return "Deleting...";
    if (memberId === togglingMemberId) return "Updating status...";
    return null;
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {/* Member Column with Search */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Member</div>
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
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                      <SelectItem value="active" className="cursor-pointer">Active</SelectItem>
                      <SelectItem value="pending" className="cursor-pointer">Pending</SelectItem>
                      <SelectItem value="inactive" className="cursor-pointer">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </th>

              {/* Role Column with Filter */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Role</div>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All Roles</SelectItem>
                      <SelectItem value="owner" className="cursor-pointer">Owner</SelectItem>
                      <SelectItem value="admin" className="cursor-pointer">Admin</SelectItem>
                      <SelectItem value="agent" className="cursor-pointer">Agent</SelectItem>
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
                  {(searchQuery || statusFilter !== "all" || roleFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs cursor-pointer"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setRoleFilter("all");
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
            {paginatedMembers.map((member) => {
              const processing = isProcessing(member.membershipId);
              const processingStatus = getProcessingStatus(member.membershipId);

              return (
                <tr
                  key={member.membershipId}
                  className={`border-t border-border hover:bg-muted/50 transition-colors ${processing ? "opacity-50 grayscale pointer-events-none" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {member.user?.name?.charAt(0) ||
                          member.user?.email?.charAt(0).toUpperCase() ||
                          "A"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user?.name || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user?.email || "No email"}
                        </p>
                      </div>
                      {processing && (
                        <div className="flex items-center gap-2 text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-medium">{processingStatus}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${member.inviteStatus === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-500/20"
                          : member.inviteStatus === "pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-500/20"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-500/20"
                        }`}
                    >
                      {member.inviteStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium capitalize text-foreground">
                        {member.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {formatDate(member.user?.lastSeen || member.activatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-2">
                      {member.inviteStatus === "pending" && onResendInvite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                          onClick={() => onResendInvite(member)}
                          title="Resend Invite"
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {/* Check if row belongs to the current logged-in user */}
                      {member.user?._id !== currentUserId ? (
                        canManageMember(member) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                              onClick={() => onToggleStatus(member)}
                              title={
                                member.inviteStatus === "inactive"
                                  ? "Reactivate Member"
                                  : "Suspend Member"
                              }
                            >
                              {member.inviteStatus === "inactive" ? (
                                <Power className="h-3 w-3" />
                              ) : (
                                <PowerOff className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => onEditMember(member)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 cursor-pointer hover:bg-red-500/10"
                              onClick={() => onDeleteMember(member)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground mr-2">
                            Restricted
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground mr-2 italic">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No members found</h3>
            <p className="text-muted-foreground mt-1">
              {members.length === 0
                ? "No members have been added yet"
                : "Try adjusting your filters"}
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
                    className={
                      currentPage === 1
                        ? "opacity-40 pointer-events-none"
                        : "cursor-pointer"
                    }
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
                      currentPage === totalPages
                        ? "opacity-40 pointer-events-none"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {startItem}–{endItem}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{totalItems}</span> members
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

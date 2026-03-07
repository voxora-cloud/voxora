"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Team, apiService, OrgRole } from "@/lib/api";
import { Plus, User } from "lucide-react";
import MemberForm from "@/components/admin/members/MemberForm";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import FilterableMemberTable from "@/components/admin/members/FilterableMemberTable";
import { useAppToast } from "@/lib/hooks/useAppToast";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";

export interface Member {
  membershipId: string; // The membership ID
  userId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    lastSeen?: string;
  };
  role: OrgRole;
  inviteStatus: "active" | "pending" | "inactive";
  teams: Team[];
  activatedAt?: string;
  organizationId: string;
}

export interface MemberFormData {
  name: string;
  email: string;
  role: OrgRole;
  teamIds: string[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { toastSuccess, toastError } = useAppToast();
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams?.get("invite") === "true") {
      setShowCreateModal(true);

      // Remove query param without triggering a navigation event that unmounts
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) return;

      const [membersResponse, teamsResponse] = await Promise.all([
        apiService.listMembers(activeOrgId),
        apiService.getTeams()
      ]);

      if (membersResponse.success) {
        setMembers(membersResponse.data.members as Member[]);
      } else {
        toastError("Failed to fetch members");
      }

      if (teamsResponse.success) {
        setTeams(teamsResponse.data.teams);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      toastError("An error occurred while loading members");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (data: MemberFormData) => {
    setIsSubmitting(true);
    setModalError(null);
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) throw new Error("No active organization found");

      const response = await apiService.inviteMember(activeOrgId, {
        name: data.name,
        email: data.email,
        role: data.role,
        teamIds: data.teamIds,
      });

      if (response.success) {
        setShowCreateModal(false);
        setModalError(null);
        fetchData();
        toastSuccess("Member invited successfully", `An invitation has been sent to ${data.email}`);
      } else {
        setModalError("Failed to invite member");
      }
    } catch (err: any) {
      console.error("Error inviting member:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred while inviting the member";
      setModalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMemberRole = async (data: MemberFormData) => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) throw new Error("No active organization found");

      const response = await apiService.updateMemberRole(activeOrgId, selectedMember.membershipId, data.role);

      if (response.success) {
        setShowEditModal(false);
        fetchData();
        toastSuccess("Member updated successfully");
      } else {
        toastError("Failed to update member");
      }
    } catch (err: any) {
      console.error("Error updating member:", err);
      toastError(err.message || "An error occurred while updating the member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) throw new Error("No active org found");

      const newStatus = member.inviteStatus === "inactive" ? "active" : "inactive";
      const response = await apiService.updateMemberStatus(activeOrgId, member.membershipId, newStatus);

      if (response.success) {
        toastSuccess(`Member ${newStatus === "active" ? "reactivated" : "suspended"} successfully`);
        fetchData();
      } else {
        toastError(`Failed to ${newStatus === "active" ? "reactivate" : "suspend"} member`);
      }
    } catch (err: any) {
      console.error("Error toggling member status:", err);
      toastError(err.message || "An error occurred while changing member status");
    }
  };

  const handleResendInvite = async (member: Member) => {
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) throw new Error("No active org found");

      const response = await apiService.resendMemberInvite(activeOrgId, member.membershipId);
      if (response.success) {
        toastSuccess("Invitation resent successfully");
      } else {
        toastError("Failed to resend invitation");
      }
    } catch (err: any) {
      console.error("Error resending invite:", err);
      toastError(err.message || "An error occurred while resending the invitation");
    }
  };

  const openDeleteDialog = (member: Member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      const activeOrgId = apiService.getActiveOrgId();
      if (!activeOrgId) throw new Error("No active org found");

      const response = await apiService.removeMember(activeOrgId, memberToDelete.membershipId);
      if (response.success) {
        fetchData();
        setShowDeleteDialog(false);
        setMemberToDelete(null);
        toastSuccess("Member removed successfully");
      } else {
        toastError("Failed to remove member");
      }
    } catch (err: any) {
      console.error("Error removing member:", err);
      toastError(err.message || "An error occurred while removing the member");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organization Members</h1>
        <Button onClick={() => setShowCreateModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        </div>
      ) : members.length > 0 ? (
        <FilterableMemberTable
          members={members}
          teams={teams}
          currentUserId={user?.id || (user as any)?._id}
          onEditMember={(member) => {
            setSelectedMember(member);
            setShowEditModal(true);
          }}
          onDeleteMember={openDeleteDialog}
          onToggleStatus={handleToggleStatus}
          onResendInvite={handleResendInvite}
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            No members found
          </h3>
          <p className="text-muted-foreground mt-1">
            Invite colleagues to start collaborating in your organization.
          </p>
          <Button className="mt-4 cursor-pointer" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      )}

      {/* Invite Member Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setModalError(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="mb-4">
            <DialogTitle asChild>
              <h2 className="text-lg font-semibold">Invite New Member</h2>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fill out the form below to invite a new member to your organization.
            </DialogDescription>
          </div>
          {modalError && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive">
              {modalError}
            </div>
          )}
          <MemberForm
            teams={teams}
            onSubmit={handleInviteMember}
            onCancel={() => {
              setShowCreateModal(false);
              setModalError(null);
            }}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="mb-4">
            <DialogTitle asChild>
              <h2 className="text-lg font-semibold">Edit Member Role</h2>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Use this form to update the role or team assignments for this member.
            </DialogDescription>
          </div>
          <MemberForm
            member={selectedMember}
            teams={teams}
            onSubmit={handleUpdateMemberRole}
            onCancel={() => setShowEditModal(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setMemberToDelete(null);
        }}
        onConfirm={handleDeleteMember}
        title="Remove Member"
        itemName={memberToDelete?.user?.name || memberToDelete?.user?.email}
        isDeleting={isDeleting}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Loader } from "@/shared/ui/loader";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { Plus, User } from "lucide-react";
import { MemberForm } from "../components/member-form";
import { FilterableMemberTable } from "../components/filterable-member-table";
import {
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useUpdateMemberStatus,
  useResendMemberInvite,
  useRemoveMember,
} from "../hooks";
import { useTeams } from "@/domains/teams/hooks";
import { useAuth } from "@/domains/auth/hooks";
import type { Member, MemberFormData } from "../types/types";

export function MembersPage() {
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // React Query hooks
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const inviteMemberMutation = useInviteMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const updateMemberStatusMutation = useUpdateMemberStatus();
  const resendMemberInviteMutation = useResendMemberInvite();
  const removeMemberMutation = useRemoveMember();

  const isLoading = membersLoading || teamsLoading;

  // Check for invite query param
  useEffect(() => {
    if (searchParams.get("invite") === "true") {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setShowInviteModal(true);
        setSearchParams({}, { replace: true });
      }, 0);
    }
  }, [searchParams, setSearchParams]);

  const handleInviteMember = async (data: MemberFormData) => {
    setModalError(null);
    try {
      await inviteMemberMutation.mutateAsync({
        name: data.name,
        email: data.email,
        role: data.role,
        teamIds: data.teamIds,
      });
      setShowInviteModal(false);
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } }; message?: string })
          .response?.data?.message ||
        (error as { message?: string }).message ||
        "Failed to invite member";
      setModalError(errorMessage);
    }
  };

  const handleUpdateMemberRole = async (data: MemberFormData) => {
    if (!selectedMember) return;
    try {
      await updateMemberRoleMutation.mutateAsync({
        memberId: selectedMember.membershipId,
        role: data.role,
      });
      setShowEditModal(false);
    } catch (error) {
      console.error("Update member error:", error);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.inviteStatus === "inactive" ? "active" : "inactive";
    try {
      await updateMemberStatusMutation.mutateAsync({
        memberId: member.membershipId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  const handleResendInvite = (member: Member) => {
    resendMemberInviteMutation.mutate(member.membershipId);
  };

  const openDeleteDialog = (member: Member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await removeMemberMutation.mutateAsync(memberToDelete.membershipId);
      setShowDeleteDialog(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error("Delete member error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Organization Members</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organization Members</h1>
        <Button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="relative z-10 cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {members.length > 0 ? (
        <FilterableMemberTable
          members={members}
          currentUserId={user?.id}
          onEditMember={(member) => {
            setSelectedMember(member);
            setShowEditModal(true);
          }}
          onDeleteMember={openDeleteDialog}
          onToggleStatus={handleToggleStatus}
          onResendInvite={handleResendInvite}
          invitingMemberId={
            inviteMemberMutation.isPending && members[0]?.membershipId.startsWith("temp-")
              ? members[0].membershipId
              : undefined
          }
          updatingMemberId={
            updateMemberRoleMutation.isPending
              ? updateMemberRoleMutation.variables?.memberId
              : undefined
          }
          deletingMemberId={
            removeMemberMutation.isPending ? removeMemberMutation.variables : undefined
          }
          togglingMemberId={
            updateMemberStatusMutation.isPending
              ? updateMemberStatusMutation.variables?.memberId
              : undefined
          }
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No members found</h3>
          <p className="text-muted-foreground mt-1">
            Invite colleagues to start collaborating in your organization.
          </p>
          <Button
            type="button"
            className="mt-4 relative z-10 cursor-pointer"
            onClick={() => setShowInviteModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      )}

      {/* Invite Member Modal */}
      <Dialog
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open);
          if (!open) setModalError(null);
        }}
      >
        <DialogContent className="sm:max-w-125">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Invite New Member</h2>
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
              setShowInviteModal(false);
              setModalError(null);
            }}
            isLoading={inviteMemberMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-125">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Update Member Role</h2>
          </div>
          <MemberForm
            member={selectedMember}
            teams={teams}
            onSubmit={handleUpdateMemberRole}
            onCancel={() => setShowEditModal(false)}
            isLoading={updateMemberRoleMutation.isPending}
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
        isDeleting={removeMemberMutation.isPending}
      />
    </div>
  );
}

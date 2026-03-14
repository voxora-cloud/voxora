import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Plus, Users } from "lucide-react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import type { Team, TeamFormData } from "../types/types";
import { TeamForm } from "../components/team-form";
import { TeamDetailModal } from "../components/team-detail-modal";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { FilterableTeamTable } from "../components/filterable-team-table";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from "../hooks";

export function TeamsPage() {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  // React Query hooks
  const { data: teams = [], isLoading } = useTeams();
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();

  const handleCreateTeam = async (data: TeamFormData) => {
    setShowCreateModal(false);
    try {
      await createTeamMutation.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation hook
      console.error("Create team error:", error);
    }
  };

  const handleUpdateTeam = async (data: TeamFormData) => {
    if (!selectedTeam) return;
    setShowEditModal(false);
    try {
      await updateTeamMutation.mutateAsync({
        teamId: selectedTeam._id,
        data,
      });
    } catch (error) {
      // Error handled by mutation hook
      console.error("Update team error:", error);
    }
  };

  const openDeleteDialog = (team: Team) => {
    setTeamToDelete(team);
    setShowDeleteDialog(true);
  };

  const handleDeleteTeam = async () => {
    setShowDeleteDialog(false);
    if (!teamToDelete) return;
    try {
      await deleteTeamMutation.mutateAsync(teamToDelete._id);
      setTeamToDelete(null);
    } catch (error) {
      // Error handled by mutation hook
      console.error("Delete team error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Teams</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="size-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Team
        </Button>
      </div>

      {teams.length > 0 ? (
        <FilterableTeamTable
          teams={teams}
          onEditTeam={(team) => {
            setSelectedTeam(team);
            setShowEditModal(true);
          }}
          onDeleteTeam={openDeleteDialog}
          onViewDetails={(team) => {
            setSelectedTeam(team);
            setShowDetailModal(true);
          }}
          creatingTeamId={
            createTeamMutation.isPending && teams[0]?._id.startsWith("temp-")
              ? teams[0]._id
              : undefined
          }
          updatingTeamId={
            updateTeamMutation.isPending
              ? updateTeamMutation.variables?.teamId
              : undefined
          }
          deletingTeamId={
            deleteTeamMutation.isPending
              ? deleteTeamMutation.variables
              : undefined
          }
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            No teams created yet
          </h3>
          <p className="text-muted-foreground mt-1">
            Create a new team to organize your agents
          </p>
          <Button
            className="mt-4 cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-125">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create New Team</h2>
          </div>
          <TeamForm
            onSubmit={handleCreateTeam}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-125">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Edit Team</h2>
          </div>
          <TeamForm
            team={selectedTeam}
            onSubmit={handleUpdateTeam}
            onCancel={() => setShowEditModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setTeamToDelete(null);
        }}
        onConfirm={handleDeleteTeam}
        title="Delete Team"
        itemName={teamToDelete?.name}
        isDeleting={deleteTeamMutation.isPending}
      />
    </div>
  );
}

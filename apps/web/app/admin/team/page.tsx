"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Team } from "@/lib/api";
import { Plus, Users, X } from "lucide-react";
import TeamForm from "@/components/admin/team/Form";
import TeamDetailModal from "@/components/admin/team/TeamDetailModal";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import FilterableTeamTable from "@/components/admin/FilterableTeamTable";
import { apiService } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TeamFormData } from "@/lib/interfaces/admin";

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTeams();
      if (response.success) {
        console.log("Fetched teams:", response.data.teams);
        setTeams(response.data.teams);
      } else {
        setError("Failed to fetch teams");
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError("An error occurred while loading teams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (data: TeamFormData) => {
    setIsSubmitting(true);
    try {
      const response = await apiService.createTeam(data);
      if (response.success) {
        setShowCreateModal(false);
        fetchTeams();
      } else {
        setError("Failed to create team");
      }
    } catch (err) {
      console.error("Error creating team:", err);
      setError("An error occurred while creating the team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTeam = async (data: TeamFormData) => {
    if (!selectedTeam) return;
    setIsSubmitting(true);
    try {
      const response = await apiService.updateTeam(selectedTeam._id, data);
      if (response.success) {
        setShowEditModal(false);
        fetchTeams();
      } else {
        setError("Failed to update team");
      }
    } catch (err) {
      console.error("Error updating team:", err);
      setError("An error occurred while updating the team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (team: Team) => {
    setTeamToDelete(team);
    setShowDeleteDialog(true);
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiService.deleteTeam(teamToDelete._id);
      if (response.success) {
        fetchTeams();
        setShowDeleteDialog(false);
        setTeamToDelete(null);
      } else {
        setError("Failed to delete team");
      }
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("An error occurred while deleting the team");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Button onClick={() => setShowCreateModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          New Team
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading teams...</p>
          </div>
        </div>
      ) : teams.length > 0 ? (
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
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create New Team</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <TeamForm
            onSubmit={handleCreateTeam}
            onCancel={() => setShowCreateModal(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Edit Team</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <TeamForm
            team={selectedTeam}
            onSubmit={handleUpdateTeam}
            onCancel={() => setShowEditModal(false)}
            isLoading={isSubmitting}
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
        isDeleting={isDeleting}
      />
    </div>
  );
}

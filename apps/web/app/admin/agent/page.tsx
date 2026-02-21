"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Agent, Team } from "@/lib/api";
import { Plus, User } from "lucide-react";
import AgentForm from "@/components/admin/agent/Form";
import AgentDetailModal from "@/components/admin/agent/AgentDetailModal";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import FilterableAgentTable from "@/components/admin/FilterableAgentTable";
import { apiService } from "@/lib/api";
import { AgentFormData } from "@/lib/interfaces/admin";
import { useAppToast } from "@/lib/hooks/useAppToast";

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { toastSuccess, toastError } = useAppToast();

  useEffect(() => {
    fetchAgents();
    fetchTeams();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAgents();
      if (response.success) {
        setAgents(response.data.agents);
      } else {
        toastError("Failed to fetch agents");
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      toastError("An error occurred while loading agents");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await apiService.getTeams();
      if (response.success) {
        setTeams(response.data.teams);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const handleInviteAgent = async (data: AgentFormData) => {
    setIsSubmitting(true);
    setModalError(null);
    try {
      const response = await apiService.inviteAgent({
        name: data.name,
        email: data.email,
        role: "agent",
        teamIds: data.teamIds,
        password: data.password,
      });
      if (response.success) {
        setShowCreateModal(false);
        setModalError(null);
        fetchAgents();
        toastSuccess("Agent invited successfully", `An invitation has been sent to ${data.email}`);
      } else {
        setModalError("Failed to invite agent");
      }
    } catch (err: any) {
      console.error("Error inviting agent:", err);
      const errorMessage = err.response?.data?.message || err.message || "An error occurred while inviting the agent";
      setModalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAgent = async (data: AgentFormData) => {
    if (!selectedAgent) return;
    setIsSubmitting(true);
    try {
      const response = await apiService.updateAgent(selectedAgent._id, {
        name: data.name,
        teamIds: data.teamIds,
      });
      if (response.success) {
        setShowEditModal(false);
        fetchAgents();
        toastSuccess("Agent updated successfully");
      } else {
        toastError("Failed to update agent");
      }
    } catch (err) {
      console.error("Error updating agent:", err);
      toastError("An error occurred while updating the agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiService.deleteAgent(agentToDelete._id);
      if (response.success) {
        fetchAgents();
        setShowDeleteDialog(false);
        setAgentToDelete(null);
        toastSuccess("Agent deleted successfully");
      } else {
        toastError("Failed to delete agent");
      }
    } catch (err) {
      console.error("Error deleting agent:", err);
      toastError("An error occurred while deleting the agent");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendInvite = async (agentId: string) => {
    try {
      const response = await apiService.resendInvite(agentId);
      if (response.success) {
        toastSuccess("Invitation resent successfully");
      } else {
        toastError("Failed to resend invitation");
      }
    } catch (err) {
      console.error("Error resending invite:", err);
      toastError("An error occurred while resending the invitation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      ) : agents.length > 0 ? (
        <FilterableAgentTable
          agents={agents}
          teams={teams}
          onEditAgent={(agent) => {
            setSelectedAgent(agent);
            setShowEditModal(true);
          }}
          onDeleteAgent={openDeleteDialog}
          onViewDetails={(agent) => {
            setSelectedAgent(agent);
            setShowDetailModal(true);
          }}
          onResendInvite={handleResendInvite}
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            No agents added yet
          </h3>
          <p className="text-muted-foreground mt-1">
            Invite agents to start managing your support team
          </p>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Agent
          </Button>
        </div>
      )}

      {/* Invite Agent Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setModalError(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Invite New Agent</h2>
          </div>
          {modalError && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive">
              {modalError}
            </div>
          )}
          <AgentForm
            teams={teams}
            onSubmit={handleInviteAgent}
            onCancel={() => {
              setShowCreateModal(false);
              setModalError(null);
            }}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Agent Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Edit Agent</h2>
          </div>
          <AgentForm
            agent={selectedAgent}
            teams={teams}
            onSubmit={handleUpdateAgent}
            onCancel={() => setShowEditModal(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setAgentToDelete(null);
        }}
        onConfirm={handleDeleteAgent}
        title="Delete Agent"
        itemName={agentToDelete?.name || agentToDelete?.email}
        isDeleting={isDeleting}
      />
    </div>
  );
}

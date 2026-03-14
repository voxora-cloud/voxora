import { useState } from "react";
import { User } from "lucide-react";
import { AgentDetailModal } from "../components/agent-detail-modal";
import { FilterableAgentTable } from "../components/filterable-agent-table";
import { useAgents, useResendInvite } from "../hooks";
import { useTeams } from "@/domains/teams/hooks";
import { Loader } from "@/shared/ui/loader";
import type { Agent } from "../types/types";

export function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // React Query hooks
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const resendInviteMutation = useResendInvite();

  const isLoading = agentsLoading || teamsLoading;

  const handleResendInvite = (agentId: string) => {
    resendInviteMutation.mutate(agentId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Agents</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="text-muted-foreground">
          View and manage agent details. To invite new members, go to the{" "}
          <a href="/dashboard/members" className="text-primary hover:underline">
            Members page
          </a>
          .
        </p>
      </div>

      {/* Agent Table or Empty State */}
      {agents.length > 0 ? (
        <FilterableAgentTable
          agents={agents}
          teams={teams}
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
          <h3 className="text-lg font-medium text-foreground">No agents yet</h3>
          <p className="text-muted-foreground mt-1">
            Agents will appear here once they are invited through the Members page and assigned the "Agent" role.
          </p>
        </div>
      )}

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Team } from "@/lib/api";
import { Edit, Plus, Search, Trash2, Users, X } from "lucide-react";
import TeamForm from "@/components/admin/team/Form";
import { apiService } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TeamFormData } from "@/lib/interfaces/admin";
import { Input } from "@/components/ui/input";

function TeamDetailModal({
  team,
  isOpen,
  onClose,
}: {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Team Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Team Header */}
          <div className="flex items-center space-x-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: team.color || "#10b981" }}
            >
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{team.name}</h3>
              <p className="text-gray-600">
                {team.description || "No description provided"}
              </p>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className=" p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold">{team.agentCount || 0}</p>
            </div>
            <div className=" p-4 rounded-lg">
              <p className="text-sm text-gray-600">Online Agents</p>
              <p className="text-2xl font-bold text-green-600">
                {team.onlineAgents || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg">
              <p className="text-sm text-gray-600">Team Color</p>
              <div className="flex items-center space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: team.color || "#3b82f6" }}
                ></div>
                <span className="text-sm">{team.color || "#3b82f6"}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg">
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-sm font-medium">
                {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [agentCountFilter, setAgentCountFilter] = useState<string>("all"); // "all", "with-agents", "no-agents"

  useEffect(() => {
    fetchTeams();
  }, []);

  // Apply filters and search to teams
  useEffect(() => {
    if (!teams.length) {
      setFilteredTeams([]);
      return;
    }

    let result = [...teams];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          (team.description && team.description.toLowerCase().includes(query))
      );
    }

    // Apply agent count filter
    if (agentCountFilter === "with-agents") {
      result = result.filter((team) => (team.agentCount || 0) > 0);
    } else if (agentCountFilter === "no-agents") {
      result = result.filter(
        (team) => !team.agentCount || team.agentCount === 0
      );
    }

    setFilteredTeams(result);
  }, [teams, searchQuery, agentCountFilter]);

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

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const response = await apiService.deleteTeam(teamId);
      if (response.success) {
        fetchTeams();
      } else {
        setError("Failed to delete team");
      }
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("An error occurred while deleting the team");
    }
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  const openDetailModal = (team: Team) => {
    setSelectedTeam(team);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Team
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams by name or description..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={agentCountFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setAgentCountFilter("all")}
          >
            All
          </Button>
          <Button
            variant={agentCountFilter === "with-agents" ? "default" : "outline"}
            size="sm"
            onClick={() => setAgentCountFilter("with-agents")}
          >
            With Agents
          </Button>
          <Button
            variant={agentCountFilter === "no-agents" ? "default" : "outline"}
            size="sm"
            onClick={() => setAgentCountFilter("no-agents")}
          >
            No Agents
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse h-32"></div>
              </Card>
            ))
        ) : filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <Card key={team._id} className="overflow-hidden">
              <div
                className="h-2"
                style={{ backgroundColor: team.color || "#3b82f6" }}
              ></div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                      style={{ backgroundColor: team.color || "#3b82f6" }}
                    >
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {team.description || "No description"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="`p-2 rounded">
                    <p className="text-xs text-gray-500">Agents</p>
                    <p className="font-semibold">{team.agentCount || 0}</p>
                  </div>
                  <div className="p-2 rounded">
                    <p className="text-xs text-gray-500">Online</p>
                    <p className="font-semibold text-green-600">
                      {team.onlineAgents || 0}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDetailModal(team)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 px-0"
                    onClick={() => openEditModal(team)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 px-0 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    onClick={() => handleDeleteTeam(team._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-3 p-12 text-center border rounded-lg border-dashed">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-gray-500" />
            </div>

            {teams.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  No teams created yet
                </h3>
                <p className="text-gray-500 mt-1">
                  Create a new team to organize your agents
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  No matching teams found
                </h3>
                <p className="text-gray-500 mt-1">
                  Try changing your search query or filters
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setAgentCountFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}

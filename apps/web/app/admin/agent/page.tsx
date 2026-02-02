"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Agent, Team } from "@/lib/api";
import { Edit, Mail, Plus, Search, Trash2, User, X } from "lucide-react";
import AgentForm from "@/components/admin/agent/Form";
import { apiService } from "@/lib/api";
import { AgentFormData } from "@/lib/interfaces/admin";
import { Input } from "@/components/ui/input";

function getContrastColor(hex: string | undefined | null): string {
  if (!hex) return "#ffffff";

  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (c.length !== 6) return "#ffffff";

  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? "#000000" : "#ffffff";
}

function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "Never";
  
  // Handle different date formats
  let date: Date;
  
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    // Try parsing the string - handle ISO strings, timestamps, etc.
    date = new Date(dateValue);
    
    // If that fails, try parsing as a number (timestamp)
    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateValue, 10);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }
  } else {
    date = new Date(dateValue);
  }
  
  // Final validation
  if (isNaN(date.getTime())) {
    return "Never";
  }
  
  return date.toLocaleString();
}

function AgentDetailModal({
  agent,
  isOpen,
  onClose,
}: {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Agent Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
              {agent.name?.charAt(0) || agent.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {agent.name || agent.email}
              </h3>
              <p className="text-gray-600">{agent.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agent.role === "admin"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {agent.role}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agent.status === "online"
                      ? "bg-green-100 text-green-800"
                      : "text-gray-800"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Account Status
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agent.inviteStatus === "active"
                      ? "bg-green-100 text-green-800"
                      : agent.inviteStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {agent.inviteStatus}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Last Active</h4>
                <p className="text-sm text-gray-600">
                  {formatDate(agent.lastSeen)}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Member Since</h4>
                <p className="text-sm text-gray-600">
                  {formatDate(agent.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Teams ({agent.teams?.length || 0})
              </h4>
              <div className="space-y-2">
                {agent.teams && agent.teams.length > 0 ? (
                  agent.teams.map((team) => (
                    <div
                      key={team._id}
                      className="flex items-center space-x-2 p-2  rounded"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: team.color || "#3b82f6" }}
                      ></div>
                      <span className="text-sm">{team.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Not assigned to any teams
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "online", "offline", "busy"
  const [teamFilter, setTeamFilter] = useState<string>("all");

  useEffect(() => {
    fetchAgents();
    fetchTeams();
  }, []);

  // Apply filters to agents
  useEffect(() => {
    if (!agents.length) {
      setFilteredAgents([]);
      return;
    }

    let result = [...agents];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((agent) => agent.status === statusFilter);
    }

    // Apply team filter
    if (teamFilter !== "all") {
      result = result.filter(
        (agent) =>
          agent.teams && agent.teams.some((team) => team._id === teamFilter)
      );
    }

    setFilteredAgents(result);
  }, [agents, searchQuery, statusFilter, teamFilter]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAgents();
      if (response.success) {
        setAgents(response.data.agents);
      } else {
        setError("Failed to fetch agents");
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError("An error occurred while loading agents");
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
        fetchAgents();
      } else {
        setError("Failed to invite agent");
      }
    } catch (err) {
      console.error("Error inviting agent:", err);
      setError("An error occurred while inviting the agent");
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
      } else {
        setError("Failed to update agent");
      }
    } catch (err) {
      console.error("Error updating agent:", err);
      setError("An error occurred while updating the agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const response = await apiService.deleteAgent(agentId);
      if (response.success) {
        fetchAgents();
      } else {
        setError("Failed to delete agent");
      }
    } catch (err) {
      console.error("Error deleting agent:", err);
      setError("An error occurred while deleting the agent");
    }
  };

  const handleResendInvite = async (agentId: string) => {
    try {
      const response = await apiService.resendInvite(agentId);
      if (response.success) {
        alert("Invitation resent successfully!");
      } else {
        setError("Failed to resend invitation");
      }
    } catch (err) {
      console.error("Error resending invite:", err);
      setError("An error occurred while resending the invitation");
    }
  };

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const openDetailModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetailModal(true);
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

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search agents by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Status:</span>
            <div className="flex gap-1">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "online" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("online")}
                className="text-green-600 border-green-200"
              >
                Online
              </Button>
              <Button
                variant={statusFilter === "busy" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("busy")}
                className="text-amber-600 border-amber-200"
              >
                Busy
              </Button>
              <Button
                variant={statusFilter === "offline" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("offline")}
                className="text-gray-600 border-gray-200"
              >
                Offline
              </Button>
            </div>
          </div>

          {/* Team Filter */}
          {teams.length > 0 && (
            <div className="flex items-center ml-2">
              <span className="text-sm font-medium mr-2">Team:</span>
              <div className="flex gap-1">
                <Button
                  variant={teamFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTeamFilter("all")}
                >
                  All Teams
                </Button>
                {teams.map((team) => (
                  <Button
                    key={team._id}
                    variant={teamFilter === team._id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTeamFilter(team._id)}
                    className="flex items-center gap-1"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: team.color || "#3b82f6" }}
                    ></div>
                    {team.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        </div>
      ) : filteredAgents.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Teams</th>
                  <th className="px-4 py-3 font-medium">Last Active</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent._id}
                    className="border-t border-gray-200 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {agent.name?.charAt(0) ||
                            agent.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {agent.name || "No name"}
                          </p>
                          <p className="text-xs text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          agent.inviteStatus === "active"
                            ? "bg-green-100 text-green-800"
                            : agent.inviteStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {agent.inviteStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        {agent.teams && agent.teams.length > 0 ? (
                          <>
                            {agent.teams.slice(0, 3).map((team) => {
                              const bg = team.color || "#3b82f6";
                              const textColor = getContrastColor(bg);

                              return (
                                <div key={team._id} className="relative group">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full cursor-pointer border border-gray-300"
                                    style={{ backgroundColor: bg }}
                                  ></div>

                                  <div
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                             text-xs px-2 py-1 rounded-md shadow-lg
                             transition-all duration-200 whitespace-nowrap z-10"
                                    style={{
                                      backgroundColor: bg,
                                      color: textColor,
                                    }}
                                  >
                                    {team.name}

                                    <div
                                      className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45"
                                      style={{ backgroundColor: bg }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}

                            {agent.teams.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{agent.teams.length - 3} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No teams
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {formatDate(agent.lastSeen)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end space-x-2">
                        {agent.inviteStatus === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-yellow-600 hover:text-yellow-700"
                            onClick={() => handleResendInvite(agent._id)}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(agent)}
                        >
                          <User className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(agent)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteAgent(agent._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-gray-500" />
          </div>

          {agents.length === 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">
                No agents added yet
              </h3>
              <p className="text-gray-500 mt-1">
                Invite agents to start managing your support team
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Agent
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900">
                No matching agents found
              </h3>
              <p className="text-gray-500 mt-1">
                Try changing your search criteria or filters
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTeamFilter("all");
                }}
              >
                Clear All Filters
              </Button>
            </>
          )}
        </div>
      )}

      {/* Invite Agent Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Invite New Agent</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AgentForm
            teams={teams}
            onSubmit={handleInviteAgent}
            onCancel={() => setShowCreateModal(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Agent Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Edit Agent</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
    </div>
  );
}

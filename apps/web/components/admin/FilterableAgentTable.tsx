"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Agent, Team } from "@/lib/api";
import { Edit, Mail, Search, Trash2, User, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterableAgentTableProps {
  agents: Agent[];
  teams: Team[];
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onViewDetails: (agent: Agent) => void;
  onResendInvite: (agentId: string) => void;
}

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

export default function FilterableAgentTable({
  agents,
  teams,
  onEditAgent,
  onDeleteAgent,
  onViewDetails,
  onResendInvite,
}: FilterableAgentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  // Apply filters
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      if (
        !agent.name.toLowerCase().includes(query) &&
        !agent.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && agent.inviteStatus !== statusFilter) {
      return false;
    }

    // Team filter
    if (teamFilter !== "all") {
      if (!agent.teams || !agent.teams.some((team) => team._id === teamFilter)) {
        return false;
      }
    }

    return true;
  });

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
                      className="pl-7 h-8 text-xs"
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
                    <SelectTrigger className="w-full h-8 text-xs">
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

              {/* Teams Column with Filter */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Teams</div>
                  <Select
                    value={teamFilter}
                    onValueChange={(value) => setTeamFilter(value)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
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
                  {(searchQuery || statusFilter !== "all" || teamFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setTeamFilter("all");
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
            {filteredAgents.map((agent) => (
              <tr
                key={agent._id}
                className="border-t border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {agent.name?.charAt(0) ||
                        agent.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {agent.name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent.email}
                      </p>
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
                                className="w-2.5 h-2.5 rounded-full cursor-pointer border border-border"
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
                          <span className="text-xs text-muted-foreground">
                            +{agent.teams.length - 3}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No teams
                      </span>
                    )}
                  </div>
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
                        className="text-yellow-600 hover:text-yellow-700"
                        onClick={() => onResendInvite(agent._id)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(agent)}
                    >
                      <User className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditAgent(agent)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDeleteAgent(agent)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAgents.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No agents found
            </h3>
            <p className="text-muted-foreground mt-1">
              {agents.length === 0
                ? "No agents have been added yet"
                : "Try adjusting your filters"}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

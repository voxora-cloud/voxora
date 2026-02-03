"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Team } from "@/lib/api";
import { Edit, Search, Trash2, Users, X } from "lucide-react";

interface FilterableTeamTableProps {
  teams: Team[];
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onViewDetails: (team: Team) => void;
}

export default function FilterableTeamTable({
  teams,
  onEditTeam,
  onDeleteTeam,
  onViewDetails,
}: FilterableTeamTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [agentCountFilter, setAgentCountFilter] = useState("all");

  // Apply filters
  const filteredTeams = teams.filter((team) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      if (
        !team.name.toLowerCase().includes(query) &&
        !(team.description && team.description.toLowerCase().includes(query))
      ) {
        return false;
      }
    }

    // Agent count filter
    if (agentCountFilter === "with-agents" && (!team.agentCount || team.agentCount === 0)) {
      return false;
    }
    if (agentCountFilter === "no-agents" && team.agentCount && team.agentCount > 0) {
      return false;
    }

    return true;
  });

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {/* Team Column with Search */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Team</div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search teams..."
                      className="pl-7 h-8 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </th>

              {/* Description Column */}
              <th className="px-4 py-3 text-left">
                <div className="font-medium text-foreground">Description</div>
              </th>

              {/* Total Agents Column with Filter */}
              <th className="px-4 py-3 text-left">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">Total Agents</div>
                  <select
                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
                    value={agentCountFilter}
                    onChange={(e) => setAgentCountFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="with-agents">With Agents</option>
                    <option value="no-agents">No Agents</option>
                  </select>
                </div>
              </th>

              {/* Online Agents Column */}
              <th className="px-4 py-3 text-left">
                <div className="font-medium text-foreground">Online</div>
              </th>

              {/* Created Column */}
              <th className="px-4 py-3 text-left">
                <div className="font-medium text-foreground">Created</div>
              </th>

              {/* Actions Column */}
              <th className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-medium text-foreground">Actions</span>
                  {(searchQuery || agentCountFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setSearchQuery("");
                        setAgentCountFilter("all");
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
            {filteredTeams.map((team) => (
              <tr
                key={team._id}
                className="border-t border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: team.color || "#10b981" }}
                    >
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{team.name}</p>
                      <div
                        className="w-4 h-4 rounded border border-border inline-block mt-1"
                        style={{ backgroundColor: team.color || "#10b981" }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                    {team.description || "No description"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-foreground">
                    {team.agentCount || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-green-600">
                    {team.onlineAgents || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(team.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(team)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTeam(team)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDeleteTeam(team)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTeams.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No teams found
            </h3>
            <p className="text-muted-foreground mt-1">
              {teams.length === 0
                ? "No teams have been created yet"
                : "Try adjusting your filters"}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

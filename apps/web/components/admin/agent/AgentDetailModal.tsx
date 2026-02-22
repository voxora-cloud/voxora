"use client";
import { Button } from "@/components/ui/button";
import { Agent } from "@/lib/api";
import { X } from "lucide-react";

interface AgentDetailModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "Never";

  // Handle different date formats
  let date: Date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === "string") {
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

export default function AgentDetailModal({
  agent,
  isOpen,
  onClose,
}: AgentDetailModalProps) {
  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Agent Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
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
              <h3 className="text-xl font-semibold text-foreground">
                {agent.name || agent.email}
              </h3>
              <p className="text-muted-foreground">{agent.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agent.role === "admin"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {agent.role}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agent.status === "online"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
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
                <h4 className="font-medium text-foreground mb-2">
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
                <h4 className="font-medium text-foreground mb-2">Last Active</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(agent.lastSeen)}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Member Since</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(agent.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-2">
                Teams ({agent.teams?.length || 0})
              </h4>
              <div className="space-y-2">
                {agent.teams && agent.teams.length > 0 ? (
                  agent.teams.map((team) => (
                    <div
                      key={team._id}
                      className="flex items-center space-x-2 p-2 rounded"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: team.color || "#3b82f6" }}
                      ></div>
                      <span className="text-sm text-foreground">{team.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
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

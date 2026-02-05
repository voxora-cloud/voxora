"use client";
import { Button } from "@/components/ui/button";
import { Team } from "@/lib/api";
import { Users, X } from "lucide-react";

interface TeamDetailModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamDetailModal({
  team,
  isOpen,
  onClose,
}: TeamDetailModalProps) {
  if (!isOpen || !team) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-card rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
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
              <h3 className="text-xl font-semibold text-foreground">{team.name}</h3>
              <p className="text-muted-foreground">
                {team.description || "No description provided"}
              </p>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Agents</p>
              <p className="text-2xl font-bold text-foreground">{team.agentCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Online Agents</p>
              <p className="text-2xl font-bold text-green-600">
                {team.onlineAgents || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Team Color</p>
              <div className="flex items-center space-x-2 mt-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: team.color || "#3b82f6" }}
                ></div>
                <span className="text-sm text-foreground">{team.color || "#3b82f6"}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

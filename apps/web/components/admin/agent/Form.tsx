import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Agent, Team } from "@/lib/api";
import { AgentFormData } from "@/lib/interfaces/admin";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Agent Form Component
function AgentForm({
  agent = null,
  teams,
  onSubmit,
  onCancel,
  isLoading = false,
}: {
  agent?: Agent | null;
  teams: Team[];
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: agent?.name || "",
    email: agent?.email || "",
    role: "agent", // Always agent based on interface definition
    teamIds: agent?.teams?.map((t) => t._id) || [],
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [teamError, setTeamError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one team is selected
    if (formData.teamIds.length === 0) {
      setTeamError("Please select at least one team");
      return;
    }
    
    setTeamError("");
    onSubmit(formData);
  };

  const toggleTeam = (teamId: string) => {
    setFormData((prev: AgentFormData) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id: string) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Agent Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter agent name"
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter agent email"
          required
          disabled={!!agent} // Disable email editing for existing agents
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="Enter agent password"
            required={!agent} // Require password for new agents
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div>
        <Label>Teams *</Label>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">
            Please create a team first before inviting agents
          </p>
        ) : (
          <div className="space-y-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
            {teams.map((team) => (
              <label
                key={team._id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={formData.teamIds.includes(team._id)}
                  onChange={() => {
                    toggleTeam(team._id);
                    setTeamError("");
                  }}
                  className="rounded cursor-pointer"
                />
                <span className="text-sm">{team.name}</span>
              </label>
            ))}
          </div>
        )}
        {teamError && (
          <div className="flex items-center gap-2 p-3 mt-2 bg-destructive/10 border border-destructive rounded-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-destructive flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-destructive font-medium">{teamError}</p>
          </div>
        )}
        {formData.teamIds.length === 0 && !teamError && (
          <p className="text-xs text-muted-foreground mt-1">
            Select at least one team
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1 cursor-pointer" 
          disabled={isLoading || formData.teamIds.length === 0 || teams.length === 0}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white mr-2"></div>
              {agent ? "Updating..." : "Inviting..."}
            </>
          ) : agent ? (
            "Update Agent"
          ) : (
            "Invite Agent"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 cursor-pointer"
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default AgentForm;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team, OrgRole, apiService } from "@/lib/api";
import { Member, MemberFormData } from "@/app/admin/members/page";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { validateName, validateEmail, validatePassword } from "@/lib/validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MemberForm({
  member = null,
  teams,
  onSubmit,
  onCancel,
  isLoading = false,
}: {
  member?: Member | null;
  teams: Team[];
  onSubmit: (data: MemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState<MemberFormData>({
    name: member?.user?.name || "",
    email: member?.user?.email || "",
    role: member?.role || "agent",
    teamIds: member?.teams?.map((t) => t._id) || [],
  });

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    teams?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string; teams?: string } = {};

    // Validate name (only if modifying fields vs just role)
    if (!member) {
      const nameError = validateName(formData.name);
      if (nameError) {
        errors.name = nameError;
      }

      const emailError = validateEmail(formData.email);
      if (emailError) {
        errors.email = emailError;
      }
    }

    if (formData.role === "agent" && formData.teamIds.length === 0) {
      errors.teams = "Agents must be assigned to at least one team.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(formData);
  };

  const toggleTeam = (teamId: string) => {
    setFormData((prev: MemberFormData) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id: string) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* If entirely new member, allow Name/Email inputs */}
      {!member && (
        <>
          <div>
            <Label htmlFor="name">Member Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (validationErrors.name) {
                  setValidationErrors({ ...validationErrors, name: undefined });
                }
              }}
              placeholder="Enter member name"
              required
              className={validationErrors.name ? "border-red-500" : ""}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined });
                }
              }}
              placeholder="Enter member email"
              required
              className={validationErrors.email ? "border-red-500" : ""}
            />
            {validationErrors.email && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
            )}
          </div>
        </>
      )}

      {/* Role Selection (Available for both Create and Edit) */}
      <div>
        <Label htmlFor="role">Organization Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as OrgRole })}
        >
          <SelectTrigger className="w-full mt-1">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {apiService.getOrgRole() === "owner" && (
              <SelectItem value="owner">Owner (Full Access)</SelectItem>
            )}
            <SelectItem value="admin">Admin (Manage Teams & Settings)</SelectItem>
            <SelectItem value="agent">Agent (Inbox & Chat)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams Selection (Only if role is agent or we allow generic assignment )*/}
      {formData.role === "agent" && (
        <div>
          <Label>Teams</Label>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              Please create a team first before assigning an agent.
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
                    }}
                    className="rounded cursor-pointer"
                  />
                  <span className="text-sm">{team.name}</span>
                </label>
              ))}
            </div>
          )}
          {validationErrors.teams && (
            <p className="text-sm font-medium text-red-500 mt-2">{validationErrors.teams}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white mr-2"></div>
              {member ? "Updating..." : "Inviting..."}
            </>
          ) : member ? (
            "Update Role"
          ) : (
            "Invite Member"
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

export default MemberForm;

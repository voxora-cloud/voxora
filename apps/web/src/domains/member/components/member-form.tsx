import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { validateName, validateEmail } from "@/shared/lib/validation";
import type { Member, MemberFormData, OrgRole } from "../types/types";
import type { Team } from "@/domains/teams/types/types";
import { authApi } from "@/domains/auth/api/auth.api";

interface MemberFormProps {
  member?: Member | null;
  teams: Team[];
  onSubmit: (data: MemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MemberForm({
  member = null,
  teams,
  onSubmit,
  onCancel,
  isLoading = false,
}: MemberFormProps) {
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

  const currentUserRole = authApi.getOrgRole() || "agent";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string; teams?: string } = {};

    // Validate name and email only for new members
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

    // Agents must be assigned to at least one team
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
    setFormData((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));

    // Clear team validation error when user selects a team
    if (validationErrors.teams) {
      setValidationErrors({ ...validationErrors, teams: undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name and Email - Only for new members */}
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
              className={`mt-1 cursor-text ${validationErrors.name ? "border-destructive" : ""}`}
            />
            {validationErrors.name && (
              <p className="text-xs text-destructive mt-1">{validationErrors.name}</p>
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
              className={`mt-1 cursor-text ${validationErrors.email ? "border-destructive" : ""}`}
            />
            {validationErrors.email && (
              <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
            )}
          </div>
        </>
      )}

      {/* Role Selection */}
      <div>
        <Label htmlFor="role">Organization Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => {
            setFormData({ ...formData, role: value as OrgRole });
            // Clear team error when switching from agent to another role
            if (value !== "agent" && validationErrors.teams) {
              setValidationErrors({ ...validationErrors, teams: undefined });
            }
          }}
        >
          <SelectTrigger className="w-full mt-1 cursor-pointer">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {currentUserRole === "owner" && (
              <SelectItem value="owner" className="cursor-pointer">
                Owner (Full Access)
              </SelectItem>
            )}
            <SelectItem value="admin" className="cursor-pointer">
              Admin (Manage Teams & Settings)
            </SelectItem>
            <SelectItem value="agent" className="cursor-pointer">
              Agent (Inbox & Chat)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams Selection - Only for agents */}
      {formData.role === "agent" && teams.length > 0 && (
        <div>
          <Label>Teams {formData.role === "agent" && "(Required)"}</Label>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {teams.map((team) => (
              <label
                key={team._id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.teamIds.includes(team._id)}
                  onChange={() => toggleTeam(team._id)}
                  className="cursor-pointer"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.color || "#10b981" }}
                  />
                  <span className="text-sm text-foreground">{team.name}</span>
                </div>
              </label>
            ))}
          </div>
          {validationErrors.teams && (
            <div className="flex items-center gap-2 p-3 mt-2 bg-destructive/10 border border-destructive rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-destructive shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-destructive font-medium">
                {validationErrors.teams}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="cursor-pointer">
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {member ? "Updating..." : "Inviting..."}
            </>
          ) : member ? (
            "Update Member"
          ) : (
            "Invite Member"
          )}
        </Button>
      </div>
    </form>
  );
}

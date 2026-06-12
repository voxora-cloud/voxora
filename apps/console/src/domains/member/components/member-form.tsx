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
import { authApi } from "@/domains/auth/api/auth.api";

interface MemberFormProps {
  member?: Member | null;
  onSubmit: (data: MemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MemberForm({
  member = null,
  onSubmit,
  onCancel,
  isLoading = false,
}: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    name: member?.user?.name || "",
    email: member?.user?.email || "",
    role: member?.role || "agent",
  });

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
  }>({});

  const currentUserRole = authApi.getOrgRole() || "agent";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string } = {};

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



    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(formData);
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
              Admin (Manage Settings)
            </SelectItem>
            <SelectItem value="agent" className="cursor-pointer">
              Agent (Inbox & Chat)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>



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

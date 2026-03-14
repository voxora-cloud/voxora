import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useState } from "react";
import type { Team, TeamFormData } from "../types/types";
import { validateTeamColor, validateTeamDescription, validateTeamName } from "@/shared/lib/validation";

interface TeamFormProps {
  team?: Team | null;
  onSubmit: (data: TeamFormData) => void;
  onCancel: () => void;
}

export function TeamForm({
  team = null,
  onSubmit,
  onCancel,
}: TeamFormProps) {
  const [teamCreatingError, setTeamCreatingError] = useState({
    errorField: "",
    errorMessage: "",
  });
  const [formData, setFormData] = useState<TeamFormData>({
    name: team?.name || "",
    description: team?.description || "",
    color: team?.color || "#3b82f6",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Name
    const nameError = validateTeamName(formData.name.trim());
    if (nameError) {
      setTeamCreatingError({ errorField: "name", errorMessage: nameError });
      return;
    }

    // Validate Description
    const descriptionError = validateTeamDescription(
      formData.description.trim()
    );
    if (descriptionError) {
      setTeamCreatingError({
        errorField: "description",
        errorMessage: descriptionError,
      });
      return;
    }

    // Validate Color
    const colorError = validateTeamColor(formData?.color.trim());
    if (colorError) {
      setTeamCreatingError({ errorField: "color", errorMessage: colorError });
      return;
    }

    const submittedData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color.trim(),
    };

    onSubmit(submittedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Team Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          onClick={() =>
            setTeamCreatingError({ errorField: "", errorMessage: "" })
          }
          placeholder="Enter team name"
          disabled={!!team}
          className="cursor-text"
        />
        {teamCreatingError?.errorField === "name" && (
          <p className="p-2 text-sm text-red-500">
            {teamCreatingError?.errorMessage}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          onClick={() =>
            setTeamCreatingError({ errorField: "", errorMessage: "" })
          }
          placeholder="Enter team description"
          rows={3}
          className="cursor-text"
        />
        {teamCreatingError?.errorField === "description" && (
          <p className="p-2 text-sm text-red-500">
            {teamCreatingError?.errorMessage}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="color">Team Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) =>
              setFormData({ ...formData, color: e.target.value })
            }
            className="w-16 h-10 cursor-pointer"
          />
          <Input
            value={formData.color}
            onChange={(e) =>
              setFormData({ ...formData, color: e.target.value })
            }
            placeholder="#3b82f6"
            className="flex-1 cursor-text"
          />
        </div>
        {teamCreatingError?.errorField === "color" && (
          <p className="p-2 text-sm text-red-500">
            {teamCreatingError?.errorMessage}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 cursor-pointer">
         {team ? (
            "Update Team"
          ) : (
            "Create Team"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

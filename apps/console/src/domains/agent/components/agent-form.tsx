import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { validateName, validateEmail, validatePassword } from "@/shared/lib/validation";
import type { Agent, AgentFormData } from "../types/types";

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AgentForm({
  agent = null,
  onSubmit,
  onCancel,
  isLoading = false,
}: AgentFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: agent?.user?.name || "",
    email: agent?.user?.email || "",
    role: "agent",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string; password?: string } = {};

    // Validate name
    const nameError = validateName(formData.name);
    if (nameError) {
      errors.name = nameError;
    }

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) {
      errors.email = emailError;
    }

    // Validate password (required for new agents, optional but must be valid if provided for updates)
    if (!agent && !formData.password) {
      errors.password = "Password is required for new agents";
    } else if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }



    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(formData);
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Agent Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (validationErrors.name) {
              setValidationErrors({ ...validationErrors, name: undefined });
            }
          }}
          placeholder="Enter agent name"
          required
          className={`cursor-text ${validationErrors.name ? "border-red-500" : ""}`}
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
          placeholder="Enter agent email"
          required
          disabled={!!agent?.user?.email}
          className={`cursor-text ${validationErrors.email ? "border-red-500" : ""}`}
        />
        {validationErrors.email && (
          <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">
          Password{" "}
          {agent && (
            <span className="text-xs text-muted-foreground">
              (leave empty to keep current)
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (validationErrors.password) {
                setValidationErrors({ ...validationErrors, password: undefined });
              }
            }}
            placeholder={
              agent ? "Leave empty to keep current password" : "Enter agent password"
            }
            required={!agent}
            className={`pr-10 cursor-text ${validationErrors.password ? "border-red-500" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {validationErrors.password && (
          <p className="text-xs text-red-500 mt-1">{validationErrors.password}</p>
        )}
        {!agent && (
          <p className="text-xs text-muted-foreground mt-1">
            Must be at least 8 characters with uppercase, lowercase, number, and special
            character
          </p>
        )}
      </div>



      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1 cursor-pointer"
          disabled={isLoading}
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

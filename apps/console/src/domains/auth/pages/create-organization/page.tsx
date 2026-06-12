import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2 } from "lucide-react";
import { authApi } from "@/domains/auth/api/auth.api";
import { useAuthStore } from "@/domains/auth/store/auth.store";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const setOrganization = useAuthStore((state) => state.setOrganization);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Organization name is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await authApi.createOrganization(trimmedName);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create organization");
      }

      authApi.setToken(response.data.accessToken);
      authApi.setActiveOrgId(response.data.organization._id);
      authApi.setOrgRole(response.data.role);
      setOrganization(response.data.organization);

      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create organization",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-xl mx-auto">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="inline-flex items-center justify-center size-10 rounded-lg bg-primary/10 border border-primary/20 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Create Organization</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your organization name to create a new workspace.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  placeholder="Acme Support"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="cursor-text"
                  maxLength={80}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                  {isSubmitting ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { settingsApi } from "@/domains/settings/api/settings.api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader } from "@/shared/ui/loader";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/domains/auth/hooks";
import type { Organization } from "@/shared/types/types";

export function GeneralSettingsPage() {
  const { organization: currentOrg, setOrganization } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    async function loadOrg() {
      if (!currentOrg?._id) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await settingsApi.getOrganization(currentOrg._id);
        if (response.success) {
          setOrg(response.data.organization);
          setName(response.data.organization.name);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load organization";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrg();
  }, [currentOrg?._id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?._id) return;

    setIsSaving(true);
    try {
      const response = await settingsApi.updateOrganization(org._id, { name });
      if (response.success) {
        toast.success("Organization updated successfully");
        setOrg(response.data.organization);
        if (currentOrg?._id === response.data.organization._id) {
          setOrganization(response.data.organization);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update organization";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization&apos;s basic information and identifier.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm"
      >
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Name
            </Label>
            <Input
              id="name"
              placeholder="Your Organization Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-md cursor-text"
              required
            />
            <p className="text-xs text-muted-foreground">
              This is your organization&apos;s visible name across the platform.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button type="submit" disabled={isSaving} className="cursor-pointer">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader } from "@/shared/ui/loader";
import { Building2 } from "lucide-react";
import { useAuth } from "@/domains/auth/hooks";
import { useOrganization, useUpdateOrganization } from "@/domains/settings/hooks";
import type { UpdateOrganizationPayload } from "@/domains/settings/api/settings.api";

export function GeneralSettingsPage() {
  const { organization: currentOrg } = useAuth();
  const { data: org, isLoading } = useOrganization(currentOrg?._id);
  const updateOrgMutation = useUpdateOrganization();

  const [name, setName] = useState("");

  const [initialized, setInitialized] = useState(false);

  // Initialize form fields once org data is available
  if (org && !initialized) {
    setName(org.name);

    setInitialized(true);
  }



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateOrganizationPayload = {
      name,
    };
    await updateOrgMutation.mutateAsync(payload);
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
          Manage your organization&apos;s basic information.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Organization Name Card */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Organization</h2>
              <p className="text-xs text-muted-foreground">Your organization&apos;s visible name across the platform</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
          </div>
        </div>



        <div className="flex justify-end">
          <Button type="submit" disabled={updateOrgMutation.isPending} className="cursor-pointer min-w-[120px]">
            {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

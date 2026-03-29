import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader } from "@/shared/ui/loader";
import { Building2, MailCheck, MailWarning } from "lucide-react";
import { useAuth } from "@/domains/auth/hooks";
import { useOrganization, useUpdateOrganization } from "@/domains/settings/hooks";
import type { UpdateOrganizationPayload } from "@/domains/settings/api/settings.api";

export function GeneralSettingsPage() {
  const { organization: currentOrg } = useAuth();
  const { data: org, isLoading } = useOrganization(currentOrg?._id);
  const updateOrgMutation = useUpdateOrganization();

  const [name, setName] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form fields once org data is available
  if (org && !initialized) {
    setName(org.name);
    setFromName(org.emailSender?.fromName || "");
    setFromEmail(org.emailSender?.fromEmail || "");
    setDomain(org.emailSender?.domain || "");
    setInitialized(true);
  }

  const normalized = (value: string) => value.trim();
  const normalizedLower = (value: string) => normalized(value).toLowerCase();

  const normalizeOptional = (value: string): string | undefined => {
    const trimmed = normalized(value);
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const isEmailSenderVerified = !!org?.emailSender?.verified;
  const isSenderConfigChanged =
    normalized(fromName) !== normalized(org?.emailSender?.fromName || "")
    || normalizedLower(fromEmail) !== normalizedLower(org?.emailSender?.fromEmail || "")
    || normalizedLower(domain) !== normalizedLower(org?.emailSender?.domain || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateOrganizationPayload = {
      name,
      emailSender: {
        fromName: normalizeOptional(fromName),
        fromEmail: normalizeOptional(fromEmail)?.toLowerCase(),
        domain: normalizeOptional(domain)?.toLowerCase(),
        verified: isSenderConfigChanged ? false : isEmailSenderVerified,
      },
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
          Manage your organization&apos;s basic information and outbound email sender.
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

          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MailCheck className="h-4 w-4" />
                  Email Sender Configuration
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Set an optional tenant sender identity. Unverified sender settings always fall back to the platform sender.
                </p>
              </div>
              {isEmailSenderVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Fallback Active</Badge>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fromName" className="text-sm font-semibold">
                From Name
              </Label>
              <Input
                id="fromName"
                placeholder="Acme Support"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="max-w-md cursor-text"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fromEmail" className="text-sm font-semibold">
                From Email
              </Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="support@acme.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="max-w-md cursor-text"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain" className="text-sm font-semibold">
                Domain
              </Label>
              <Input
                id="domain"
                placeholder="acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="max-w-md cursor-text"
              />
              <p className="text-xs text-muted-foreground">
                Domain must match the From Email domain to qualify for verification.
              </p>
            </div>

            {!isEmailSenderVerified && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground flex items-start gap-2">
                <MailWarning className="h-4 w-4 mt-0.5 text-warning" />
                <div>
                  This sender is currently unverified. Voxora will use the default platform sender until verification is completed.
                </div>
              </div>
            )}

            {isSenderConfigChanged && isEmailSenderVerified && (
              <div className="rounded-lg border border-info/40 bg-info/10 p-3 text-sm text-foreground">
                Sender details were modified. Saving changes will set verification status to unverified until re-verified.
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button type="submit" disabled={updateOrgMutation.isPending} className="cursor-pointer">
            {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

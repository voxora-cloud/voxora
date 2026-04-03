import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader } from "@/shared/ui/loader";
import { Building2, CheckCircle2, Globe, Mail, MailCheck, MailWarning, ShieldAlert, User } from "lucide-react";
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

        {/* Email Sender Card */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
          {/* Card header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isEmailSenderVerified ? "bg-success/10" : "bg-warning/10"}`}>
                  {isEmailSenderVerified
                    ? <MailCheck className="h-4 w-4 text-success" />
                    : <MailWarning className="h-4 w-4 text-warning" />
                  }
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Email Sender Configuration</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Custom sender identity for outbound emails. Falls back to platform sender if unverified.
                  </p>
                </div>
              </div>
              {isEmailSenderVerified ? (
                <Badge variant="success" className="flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1 shrink-0">
                  <ShieldAlert className="h-3 w-3" />
                  Fallback Active
                </Badge>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fromName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  From Name
                </Label>
                <Input
                  id="fromName"
                  placeholder="Acme Support"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="cursor-text"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fromEmail" className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  From Email
                </Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="support@acme.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="cursor-text"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="domain" className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Domain
              </Label>
              <Input
                id="domain"
                placeholder="acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="max-w-sm cursor-text"
              />
              <p className="text-xs text-muted-foreground">
                Domain must match the From Email domain to qualify for verification.
              </p>
            </div>

            {/* Status banners */}
            {!isEmailSenderVerified && (fromName || fromEmail || domain) && (
              <div className="rounded-xl border border-warning/30 bg-warning/8 p-4 flex items-start gap-3">
                <MailWarning className="h-4 w-4 mt-0.5 text-warning flex-shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  This sender is currently <span className="font-semibold text-warning">unverified</span>. Voxora will use the default platform sender until verification is completed.
                </p>
              </div>
            )}

            {isSenderConfigChanged && isEmailSenderVerified && (
              <div className="rounded-xl border border-info/30 bg-info/8 p-4 flex items-start gap-3">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-info flex-shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Sender details were modified. Saving will mark this sender as <span className="font-semibold">unverified</span> until re-verified.
                </p>
              </div>
            )}
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

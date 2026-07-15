import { useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Loader2,
  Plus,
  ServerCog,
  Globe,
  Minus,
} from "lucide-react";
import { EmailIcon, TelegramIcon, WhatsAppIcon } from "@/shared/ui/channel-icon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  useEmailChannel,
  useVerifyChannel,
  useDeleteChannel,
  useWhatsAppChannel,
  useTelegramChannel,
  useUpdateEmailChannelAddresses,
} from "../hooks/use-channels";
import type { Channel, DnsRecord } from "../types/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
        <XCircle className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
      <Clock className="h-3.5 w-3.5" />
      Pending DNS
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const [copiedName, setCopiedName] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyName = async () => {
    await navigator.clipboard.writeText(record.name);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  const copyValue = async () => {
    await navigator.clipboard.writeText(record.value);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  const isLong = record.value.length > 50;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 items-center rounded-md bg-primary/10 px-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-primary">
            {record.type} record
          </span>
          {record.priority !== undefined && (
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
              Priority: {record.priority}
            </span>
          )}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer text-xs font-semibold text-primary transition-colors hover:underline"
          >
            {expanded ? "Show Less" : "Show Full"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Name / Host */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Name / Host
          </span>
          <div className="flex min-h-11 items-center gap-2 rounded-md bg-muted/35 px-3 font-mono text-xs ring-1 ring-inset ring-border/70">
            <span className="flex-1 truncate text-foreground" title={record.name}>
              {record.name}
            </span>
            <button
              type="button"
              onClick={copyName}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title="Copy Host/Name"
            >
              {copiedName ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Value / Content */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Value / Content
          </span>
          <div className="flex min-h-11 items-center gap-2 rounded-md bg-muted/35 px-3 font-mono text-xs ring-1 ring-inset ring-border/70">
            <span className={`flex-1 break-all text-foreground ${!expanded && isLong ? "line-clamp-1 truncate" : ""}`}>
              {record.value}
            </span>
            <button
              type="button"
              onClick={copyValue}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title="Copy Value/Content"
            >
              {copiedValue ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageEmailsSection({
  channel,
  onMinimize,
}: {
  channel: Channel;
  onMinimize: () => void;
}) {
  const emailConfig = channel.config.email;
  const domain = emailConfig?.domain || "";
  const addresses = (emailConfig?.addresses || [emailConfig?.address || ""]).filter(Boolean);
  const primaryAddress = emailConfig?.address || "";

  const updateMutation = useUpdateEmailChannelAddresses();
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!email.endsWith(`@${domain}`)) {
      setError(`Email must end with @${domain}`);
      return;
    }

    if (addresses.includes(email)) {
      setError("This email address is already added");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        channelId: channel._id,
        emails: [...addresses, email],
      });
      setNewEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add email address");
    }
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    setError("");
    const updated = addresses.filter((email: string) => email !== emailToDelete);

    try {
      await updateMutation.mutateAsync({
        channelId: channel._id,
        emails: updated,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete email address");
    }
  };

  const handleMakePrimary = async (email: string) => {
    setError("");
    // Move selected email to the front of the list
    const updated = [email, ...addresses.filter((e: string) => e !== email)];

    try {
      await updateMutation.mutateAsync({
        channelId: channel._id,
        emails: updated,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set main email");
    }
  };

  return (
    <div className="-mx-5 -mb-5 mt-2 border-t border-border bg-muted/15 px-5 py-5 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">Email addresses</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {addresses.length}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Create and manage addresses for the verified domain <strong className="font-semibold text-foreground">@{domain}</strong>.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onMinimize}
          className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          title="Minimize email addresses"
          aria-label="Minimize email addresses"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* List of current email addresses */}
      <div className="mt-5 space-y-2">
        {addresses.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-5 text-center">
            <p className="text-sm font-medium text-foreground">No email addresses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first address below to start receiving email.
            </p>
          </div>
        )}
        {addresses.map((email: string) => (
          <div
            key={email}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card px-3.5 py-3 shadow-xs transition-colors hover:border-primary/25 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <EmailIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-foreground" title={email}>
                {email}
              </span>
              {email === primaryAddress ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                  Main
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
              {email !== primaryAddress && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleMakePrimary(email)}
                  disabled={updateMutation.isPending}
                  className="h-7 cursor-pointer px-2 text-[11px]"
                >
                  Set as main
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteEmail(email)}
                disabled={updateMutation.isPending}
                className="flex h-7 w-7 cursor-pointer items-center justify-center p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remove email"
                aria-label={`Remove ${email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new email form */}
      <form onSubmit={handleAddEmail} className="mt-5 rounded-lg border border-dashed border-border bg-card/60 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4 text-primary" />
          {addresses.length === 0 ? "Create an email address" : "Add another address"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Use the same verified domain: @{domain}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <EmailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              type="email"
              placeholder={`billing@${domain}`}
              className="h-10 rounded-lg bg-background pl-10 text-sm shadow-none"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={updateMutation.isPending}
              aria-label="New support email address"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending || !newEmail.trim()}
            className="h-10 shrink-0 cursor-pointer rounded-lg px-4"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Add address"
            )}
          </Button>
        </div>

        {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
        {updateMutation.isError && !error && (
          <p className="mt-2 text-xs font-medium text-destructive">
            {(updateMutation.error as Error)?.message || "Failed to update email addresses"}
          </p>
        )}
      </form>
    </div>
  );
}

function DnsRecordsTable({ records }: { records: DnsRecord[] }) {
  if (!records.length) return null;
  return (
    <div className="-mx-5 -mb-5 mt-2 border-t border-border bg-muted/15 px-5 py-5 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ServerCog className="h-4 w-4" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">DNS configuration</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {records.length} {records.length === 1 ? "record" : "records"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Add these values at your DNS provider. Changes can take up to 48 hours to propagate.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {records.map((rec, i) => (
          <DnsRecordRow key={i} record={rec} />
        ))}
      </div>
    </div>
  );
}

// ── Channel cards ─────────────────────────────────────────────────────────────



// ── Main page ─────────────────────────────────────────────────────────────────

export function ChannelsPage() {
  const navigate = useNavigate();

  const { data: emailChannel, isLoading: emailLoading } = useEmailChannel();
  const { data: whatsappChannel, isLoading: whatsappLoading } = useWhatsAppChannel();
  const { data: telegramChannel, isLoading: telegramLoading } = useTelegramChannel();
  const verifyMutation = useVerifyChannel();
  const deleteMutation = useDeleteChannel();

  const [showDns, setShowDns] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [showWhatsAppInfo, setShowWhatsAppInfo] = useState(false);
  const [deleteWaConfirm, setDeleteWaConfirm] = useState(false);

  const [showTelegramInfo, setShowTelegramInfo] = useState(false);
  const [deleteTgConfirm, setDeleteTgConfirm] = useState(false);

  const handleVerify = () => {
    if (!emailChannel) return;
    verifyMutation.mutate(emailChannel._id);
  };

  const handleDelete = () => {
    if (!emailChannel) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    deleteMutation.mutate(emailChannel._id, {
      onSuccess: () => setDeleteConfirm(false),
    });
  };

  const handleDeleteWhatsApp = () => {
    if (!whatsappChannel) return;
    if (!deleteWaConfirm) {
      setDeleteWaConfirm(true);
      return;
    }
    deleteMutation.mutate(whatsappChannel._id, {
      onSuccess: () => setDeleteWaConfirm(false),
    });
  };

  const handleDeleteTelegram = () => {
    if (!telegramChannel) return;
    if (!deleteTgConfirm) {
      setDeleteTgConfirm(true);
      return;
    }
    deleteMutation.mutate(telegramChannel._id, {
      onSuccess: () => setDeleteTgConfirm(false),
    });
  };



  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";
  const hostBase = apiBase.replace(/\/api\/v1\/?$/, "");
  const connectedCount = [emailChannel, whatsappChannel, telegramChannel].filter(Boolean).length;
  const emailVerificationStatus = emailChannel?.config.email?.verificationStatus ?? "pending";
  const isEmailDomainVerified = emailVerificationStatus === "verified";

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* Header */}
      <div
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        data-tour-id="page-channels-heading"
      >
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Omnichannel inbox
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
              Meet customers where they are
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Connect your business channels and manage every customer conversation from one shared inbox.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-muted/25 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none text-foreground">{connectedCount}/3</p>
              <p className="mt-1 text-xs text-muted-foreground">Channels connected</p>
            </div>
          </div>
        </div>
      </div>



      {/* Email Channel */}
      <section className="space-y-3" data-tour-id="page-channels-email">
        <div className="px-1">
          <h2 className="text-base font-semibold text-foreground">Business email</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Send and receive support email from your own domain.</p>
        </div>

        {emailLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : emailChannel ? (
          /* Existing channel card */
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {/* Top row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background">
                  <EmailIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{emailChannel.name}</p>
                    <VerificationBadge status={emailVerificationStatus} />
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-72 truncate" title={emailChannel.config.email?.domain}>
                      {emailChannel.config.email?.domain}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!isEmailDomainVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerify}
                    disabled={verifyMutation.isPending}
                    className="gap-1.5 cursor-pointer"
                    id="btn-verify-domain"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${verifyMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Verify Now
                  </Button>
                )}
                {isEmailDomainVerified && (
                  <div className="flex items-center rounded-lg bg-muted/45 p-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowDns(false);
                        setShowEmailPanel(true);
                      }}
                      className={`h-8 cursor-pointer gap-1.5 rounded-md px-2.5 text-xs ${
                        !showDns && showEmailPanel
                          ? "bg-card text-foreground shadow-xs hover:bg-card"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      id="btn-manage-emails"
                    >
                      <EmailIcon className="h-3.5 w-3.5" />
                      Email addresses
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowDns(true);
                        setShowEmailPanel(false);
                      }}
                      className={`h-8 cursor-pointer gap-1.5 rounded-md px-2.5 text-xs ${
                        showDns
                          ? "bg-card text-foreground shadow-xs hover:bg-card"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      id="btn-toggle-dns"
                    >
                      <ServerCog className="h-3.5 w-3.5" />
                      DNS setup
                    </Button>
                  </div>
                )}
                {deleteConfirm ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="cursor-pointer"
                    id="btn-confirm-delete-channel"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    id="btn-delete-channel"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Verification warning */}
            {!isEmailDomainVerified && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Verify <strong>{emailChannel.config.email?.domain}</strong> before creating email
                  addresses. Add the DNS records below, then click <strong>Verify Now</strong>.
                </p>
              </div>
            )}

            {/* Verify result toast */}
            {verifyMutation.isSuccess && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Verification status refreshed:{" "}
                <strong>{verifyMutation.data?.data?.status}</strong>
              </p>
            )}

            {/* DNS Records */}
            {(!isEmailDomainVerified || showDns) && (
              <DnsRecordsTable records={emailChannel.config.email?.dnsRecords ?? []} />
            )}

            {/* Email creation unlocks only after domain verification */}
            {isEmailDomainVerified && !showDns && showEmailPanel && (
              <ManageEmailsSection
                channel={emailChannel}
                onMinimize={() => setShowEmailPanel(false)}
              />
            )}
          </div>
        ) : (
          /* Add email channel CTA */
          <button
            type="button"
            onClick={() => navigate("/dashboard/channels/email")}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-6"
            id="btn-add-email-channel"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background">
                <EmailIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Connect business email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use an address like support@yourcompany.com.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                Connect <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
          </button>
        )}
      </section>

      {/* WhatsApp Channel */}
      <section className="space-y-3" data-tour-id="page-channels-whatsapp">
        <div className="px-1">
          <h2 className="text-base font-semibold text-foreground">WhatsApp</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Connect a Twilio sender for real-time customer messaging.</p>
        </div>

        {whatsappLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : whatsappChannel ? (
          /* Existing WhatsApp card */
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {/* Top row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <WhatsAppIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{whatsappChannel.name}</p>
                    <VerificationBadge
                      status={whatsappChannel.config.whatsapp?.verificationStatus ?? "verified"}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {whatsappChannel.config.whatsapp?.phoneNumber}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWhatsAppInfo((p) => !p)}
                  className="gap-1.5 cursor-pointer"
                  id="btn-toggle-whatsapp-info"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Connection Info
                </Button>
                {deleteWaConfirm ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteWhatsApp}
                    disabled={deleteMutation.isPending}
                    className="cursor-pointer"
                    id="btn-confirm-delete-whatsapp"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeleteWhatsApp}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    id="btn-delete-whatsapp"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Connection Information */}
            {showWhatsAppInfo && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs">
                <p className="font-semibold text-sm">Twilio Connection Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground font-medium block">Account SID</span>
                    <span className="font-mono text-foreground/80 break-all">{whatsappChannel.config.whatsapp?.accountSid}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block">Messaging Service SID</span>
                    <span className="font-mono text-foreground/80 break-all">{whatsappChannel.config.whatsapp?.messagingServiceSid || "—"}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-muted-foreground font-medium block">Twilio Webhook URL</span>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/65 font-mono">
                    <span className="flex-1 truncate text-foreground/75">
                      {`${hostBase}/api/v1/channels/whatsapp/inbound/${whatsappChannel._id}`}
                    </span>
                    <CopyButton text={`${hostBase}/api/v1/channels/whatsapp/inbound/${whatsappChannel._id}`} />
                  </div>
                  <span className="text-muted-foreground block">
                    Copy this URL into the Incoming Message Webhook field in your Twilio WhatsApp sender configuration.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Add WhatsApp channel CTA */
          <button
            type="button"
            onClick={() => navigate("/dashboard/channels/whatsapp")}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-md sm:p-6"
            id="btn-add-whatsapp-channel"
          >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <WhatsAppIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Connect WhatsApp</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bring your Twilio WhatsApp sender into the shared inbox.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Connect <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
          </button>
        )}
      </section>

      {/* Telegram Channel */}
      <section className="space-y-3" data-tour-id="page-channels-telegram">
        <div className="px-1">
          <h2 className="text-base font-semibold text-foreground">Telegram</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Turn bot messages into support conversations automatically.</p>
        </div>

        {telegramLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : telegramChannel ? (
          /* Existing Telegram card */
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {/* Top row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/5">
                  <TelegramIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{telegramChannel.name}</p>
                    <VerificationBadge
                      status={telegramChannel.config.telegram?.verificationStatus ?? "verified"}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    @{telegramChannel.config.telegram?.botUsername || "Telegram Bot"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTelegramInfo((p) => !p)}
                  className="gap-1.5 cursor-pointer"
                  id="btn-toggle-telegram-info"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Connection Info
                </Button>
                {deleteTgConfirm ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteTelegram}
                    disabled={deleteMutation.isPending}
                    className="cursor-pointer"
                    id="btn-confirm-delete-telegram"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeleteTelegram}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    id="btn-delete-telegram"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Connection Information */}
            {showTelegramInfo && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs">
                <p className="font-semibold text-sm">Telegram Connection Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground font-medium block">Bot Username</span>
                    <span className="font-mono text-foreground/80 break-all">@{telegramChannel.config.telegram?.botUsername}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block">Bot API Token</span>
                    <span className="font-mono text-foreground/80 break-all">••••••••••••••••••••</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-muted-foreground font-medium block">Webhook Status</span>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/65 font-mono">
                    <span className="flex-1 truncate text-foreground/75">
                      Active: {`${hostBase}/api/v1/channels/telegram/inbound/${telegramChannel._id}`}
                    </span>
                  </div>
                  <span className="text-muted-foreground block">
                    The webhook URL is registered automatically with Telegram.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Add Telegram channel CTA */
          <button
            type="button"
            onClick={() => navigate("/dashboard/channels/telegram")}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-500/35 hover:shadow-md sm:p-6"
            id="btn-add-telegram-channel"
          >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/5">
                <TelegramIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Connect Telegram</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a bot token and we’ll configure the webhook for you.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 dark:text-sky-400">
                Connect <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
          </button>
        )}
      </section>


    </div>
  );
}

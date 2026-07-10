import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  ExternalLink,
  Loader2,
} from "lucide-react";
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
import type { DnsRecord } from "../types/types";

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
      className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
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
    <div className="p-4 space-y-3.5 hover:bg-muted/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs uppercase tracking-wide">
            {record.type}
          </span>
          {record.priority !== undefined && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
              Priority: {record.priority}
            </span>
          )}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-primary hover:underline transition-colors"
          >
            {expanded ? "Show Less" : "Show Full"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name / Host */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Name / Host
          </span>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-[11px]">
            <span className="flex-1 truncate text-foreground/80" title={record.name}>
              {record.name}
            </span>
            <button
              type="button"
              onClick={copyName}
              className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
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
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Value / Content
          </span>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-[11px]">
            <span className={`flex-1 text-foreground/80 break-all ${!expanded && isLong ? "line-clamp-1 truncate" : ""}`}>
              {record.value}
            </span>
            <button
              type="button"
              onClick={copyValue}
              className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
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
  onClose,
}: {
  channel: any;
  onClose: () => void;
}) {
  const emailConfig = channel.config.email;
  const domain = emailConfig?.domain || "";
  const addresses = emailConfig?.addresses || [emailConfig?.address || ""];
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
    } catch (err: any) {
      setError(err?.message || "Failed to add email address");
    }
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    setError("");
    if (addresses.length <= 1) {
      setError("You must keep at least one email address");
      return;
    }

    const updated = addresses.filter((email: string) => email !== emailToDelete);

    try {
      await updateMutation.mutateAsync({
        channelId: channel._id,
        emails: updated,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to delete email address");
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
    } catch (err: any) {
      setError(err?.message || "Failed to set primary email");
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border overflow-hidden bg-card/40 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Manage Support Emails</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add multiple email addresses under your verified domain <strong className="text-foreground">@{domain}</strong>.
          </p>
        </div>
        <Button size="xs" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* List of current email addresses */}
      <div className="space-y-2">
        {addresses.map((email: string) => (
          <div
            key={email}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{email}</span>
              {email === primaryAddress ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                  Primary
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              {email !== primaryAddress && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleMakePrimary(email)}
                  disabled={updateMutation.isPending}
                  className="h-7 text-[11px] px-2"
                >
                  Make Primary
                </Button>
              )}
              {addresses.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteEmail(email)}
                  disabled={updateMutation.isPending}
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center justify-center p-0"
                  title="Delete Email"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new email form */}
      <form onSubmit={handleAddEmail} className="space-y-2 pt-2 border-t border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`support-new@${domain}`}
              className="pl-9 h-9 text-sm"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending || !newEmail.trim()}
            className="h-9"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Add Email"
            )}
          </Button>
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        {updateMutation.isError && !error && (
          <p className="text-xs text-destructive font-medium">
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
    <div className="mt-4 rounded-xl border border-border overflow-hidden bg-card/40">
      <div className="px-4 py-3 bg-muted/40 border-b border-border">
        <p className="text-sm font-semibold text-foreground">DNS Records to Configure</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add these records at your DNS provider. Propagation may take up to 48 hours.
        </p>
      </div>
      <div className="divide-y divide-border">
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
  const [showEmailsSection, setShowEmailsSection] = useState(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div data-tour-id="page-channels-heading">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Channels</h1>
        <p className="text-muted-foreground mt-1">
          Connect your communication channels. Incoming messages create conversations in your inbox.
        </p>
      </div>



      {/* Email Channel */}
      <section className="space-y-3" data-tour-id="page-channels-email">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
          Email
        </h2>

        {emailLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : emailChannel ? (
          /* Existing channel card */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{emailChannel.name}</p>
                    <VerificationBadge
                      status={emailChannel.config.email?.verificationStatus ?? "pending"}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(emailChannel.config.email?.addresses?.length
                      ? emailChannel.config.email.addresses
                      : [emailChannel.config.email?.address || ""]
                    ).map((addr) => (
                      <span
                        key={addr}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${addr === emailChannel.config.email?.address
                            ? "bg-primary/5 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border"
                          }`}
                      >
                        {addr}
                        {addr === emailChannel.config.email?.address && (
                          <span className="ml-1 text-[9px] uppercase tracking-wider opacity-75 font-semibold">
                            (Primary)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {emailChannel.config.email?.verificationStatus !== "verified" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerify}
                    disabled={verifyMutation.isPending}
                    className="gap-1.5"
                    id="btn-verify-domain"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${verifyMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Verify Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowEmailsSection((p) => !p);
                    setShowDns(false);
                  }}
                  className="gap-1.5"
                  id="btn-manage-emails"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Manage Emails
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowDns((p) => !p);
                    setShowEmailsSection(false);
                  }}
                  className="gap-1.5"
                  id="btn-toggle-dns"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  DNS Records
                </Button>
                {deleteConfirm ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    id="btn-confirm-delete-channel"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    id="btn-delete-channel"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Verification warning */}
            {emailChannel.config.email?.verificationStatus === "pending" && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Your domain is not yet verified. Add the DNS records below to your DNS provider,
                  then click <strong>Verify Now</strong>.
                </p>
              </div>
            )}

            {/* Success */}
            {emailChannel.config.email?.verificationStatus === "verified" && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Domain verified! Incoming emails to configured addresses will create conversations
                  in your inbox. Outgoing emails are sent from the corresponding address.
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

            {/* Manage Emails Section */}
            {showEmailsSection && (
              <ManageEmailsSection
                channel={emailChannel}
                onClose={() => setShowEmailsSection(false)}
              />
            )}

            {/* DNS Records */}
            {showDns && (
              <DnsRecordsTable records={emailChannel.config.email?.dnsRecords ?? []} />
            )}
          </div>
        ) : (
          /* Add email channel CTA */
          <button
            type="button"
            onClick={() => navigate("/dashboard/channels/email")}
            className="w-full rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 p-8 group"
            id="btn-add-email-channel"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Connect Email Channel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use your own domain to send and receive support emails via AI.
                </p>
              </div>
            </div>
          </button>
        )}
      </section>

      {/* WhatsApp Channel */}
      <section className="space-y-3" data-tour-id="page-channels-whatsapp">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
          WhatsApp
        </h2>

        {whatsappLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : whatsappChannel ? (
          /* Existing WhatsApp card */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-emerald-500" />
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
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWhatsAppInfo((p) => !p)}
                  className="gap-1.5"
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
                    id="btn-confirm-delete-whatsapp"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeleteWhatsApp}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                    Copy this URL and paste it as the **Incoming Message Webhook** in your Twilio WhatsApp Phone Number configuration.
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
            className="w-full rounded-2xl border-2 border-dashed border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-200 p-8 group"
            id="btn-add-whatsapp-channel"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Connect WhatsApp Channel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use your Twilio Account to chat with customers on WhatsApp.
                </p>
              </div>
            </div>
          </button>
        )}
      </section>

      {/* Telegram Channel */}
      <section className="space-y-3" data-tour-id="page-channels-telegram">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
          Telegram
        </h2>

        {telegramLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-32" />
        ) : telegramChannel ? (
          /* Existing Telegram card */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <Send className="h-6 w-6 text-sky-500" />
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
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTelegramInfo((p) => !p)}
                  className="gap-1.5"
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
                    id="btn-confirm-delete-telegram"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDeleteTelegram}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
            className="w-full rounded-2xl border-2 border-dashed border-border bg-card hover:border-sky-500/40 hover:bg-sky-500/5 transition-all duration-200 p-8 group"
            id="btn-add-telegram-channel"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-7 w-7 text-sky-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Connect Telegram Channel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect a Telegram Bot to receive support chats in your inbox.
                </p>
              </div>
            </div>
          </button>
        )}
      </section>


    </div>
  );
}

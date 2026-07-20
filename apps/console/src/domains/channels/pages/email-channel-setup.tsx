import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Globe,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Info,
  RefreshCw,
} from "lucide-react";
import { EmailIcon } from "@/shared/ui/channel-icon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  useCreateEmailChannel,
  useUpdateEmailChannelAddresses,
  useVerifyChannel,
} from "../hooks/use-channels";
import type { DnsRecord } from "../types/types";
import {
  ChannelSetupLayout,
  SetupField,
  setupInputClassName,
} from "../components/channel-setup-layout";

// ── Step types ────────────────────────────────────────────────────────────────

type Step = "domain" | "dns" | "email";

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "domain", label: "Add domain" },
    { key: "dns", label: "Verify DNS" },
    { key: "email", label: "Create email" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < currentIdx
                ? "bg-emerald-500 text-white"
                : i === currentIdx
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
          >
            {i < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`text-sm font-medium hidden sm:block ${i === currentIdx ? "text-foreground" : "text-muted-foreground"
              }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 mx-1 transition-all duration-500 ${i < currentIdx ? "bg-emerald-500" : "bg-border"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLong = value.length > 50;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-semibold text-primary hover:underline transition-colors"
          >
            {expanded ? "Show Less" : "Show Full"}
          </button>
        )}
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border font-mono text-sm">
        <span className={`flex-1 text-foreground/85 break-all ${!expanded && isLong ? "line-clamp-1 truncate" : ""}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground mt-0.5"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function DnsRecordsStep({
  records,
  domain,
  onVerify,
  isVerifying,
  verificationMessage,
  verificationError,
}: {
  records: DnsRecord[];
  domain: string;
  onVerify: () => void;
  isVerifying: boolean;
  verificationMessage?: string;
  verificationError?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Add these DNS records</p>
          <p className="text-sm text-muted-foreground mt-1">
            Log into your DNS provider and add the records below. DNS propagation can take up to
            48 hours. Once added, verify the domain below to unlock email creation.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b border-border">
          <p className="text-sm font-semibold">DNS Configuration</p>
        </div>
        <div className="divide-y divide-border">
          {records.map((rec, i) => {
            let cleanValue = rec.value;
            let priority = rec.priority;

            if (rec.type === "MX") {
              const mxMatch = rec.value.match(/^(\d+)\s+(.+)$/);
              if (mxMatch) {
                priority = parseInt(mxMatch[1], 10);
                cleanValue = mxMatch[2];
              }
              if (!cleanValue.endsWith(".")) {
                cleanValue = cleanValue + ".";
              }
            }

            const getRelativeHost = (recordName: string) => {
              const parts = domain.split(".");
              if (parts.length < 3) return recordName;
              const parentDomain = parts.slice(1).join(".");
              if (recordName === parentDomain) return "@";
              if (recordName.endsWith("." + parentDomain)) {
                return recordName.slice(0, -(parentDomain.length + 1));
              }
              return recordName;
            };

            return (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
                    {rec.type}
                  </span>
                  {priority !== undefined && (
                    <span className="text-xs text-muted-foreground">Priority: {priority}</span>
                  )}
                </div>
                <CopyField label="Name / Host" value={getRelativeHost(rec.name)} />
                <CopyField label="Value / Content" value={cleanValue} />
              </div>
            );
          })}
        </div>
      </div>

      {verificationMessage && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {verificationMessage}
        </div>
      )}
      {verificationError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {verificationError}
        </div>
      )}

      <Button
        onClick={onVerify}
        disabled={isVerifying}
        className="h-11 w-full rounded-lg"
        size="lg"
        id="btn-verify-domain"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? "animate-spin" : ""}`} />
        {isVerifying ? "Checking DNS records…" : "Verify domain"}
      </Button>
    </div>
  );
}

function CreateEmailStep({
  channelId,
  domain,
  onFinish,
}: {
  channelId: string;
  domain: string;
  onFinish: () => void;
}) {
  const updateMutation = useUpdateEmailChannelAddresses();
  const [email, setEmail] = useState(`support@${domain}`);
  const [error, setError] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");

  const handleCreateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    if (!normalizedEmail.endsWith(`@${domain}`)) {
      setError(`Email address must use @${domain}`);
      return;
    }

    try {
      await updateMutation.mutateAsync({ channelId, emails: [normalizedEmail] });
      setCreatedEmail(normalizedEmail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create email address");
    }
  };

  if (createdEmail) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-semibold text-foreground">Email setup complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">{createdEmail}</strong> is ready to use.
          </p>
        </div>
        <Button onClick={onFinish} className="h-11 w-full rounded-lg" size="lg">
          Finish setup
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateEmail} className="space-y-5" noValidate>
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-semibold text-foreground">Domain verified</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {domain} is verified. You can now create your first email address.
          </p>
        </div>
      </div>

      <SetupField
        htmlFor="first-email-address"
        label="First email address"
        hint={`Create an address using your verified @${domain} domain.`}
        error={error || undefined}
      >
        <div className="relative">
          <EmailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            id="first-email-address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            className={`${setupInputClassName} pl-10`}
            placeholder={`support@${domain}`}
            disabled={updateMutation.isPending}
          />
        </div>
      </SetupField>

      <Button
        type="submit"
        className="h-11 w-full rounded-lg"
        size="lg"
        disabled={updateMutation.isPending || !email.trim()}
        id="btn-create-first-email"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating email…
          </>
        ) : (
          <>
            <EmailIcon className="mr-2 h-4 w-4" />
            Create email address
          </>
        )}
      </Button>
    </form>
  );
}

// ── Form validation ───────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  domain?: string;
}

function validate(name: string, domain: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim() || name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (
    !domain.trim() ||
    !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])+(\.[a-zA-Z]{2,})$/.test(domain)
  )
    errors.domain = "Enter a valid subdomain (e.g. support.acme.com)";
  return errors;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmailChannelSetupPage() {
  const navigate = useNavigate();
  const createMutation = useCreateEmailChannel();
  const verifyMutation = useVerifyChannel();
  const [step, setStep] = useState<Step>("domain");
  const [channelId, setChannelId] = useState("");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [verificationMessage, setVerificationMessage] = useState("");

  const [name, setName] = useState("Support Email");
  const [domain, setDomain] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ name: false, domain: false });

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(name, domain);
    setErrors((prev) => ({ ...prev, [field]: v[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(name, domain);
    setErrors(v);
    setTouched({ name: true, domain: true });
    if (Object.keys(v).length > 0) return;

    try {
      const res = await createMutation.mutateAsync({ name, domain });
      const channel = res?.data?.channel;
      const status = channel?.config?.email?.verificationStatus;
      const records = channel?.config?.email?.dnsRecords ?? [];

      if (!channel?._id) return;
      setChannelId(channel._id);
      setDomain(channel.config.email?.domain || domain.trim().toLowerCase());
      setDnsRecords(records);

      if (status === "verified") {
        setStep("email");
      } else {
        setStep("dns");
      }
    } catch {
      // error displayed via mutation.error
    }
  };

  const handleVerifyDomain = async () => {
    if (!channelId) return;
    setVerificationMessage("");

    try {
      const response = await verifyMutation.mutateAsync(channelId);
      const status = response.data?.status;
      setDnsRecords(response.data?.dnsRecords ?? dnsRecords);

      if (status === "verified") {
        setStep("email");
      } else {
        setVerificationMessage(
          "DNS verification is still pending. Confirm the records are correct, then check again.",
        );
      }
    } catch {
      // Mutation error is displayed in the DNS step.
    }
  };

  return (
    <ChannelSetupLayout
      icon={<EmailIcon className="h-6 w-6" />}
      eyebrow="Email integration"
      title="Verify your sending domain"
      description="Connect and verify your business domain first. Email address creation unlocks after DNS verification."
      benefits={[
        "Add your business domain",
        "Copy provider-ready DNS records",
        "Create email addresses after verification",
      ]}
      onBack={() => navigate("/dashboard/channels")}
    >
        <StepIndicator current={step} />

        {/* Step: Form */}
        {step === "domain" && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Channel name */}
            <SetupField
              htmlFor="channel-name"
              label="Internal channel name"
              hint="A friendly name your team will recognize, such as “Customer Support”."
              error={touched.name ? errors.name : undefined}
            >
              <Input
                id="channel-name"
                placeholder="Customer Support"
                className={setupInputClassName}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) {
                    const v = validate(e.target.value, domain);
                    setErrors((prev) => ({ ...prev, name: v.name }));
                  }
                }}
                onBlur={() => handleBlur("name")}
              />
            </SetupField>

            {/* Domain */}
            <SetupField
              htmlFor="channel-domain"
              label="Sending subdomain"
              hint="Use a subdomain specifically for support (e.g. support.acme.com) so your corporate email isn't affected."
              error={touched.domain ? errors.domain : undefined}
            >
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="channel-domain"
                  placeholder="support.acme.com"
                  className={`${setupInputClassName} pl-10`}
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    if (touched.domain) {
                      const v = validate(name, e.target.value);
                      setErrors((prev) => ({ ...prev, domain: v.domain }));
                    }
                  }}
                  onBlur={() => handleBlur("domain")}
                />
              </div>
            </SetupField>

            {/* API error */}
            {createMutation.isError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  {(createMutation.error as Error)?.message || "Something went wrong"}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-lg"
              size="lg"
              disabled={createMutation.isPending}
              id="btn-create-channel"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up channel…
                </>
              ) : (
                <>
                  <EmailIcon className="h-4 w-4 mr-2" />
                  Add domain &amp; get DNS records
                </>
              )}
            </Button>
          </form>
        )}

        {/* Step: DNS */}
        {step === "dns" && (
          <DnsRecordsStep
            records={dnsRecords}
            domain={domain}
            onVerify={handleVerifyDomain}
            isVerifying={verifyMutation.isPending}
            verificationMessage={verificationMessage}
            verificationError={
              verifyMutation.isError
                ? (verifyMutation.error as Error)?.message || "Failed to verify the domain"
                : undefined
            }
          />
        )}

        {/* Step: Create first email */}
        {step === "email" && channelId && (
          <CreateEmailStep
            channelId={channelId}
            domain={domain}
            onFinish={() => navigate("/dashboard/channels")}
          />
        )}
    </ChannelSetupLayout>
  );
}

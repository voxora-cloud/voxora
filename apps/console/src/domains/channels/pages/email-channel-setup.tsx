import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Mail,
  Globe,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useCreateEmailChannel } from "../hooks/use-channels";
import type { DnsRecord } from "../types/types";

// ── Step types ────────────────────────────────────────────────────────────────

type Step = "form" | "dns";

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "form", label: "Channel Details" },
    { key: "dns", label: "DNS Setup" },
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
  onDone,
}: {
  records: DnsRecord[];
  onDone: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Add these DNS records</p>
          <p className="text-sm text-muted-foreground mt-1">
            Log into your DNS provider and add the records below. DNS propagation can take up to
            48 hours. Once added, go back to the Channels page and click{" "}
            <strong>Verify Now</strong>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b border-border">
          <p className="text-sm font-semibold">DNS Configuration</p>
        </div>
        <div className="divide-y divide-border">
          {records.map((rec, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
                  {rec.type}
                </span>
                {rec.priority !== undefined && (
                  <span className="text-xs text-muted-foreground">Priority: {rec.priority}</span>
                )}
              </div>
              <CopyField label="Name / Host" value={rec.name} />
              <CopyField label="Value / Content" value={rec.value} />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={onDone} className="w-full" size="lg" id="btn-finish-setup">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Done — Go to Channels
      </Button>
    </div>
  );
}

// ── Form validation ───────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  email?: string;
  domain?: string;
}

function validate(name: string, email: string, domain: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim() || name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address";
  if (
    !domain.trim() ||
    !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain)
  )
    errors.domain = "Enter a valid domain name (e.g. acme.com)";
  return errors;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmailChannelSetupPage() {
  const navigate = useNavigate();
  const createMutation = useCreateEmailChannel();
  const [step, setStep] = useState<Step>("form");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);

  const [name, setName] = useState("Support Email");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ name: false, email: false, domain: false });

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const atIdx = val.indexOf("@");
    if (atIdx !== -1) {
      const d = val.slice(atIdx + 1).toLowerCase();
      if (d && d.includes(".")) setDomain(d);
    }
    if (touched.email) {
      const v = validate(name, val, domain);
      setErrors((prev) => ({ ...prev, email: v.email }));
    }
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(name, email, domain);
    setErrors((prev) => ({ ...prev, [field]: v[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(name, email, domain);
    setErrors(v);
    setTouched({ name: true, email: true, domain: true });
    if (Object.keys(v).length > 0) return;

    try {
      const res = await createMutation.mutateAsync({ name, email, domain });
      const channel = res?.data?.channel;
      const status = channel?.config?.email?.verificationStatus;
      const records = channel?.config?.email?.dnsRecords ?? [];

      if (status === "verified") {
        navigate("/dashboard/channels");
      } else {
        setDnsRecords(records);
        setStep("dns");
      }
    } catch {
      // error displayed via mutation.error
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/dashboard/channels")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        id="btn-back-to-channels"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Channels
      </button>

      <div className="rounded-2xl border border-border bg-card p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Connect Email Channel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your own domain, powered by AI support.
            </p>
          </div>
        </div>

        <StepIndicator current={step} />

        {/* Step: Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Channel name */}
            <div className="space-y-1.5">
              <label htmlFor="channel-name" className="text-sm font-medium text-foreground">
                Channel Name
              </label>
              <Input
                id="channel-name"
                placeholder="Support Email"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) {
                    const v = validate(e.target.value, email, domain);
                    setErrors((prev) => ({ ...prev, name: v.name }));
                  }
                }}
                onBlur={() => handleBlur("name")}
              />
              {errors.name && touched.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email address */}
            <div className="space-y-1.5">
              <label htmlFor="channel-email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="channel-email"
                  type="email"
                  placeholder="support@acme.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => handleBlur("email")}
                />
              </div>
              {errors.email && touched.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <label htmlFor="channel-domain" className="text-sm font-medium text-foreground">
                Domain
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="channel-domain"
                  placeholder="acme.com"
                  className="pl-9"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    if (touched.domain) {
                      const v = validate(name, email, e.target.value);
                      setErrors((prev) => ({ ...prev, domain: v.domain }));
                    }
                  }}
                  onBlur={() => handleBlur("domain")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-filled from email. You must own this domain and be able to edit its DNS.
              </p>
              {errors.domain && touched.domain && (
                <p className="text-xs text-destructive">{errors.domain}</p>
              )}
            </div>

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
              className="w-full"
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
                  <Mail className="h-4 w-4 mr-2" />
                  Connect &amp; Get DNS Records
                </>
              )}
            </Button>
          </form>
        )}

        {/* Step: DNS */}
        {step === "dns" && (
          <DnsRecordsStep records={dnsRecords} onDone={() => navigate("/dashboard/channels")} />
        )}
      </div>
    </div>
  );
}

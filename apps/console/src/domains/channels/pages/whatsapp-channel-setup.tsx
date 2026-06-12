import { useState } from "react";
import { useNavigate } from "react-router";
import {
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useCreateWhatsAppChannel } from "../hooks/use-channels";

type Step = "form" | "instructions";

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "form", label: "Twilio Credentials" },
    { key: "instructions", label: "Webhook Setup" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < currentIdx
                ? "bg-emerald-500 text-white"
                : i === currentIdx
                  ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`text-sm font-medium hidden sm:block ${
              i === currentIdx ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 mx-1 transition-all duration-500 ${
                i < currentIdx ? "bg-emerald-500" : "bg-border"
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
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border font-mono text-sm">
        <span className="flex-1 truncate text-foreground/80">{value}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
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

interface SetupInstructionsProps {
  webhookUrl: string;
  onDone: () => void;
}
function SetupInstructions({ webhookUrl, onDone }: SetupInstructionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Channel connected successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your Twilio credentials verified successfully. To start receiving messages, you must now configure your webhook on the Twilio Console.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b border-border">
          <p className="text-sm font-semibold">Webhook Configuration</p>
        </div>
        <div className="p-4 space-y-4">
          <CopyField label="Webhook Endpoint URL" value={webhookUrl} />
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Setup instructions for Twilio:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Log into your **Twilio Console**.</li>
              <li>Go to **Develop ➔ Messaging ➔ Senders ➔ WhatsApp Senders** (or search your Active Numbers).</li>
              <li>Select your WhatsApp Sender number.</li>
              <li>Under **Webhook URL for Incoming Messages**, paste the copied URL above.</li>
              <li>Ensure the HTTP method is set to **POST**.</li>
              <li>Click **Save** to complete connection.</li>
            </ol>
          </div>
        </div>
      </div>

      <Button onClick={onDone} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Finish Setup
      </Button>
    </div>
  );
}

interface FormErrors {
  name?: string;
  phoneNumber?: string;
  accountSid?: string;
  authToken?: string;
}

function validate(name: string, phoneNumber: string, accountSid: string, authToken: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "Channel Name is required";
  if (!phoneNumber.trim()) errors.phoneNumber = "WhatsApp number is required";
  if (!accountSid.trim() || !/^AC[a-f0-9]{32}$/i.test(accountSid.trim())) {
    errors.accountSid = "Invalid Twilio Account SID (must start with AC followed by 32 characters)";
  }
  if (!authToken.trim()) errors.authToken = "Twilio Auth Token is required";
  return errors;
}

export function WhatsAppChannelSetupPage() {
  const navigate = useNavigate();
  const createMutation = useCreateWhatsAppChannel();
  const [step, setStep] = useState<Step>("form");
  const [webhookUrl, setWebhookUrl] = useState("");

  const [name, setName] = useState("Support WhatsApp");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ name: false, phoneNumber: false, accountSid: false, authToken: false });

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(name, phoneNumber, accountSid, authToken);
    setErrors((prev) => ({ ...prev, [field]: v[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(name, phoneNumber, accountSid, authToken);
    setErrors(v);
    setTouched({ name: true, phoneNumber: true, accountSid: true, authToken: true });
    if (Object.keys(v).length > 0) return;

    try {
      const res = await createMutation.mutateAsync({
        name,
        phoneNumber,
        accountSid,
        authToken,
        messagingServiceSid: messagingServiceSid || undefined,
      });

      const channel = res?.data?.channel;
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";
      const hostBase = apiBase.replace(/\/api\/v1\/?$/, "");
      const generatedUrl = `${hostBase}/api/v1/channels/whatsapp/inbound/${channel._id}`;
      
      setWebhookUrl(generatedUrl);
      setStep("instructions");
    } catch {
      // Mutation handles error state
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Connect WhatsApp Channel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect Twilio to receive WhatsApp support messages.
            </p>
          </div>
        </div>

        <StepIndicator current={step} />

        {step === "form" && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="channel-name" className="text-sm font-medium text-foreground">
                Channel Name
              </label>
              <Input
                id="channel-name"
                placeholder="Support WhatsApp"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) {
                    const v = validate(e.target.value, phoneNumber, accountSid, authToken);
                    setErrors((prev) => ({ ...prev, name: v.name }));
                  }
                }}
                onBlur={() => handleBlur("name")}
              />
              {errors.name && touched.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="wa-phone" className="text-sm font-medium text-foreground">
                WhatsApp Phone Number
              </label>
              <Input
                id="wa-phone"
                placeholder="+14155238886"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (touched.phoneNumber) {
                    const v = validate(name, e.target.value, accountSid, authToken);
                    setErrors((prev) => ({ ...prev, phoneNumber: v.phoneNumber }));
                  }
                }}
                onBlur={() => handleBlur("phoneNumber")}
              />
              <p className="text-xs text-muted-foreground">
                The Twilio phone number registered for WhatsApp (use your active sender or sandbox number).
              </p>
              {errors.phoneNumber && touched.phoneNumber && (
                <p className="text-xs text-destructive">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Account SID */}
            <div className="space-y-1.5">
              <label htmlFor="account-sid" className="text-sm font-medium text-foreground">
                Twilio Account SID
              </label>
              <Input
                id="account-sid"
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={accountSid}
                onChange={(e) => {
                  setAccountSid(e.target.value);
                  if (touched.accountSid) {
                    const v = validate(name, phoneNumber, e.target.value, authToken);
                    setErrors((prev) => ({ ...prev, accountSid: v.accountSid }));
                  }
                }}
                onBlur={() => handleBlur("accountSid")}
              />
              {errors.accountSid && touched.accountSid && (
                <p className="text-xs text-destructive">{errors.accountSid}</p>
              )}
            </div>

            {/* Auth Token */}
            <div className="space-y-1.5">
              <label htmlFor="auth-token" className="text-sm font-medium text-foreground">
                Twilio Auth Token
              </label>
              <Input
                id="auth-token"
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={authToken}
                onChange={(e) => {
                  setAuthToken(e.target.value);
                  if (touched.authToken) {
                    const v = validate(name, phoneNumber, accountSid, e.target.value);
                    setErrors((prev) => ({ ...prev, authToken: v.authToken }));
                  }
                }}
                onBlur={() => handleBlur("authToken")}
              />
              {errors.authToken && touched.authToken && (
                <p className="text-xs text-destructive">{errors.authToken}</p>
              )}
            </div>

            {/* Messaging Service SID */}
            <div className="space-y-1.5">
              <label htmlFor="messaging-service-sid" className="text-sm font-medium text-foreground">
                Messaging Service SID (Optional)
              </label>
              <Input
                id="messaging-service-sid"
                placeholder="MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={messagingServiceSid}
                onChange={(e) => setMessagingServiceSid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If using a Messaging Service containing your WhatsApp number, enter its SID here.
              </p>
            </div>

            {/* Mutation API Error */}
            {createMutation.isError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {(createMutation.error as Error)?.message || "Verification failed. Check credentials."}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying Twilio credentials…
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Verify &amp; Connect Channel
                </>
              )}
            </Button>
          </form>
        )}

        {step === "instructions" && (
          <SetupInstructions webhookUrl={webhookUrl} onDone={() => navigate("/dashboard/channels")} />
        )}
      </div>
    </div>
  );
}

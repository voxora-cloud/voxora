import { useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { WhatsAppIcon } from "@/shared/ui/channel-icon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useCreateWhatsAppChannel } from "../hooks/use-channels";
import {
  ChannelSetupLayout,
  SetupField,
  setupInputClassName,
} from "../components/channel-setup-layout";

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
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber.trim())) {
    errors.phoneNumber = "Enter a valid number such as +14155550123";
  }
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
  const [showAuthToken, setShowAuthToken] = useState(false);
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
    <ChannelSetupLayout
      icon={<WhatsAppIcon className="h-6 w-6" />}
      eyebrow="WhatsApp via Twilio"
      title="Connect your WhatsApp number"
      description="Let customers message your business on WhatsApp while your team replies from one shared inbox."
      benefits={[
        "Keep your existing Twilio WhatsApp sender",
        "Receive conversations in real time",
        "Get a webhook URL with setup guidance",
      ]}
      onBack={() => navigate("/dashboard/channels")}
    >
        <StepIndicator current={step} />

        {step === "form" && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <SetupField
              htmlFor="channel-name"
              label="Internal channel name"
              hint="A friendly name only your team sees, such as “Sales WhatsApp”."
              error={touched.name ? errors.name : undefined}
            >
              <Input
                id="channel-name"
                placeholder="Sales WhatsApp"
                className={setupInputClassName}
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
            </SetupField>

            {/* Phone Number */}
            <SetupField
              htmlFor="wa-phone"
              label="WhatsApp sender number"
              hint="Enter the Twilio-approved number in E.164 format: +, country code, then number."
              error={touched.phoneNumber ? errors.phoneNumber : undefined}
            >
              <Input
                id="wa-phone"
                type="tel"
                inputMode="tel"
                placeholder="+14155550123"
                className={setupInputClassName}
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
            </SetupField>

            <div className="border-t border-border pt-5">
              <p className="text-sm font-semibold text-foreground">Twilio credentials</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Find these values on the Twilio Console dashboard under Account Info.
              </p>
            </div>

            {/* Account SID */}
            <SetupField
              htmlFor="account-sid"
              label="Account SID"
              hint="Your Twilio account identifier. It always starts with “AC”."
              error={touched.accountSid ? errors.accountSid : undefined}
            >
              <Input
                id="account-sid"
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className={`${setupInputClassName} font-mono text-sm`}
                autoComplete="off"
                spellCheck={false}
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
            </SetupField>

            {/* Auth Token */}
            <SetupField
              htmlFor="auth-token"
              label="Auth Token"
              hint="The secret token shown beside your Account SID in Twilio."
              error={touched.authToken ? errors.authToken : undefined}
            >
              <div className="relative">
                <Input
                  id="auth-token"
                  type={showAuthToken ? "text" : "password"}
                  placeholder="Paste your Twilio auth token"
                  className={`${setupInputClassName} pr-11 font-mono text-sm`}
                  autoComplete="new-password"
                  spellCheck={false}
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
                <button
                  type="button"
                  onClick={() => setShowAuthToken((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={showAuthToken ? "Hide auth token" : "Show auth token"}
                >
                  {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </SetupField>

            {/* Messaging Service SID */}
            <SetupField
              htmlFor="messaging-service-sid"
              label="Messaging Service SID"
              hint="Add this only if your WhatsApp sender belongs to a Twilio Messaging Service."
              optional
            >
              <Input
                id="messaging-service-sid"
                placeholder="MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className={`${setupInputClassName} font-mono text-sm`}
                autoComplete="off"
                spellCheck={false}
                value={messagingServiceSid}
                onChange={(e) => setMessagingServiceSid(e.target.value)}
              />
            </SetupField>

            {/* Mutation API Error */}
            {createMutation.isError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {(createMutation.error as Error)?.message || "Verification failed. Check credentials."}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
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
                  <WhatsAppIcon className="h-4 w-4 mr-2" />
                  Verify &amp; Connect Channel
                </>
              )}
            </Button>
          </form>
        )}

        {step === "instructions" && (
          <SetupInstructions webhookUrl={webhookUrl} onDone={() => navigate("/dashboard/channels")} />
        )}
    </ChannelSetupLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { TelegramIcon } from "@/shared/ui/channel-icon";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useCreateTelegramChannel } from "../hooks/use-channels";
import {
  ChannelSetupLayout,
  SetupField,
  setupInputClassName,
} from "../components/channel-setup-layout";

type Step = "form" | "success";

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "form", label: "Bot Token" },
    { key: "success", label: "Connection Active" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < currentIdx
                ? "bg-sky-500 text-white"
                : i === currentIdx
                  ? "bg-sky-500 text-white ring-4 ring-sky-500/20"
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
                i < currentIdx ? "bg-sky-500" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface SuccessScreenProps {
  botUsername: string;
  onDone: () => void;
}
function SuccessScreen({ botUsername, onDone }: SuccessScreenProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
        <ShieldCheck className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Telegram Bot connected successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your bot token has been verified and the webhook is active. Customers can now start a chat with your bot to open conversations.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-4 bg-muted/20">
        <p className="text-sm font-semibold">Bot Configuration</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">Bot Username</span>
            <span className="font-mono text-sky-600 dark:text-sky-400">@{botUsername}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">Status</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Webhook
            </span>
          </div>
          <div className="pt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground block mb-1">Testing instruction:</span>
            Search for <strong>@{botUsername}</strong> on Telegram and send a message. It will show up in your Inbox immediately!
          </div>
        </div>
      </div>

      <Button onClick={onDone} className="w-full bg-sky-600 hover:bg-sky-700 text-white" size="lg">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Finish Setup
      </Button>
    </div>
  );
}

interface FormErrors {
  name?: string;
  botToken?: string;
}

function validate(name: string, botToken: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "Channel Name is required";
  if (!botToken.trim()) {
    errors.botToken = "Telegram Bot Token is required";
  } else if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(botToken.trim())) {
    errors.botToken = "Invalid Telegram Bot Token format (e.g. 123456789:ABCdefGh...)";
  }
  return errors;
}

export function TelegramChannelSetupPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTelegramChannel();
  const [step, setStep] = useState<Step>("form");
  const [botUsername, setBotUsername] = useState("");

  const [name, setName] = useState("Support Bot");
  const [botToken, setBotToken] = useState("");
  const [showBotToken, setShowBotToken] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ name: false, botToken: false });

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(name, botToken);
    setErrors((prev) => ({ ...prev, [field]: v[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(name, botToken);
    setErrors(v);
    setTouched({ name: true, botToken: true });
    if (Object.keys(v).length > 0) return;

    try {
      const res = await createMutation.mutateAsync({
        name,
        botToken,
      });

      const channel = res?.data?.channel;
      setBotUsername(channel?.config?.telegram?.botUsername || "YourTelegramBot");
      setStep("success");
    } catch {
      // Mutation handles error state
    }
  };

  return (
    <ChannelSetupLayout
      icon={<TelegramIcon className="h-6 w-6" />}
      eyebrow="Telegram integration"
      title="Connect your Telegram bot"
      description="Turn messages sent to your Telegram bot into conversations your support team can manage together."
      benefits={[
        "Verify your bot before activation",
        "Configure the webhook automatically",
        "Start receiving messages immediately",
      ]}
      onBack={() => navigate("/dashboard/channels")}
    >
        <StepIndicator current={step} />

        {step === "form" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Info className="h-4 w-4 text-sky-500 shrink-0" />
                Need a bot token?
              </span>
              Open <strong>@BotFather</strong> in Telegram, send <code>/newbot</code>, follow the
              prompts, then copy the HTTP API token it gives you.
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Name */}
              <SetupField
                htmlFor="channel-name"
                label="Internal channel name"
                hint="A friendly label your team will see, such as “Community Support”."
                error={touched.name ? errors.name : undefined}
              >
                <Input
                  id="channel-name"
                  placeholder="Community Support"
                  className={setupInputClassName}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) {
                      const v = validate(e.target.value, botToken);
                      setErrors((prev) => ({ ...prev, name: v.name }));
                    }
                  }}
                  onBlur={() => handleBlur("name")}
                />
              </SetupField>

              {/* Bot Token */}
              <SetupField
                htmlFor="bot-token"
                label="Bot API token"
                hint="Paste the complete token from @BotFather. It begins with numbers followed by a colon."
                error={touched.botToken ? errors.botToken : undefined}
              >
                <div className="relative">
                  <Input
                    id="bot-token"
                    type={showBotToken ? "text" : "password"}
                    placeholder="123456789:AA..."
                    className={`${setupInputClassName} pr-11 font-mono text-sm`}
                    autoComplete="new-password"
                    spellCheck={false}
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      if (touched.botToken) {
                        const v = validate(name, e.target.value);
                        setErrors((prev) => ({ ...prev, botToken: v.botToken }));
                      }
                    }}
                    onBlur={() => handleBlur("botToken")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    aria-label={showBotToken ? "Hide bot token" : "Show bot token"}
                  >
                    {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </SetupField>

              {/* Mutation API Error */}
              {createMutation.isError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {(createMutation.error as Error)?.message || "Verification failed. Check Bot Token."}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                size="lg"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying Bot Token &amp; configuring webhook…
                  </>
                ) : (
                  <>
                    <TelegramIcon className="h-4 w-4 mr-2" />
                    Verify &amp; Connect Channel
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {step === "success" && (
          <SuccessScreen botUsername={botUsername} onDone={() => navigate("/dashboard/channels")} />
        )}
    </ChannelSetupLayout>
  );
}

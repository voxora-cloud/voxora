import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useCreateTelegramChannel } from "../hooks/use-channels";

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
          <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
            <Send className="h-6 w-6 text-sky-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Connect Telegram Channel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect a Telegram Bot to receive support chats in your inbox.
            </p>
          </div>
        </div>

        <StepIndicator current={step} />

        {step === "form" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <Info className="h-4 w-4 text-sky-500 shrink-0" />
                How to create a Telegram Bot?
              </span>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                <li>Send the command <strong>/newbot</strong>.</li>
                <li>Choose a display name and a unique username (e.g. <code>acme_support_bot</code>) for your bot.</li>
                <li>Copy the provided **HTTP API Bot Token**.</li>
              </ol>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="channel-name" className="text-sm font-medium text-foreground">
                  Channel Name
                </label>
                <Input
                  id="channel-name"
                  placeholder="Support Bot"
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
                {errors.name && touched.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Bot Token */}
              <div className="space-y-1.5">
                <label htmlFor="bot-token" className="text-sm font-medium text-foreground">
                  Telegram Bot HTTP API Token
                </label>
                <Input
                  id="bot-token"
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
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
                {errors.botToken && touched.botToken && (
                  <p className="text-xs text-destructive">{errors.botToken}</p>
                )}
              </div>

              {/* Mutation API Error */}
              {createMutation.isError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {(createMutation.error as Error)?.message || "Verification failed. Check Bot Token."}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
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
                    <Send className="h-4 w-4 mr-2" />
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
      </div>
    </div>
  );
}

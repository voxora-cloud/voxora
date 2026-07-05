import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";
import {
  Bot,
  Brush,
  Eye,
  Layers,
  MessageSquareText,
  Monitor,
  Moon,
  Plus,
  Shield,
  Smartphone,
  Sun,
  Timer,
  UserCheck,
  X,
  Zap,
  Globe,
  Copy,
  Check,
  Loader2,
  Settings,
} from "lucide-react";
import { useVerifyDomain } from "../hooks";
import { toast } from "sonner";
import type { CreateWidgetData } from "../types";
import { Label } from "@/shared/ui/label";

import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WidgetAdvancedConfigFormProps {
  formData: CreateWidgetData;
  onChange: (next: CreateWidgetData) => void;
  beforeContent?: ReactNode;
  generalError?: string;
}

type TabId = "general" | "appearance" | "ai" | "behavior" | "conversation" | "features" | "domain";

interface TabDef {
  id: TabId;
  label: string;
  icon: ComponentType<LucideProps>;
  badge?: string;
}

interface ToggleCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}

interface FieldRowProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function ToggleCard({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: ToggleCardProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`w-full text-left flex items-center gap-4 p-4 transition-colors duration-150 group ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-muted/10"
          : checked
            ? "bg-primary/[0.045] cursor-pointer"
            : "bg-background hover:bg-muted/30 cursor-pointer"
      }`}
    >
      {/* Icon badge */}
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          checked && !disabled
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked && !disabled ? "text-foreground" : "text-foreground/80"}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>

      {/* Pill toggle */}
      <div
        className={`relative h-5 w-9 rounded-full flex-shrink-0 transition-colors duration-200 ${
          checked && !disabled ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked && !disabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function FieldRow({ label, htmlFor, children }: FieldRowProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5 border-b border-border/60 pb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function validatePageRule(value: string): string | null {
  const rule = value.trim();
  if (!rule) return "Enter a URL or path.";
  if (/\s/.test(rule)) return "URLs and paths cannot contain spaces.";

  try {
    if (/^https?:\/\//i.test(rule)) {
      const url = new URL(rule);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Only http and https URLs are supported.";
      }
      return null;
    }

    if (rule.startsWith("/") && !rule.startsWith("//")) {
      new URL(rule, "https://example.com");
      return null;
    }

    return "Use a full http(s) URL or a path that starts with /.";
  } catch {
    return "Enter a valid URL or path.";
  }
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export function WidgetAdvancedConfigForm({
  formData,
  onChange,
  beforeContent,
  generalError,
}: WidgetAdvancedConfigFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [pageRuleInput, setPageRuleInput] = useState("");
  const [pageRuleError, setPageRuleError] = useState("");
  const [copied, setCopied] = useState(false);

  const { mutate: verifyDomain, isPending: isVerifying } = useVerifyDomain();
  const isLocalPanel = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
  const domainVerificationRequired =
    import.meta.env.PROD && !isLocalPanel;
  const domainAccessAllowed =
    !domainVerificationRequired || formData.domainVerificationStatus === "verified";
  const visibleTab = generalError ? "general" : activeTab;

  /* ── Helpers ──────────────────────────────────────────────────────────── */


  const updateAppearance = (field: keyof CreateWidgetData["appearance"], value: string) =>
    onChange({ ...formData, appearance: { ...formData.appearance, [field]: value } });

  const updateBehavior = (
    field: keyof CreateWidgetData["behavior"],
    value: boolean | string[],
  ) =>
    onChange({ ...formData, behavior: { ...formData.behavior, [field]: value } });

  const updateAi = (field: keyof CreateWidgetData["ai"], value: boolean | string) =>
    onChange({ ...formData, ai: { ...formData.ai, [field]: value } });

  const updateCollectUserInfo = (
    field: keyof CreateWidgetData["conversation"]["collectUserInfo"],
    value: boolean,
  ) =>
    onChange({
      ...formData,
      conversation: {
        ...formData.conversation,
        collectUserInfo: { ...formData.conversation.collectUserInfo, [field]: value },
      },
    });

  const updateFeatures = (field: keyof CreateWidgetData["features"], value: boolean) =>
    onChange({ ...formData, features: { ...formData.features, [field]: value } });

  const addHiddenPageRule = () => {
    const nextRule = pageRuleInput.trim();
    const error = validatePageRule(nextRule);
    if (error) {
      setPageRuleError(error);
      return;
    }

    const existingRules = formData.behavior.allowedPageRules || [];
    if (existingRules.includes(nextRule)) {
      setPageRuleError("This page rule is already added.");
      return;
    }

    updateBehavior("allowedPageRules", [...existingRules, nextRule]);
    setPageRuleInput("");
    setPageRuleError("");
  };

  const removeHiddenPageRule = (rule: string) => {
    updateBehavior(
      "allowedPageRules",
      (formData.behavior.allowedPageRules || []).filter((item: string) => item !== rule),
    );
  };

  /* ── Tab config ───────────────────────────────────────────────────────── */

  const tabs: TabDef[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Theme & Appearance", icon: Brush },
    {
      id: "ai",
      label: "AI",
      icon: Bot,
      badge: formData.ai.enabled ? "On" : undefined,
    },
    { id: "behavior", label: "Behavior", icon: Layers },
    { id: "conversation", label: "Conversation", icon: MessageSquareText },
    { id: "features", label: "Features", icon: Zap },
    {
      id: "domain",
      label: "Domain",
      icon: Globe,
      badge: !domainVerificationRequired
        ? "Not required"
        : formData.domainVerificationStatus === "verified"
          ? "Verified"
          : (formData.verifiedDomain ? "Pending" : undefined),
    },
  ];

  /* ── Tab panels ───────────────────────────────────────────────────────── */

  const panels: Record<TabId, ReactNode> = {
    general: null,
    appearance: (
      <div className="space-y-5">
        <SectionHeader
          title="Theme & Appearance"
          subtitle="Customize how the launcher and chat window look to visitors."
        />

        {/* Theme selection row */}
        <div className="space-y-4">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Widget Theme
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateAppearance("theme", "light")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                formData.appearance.theme === "light"
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
                formData.appearance.theme === "light" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Sun className="h-5 w-5" />
              </div>
              <span className={`text-sm font-semibold ${
                formData.appearance.theme === "light" ? "text-foreground" : "text-muted-foreground"
              }`}>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => updateAppearance("theme", "dark")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                formData.appearance.theme === "dark"
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/15"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
                formData.appearance.theme === "dark" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Moon className="h-5 w-5" />
              </div>
              <span className={`text-sm font-semibold ${
                formData.appearance.theme === "dark" ? "text-foreground" : "text-muted-foreground"
              }`}>Dark Mode</span>
            </button>
          </div>
        </div>

        <FieldRow label="Welcome Message" htmlFor="welcomeMessage">
          <Textarea
            id="welcomeMessage"
            value={formData.appearance.welcomeMessage}
            onChange={(e) => updateAppearance("welcomeMessage", e.target.value)}
            placeholder="Need help? Ask here and we’ll point you in the right direction."
            className="min-h-[96px] resize-none text-sm rounded-xl"
          />
        </FieldRow>

        <FieldRow label="Background Pattern" htmlFor="backgroundPattern">
          <Select
            value={formData.appearance.pattern || "none"}
            onValueChange={(value) => updateAppearance("pattern", value)}
          >
            <SelectTrigger
              id="backgroundPattern"
              className="h-10 rounded-lg border-border bg-background shadow-none focus:ring-2 focus:ring-primary/20"
            >
              <SelectValue placeholder="Select a background pattern" />
            </SelectTrigger>
            <SelectContent
              side="top"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className="max-h-72 shadow-none"
            >
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uiverse-alexruix">Geometric Pattern (Alexruix)</SelectItem>
              <SelectItem value="dots">Dotted Pattern</SelectItem>
              <SelectItem value="grid">Grid Pattern</SelectItem>
              <SelectItem value="island">Island Noise</SelectItem>
              <SelectItem value="3d-cubes">3D Cubes (Conic)</SelectItem>
              <SelectItem value="checkerboard">Checkerboard</SelectItem>
              <SelectItem value="hexagonal">Hexagonal Triangles</SelectItem>
              <SelectItem value="polka">Purple Polka Dots</SelectItem>
              <SelectItem value="radial-stripes">Radial Stripes</SelectItem>
              <SelectItem value="plaid">Plaid Grid</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>
    ),

    ai: (
      <div className="space-y-5">
        <SectionHeader
          title="AI Configuration"
          subtitle="Control how AI responds and routes conversations."
        />

        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          <ToggleCard
            icon={Bot}
            label="Enable AI"
            description="Use AI to generate responses to visitor messages."
            checked={formData.ai.enabled}
            onCheckedChange={(v) => updateAi("enabled", v)}
          />
          <ToggleCard
            icon={UserCheck}
            label="Fallback to human agent"
            description="Escalate to a live agent when AI confidence is low."
            checked={formData.ai.fallbackToAgent}
            onCheckedChange={(v) => updateAi("fallbackToAgent", v)}
          />
        </div>

      </div>
    ),

    behavior: (
      <div className="space-y-5">
        <SectionHeader
          title="Behavior"
          subtitle="Control when and where the widget is shown to visitors."
        />
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          <ToggleCard
            icon={Eye}
            label="Show widget popup"
            description="Display the chat launcher and popup on your website."
            checked={formData.behavior.showWidget}
            onCheckedChange={(v) => updateBehavior("showWidget", v)}
          />
          <ToggleCard
            icon={Timer}
            label="Auto-open on load"
            description="Widget opens automatically for desktop visitors when they land on the page."
            checked={formData.behavior.autoOpen}
            onCheckedChange={(v) => updateBehavior("autoOpen", v)}
          />
          <ToggleCard
            icon={Smartphone}
            label="Show on mobile"
            description="Display the widget launcher on phones and small screens."
            checked={formData.behavior.showOnMobile}
            onCheckedChange={(v) => updateBehavior("showOnMobile", v)}
          />
          <ToggleCard
            icon={Monitor}
            label="Show on desktop"
            description="Display the widget launcher on desktop-sized screens."
            checked={formData.behavior.showOnDesktop}
            onCheckedChange={(v) => updateBehavior("showOnDesktop", v)}
          />
          <ToggleCard
            icon={Layers}
            label="Hide widget on selected pages"
            description="Add pages where the widget should be hidden."
            checked={formData.behavior.showOnlyOnSelectedPages}
            onCheckedChange={(v) => updateBehavior("showOnlyOnSelectedPages", v)}
          />

          {formData.behavior.showOnlyOnSelectedPages && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
              <FieldRow label="Hidden pages" htmlFor="hiddenPageRule">
                <div className="flex gap-2">
                  <Input
                    id="hiddenPageRule"
                    value={pageRuleInput}
                    onChange={(e) => {
                      setPageRuleInput(e.target.value);
                      if (pageRuleError) setPageRuleError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHiddenPageRule();
                      }
                    }}
                    placeholder="/admin/* or https://example.com/login"
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon-lg"
                    onClick={addHiddenPageRule}
                    className="cursor-pointer"
                    aria-label="Add hidden page"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {pageRuleError && (
                  <p className="text-xs text-destructive mt-1">{pageRuleError}</p>
                )}
              </FieldRow>

              {(formData.behavior.allowedPageRules || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.behavior.allowedPageRules.map((rule: string) => (
                    <span
                      key={rule}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground"
                    >
                      <span className="truncate">{rule}</span>
                      <button
                        type="button"
                        onClick={() => removeHiddenPageRule(rule)}
                        className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={`Remove ${rule}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add pages where the widget should be hidden.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    ),

    conversation: (
      <div className="space-y-5">
        <SectionHeader
          title="Conversation"
          subtitle="Choose what visitor info to collect before the chat starts."
        />
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          <ToggleCard
            icon={UserCheck}
            label="Collect visitor name"
            description="Show a name field in the pre-chat form."
            checked={formData.conversation.collectUserInfo.name}
            onCheckedChange={(v) => updateCollectUserInfo("name", v)}
          />
          <ToggleCard
            icon={MessageSquareText}
            label="Collect visitor email"
            description="Ask for an email address to follow up after the chat."
            checked={formData.conversation.collectUserInfo.email}
            onCheckedChange={(v) => updateCollectUserInfo("email", v)}
          />
          <ToggleCard
            icon={Smartphone}
            label="Collect phone number"
            description="Optional phone number field for callback support."
            checked={!!formData.conversation.collectUserInfo.phone}
            onCheckedChange={(v) => updateCollectUserInfo("phone", v)}
          />
        </div>

        {/* Info callout */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <span className="font-semibold">Tip:</span> Collecting visitor info before the chat
            improves agent context and reduces back-and-forth.
          </p>
        </div>
      </div>
    ),

    features: (
      <div className="space-y-5">
        <SectionHeader
          title="Features"
          subtitle="Enable or disable advanced widget capabilities."
        />
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          <ToggleCard
            icon={Shield}
            label="Host-page DOM access"
            description="Allow the widget to read and interact with the host page's DOM."
            checked={domainAccessAllowed ? formData.features.endUserDomAccess : false}
            onCheckedChange={(v) => updateFeatures("endUserDomAccess", v)}
            disabled={!domainAccessAllowed}
          />
        </div>

        {!domainAccessAllowed ? (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <span className="font-semibold">ℹ Domain Verification Required:</span> Host-page DOM access is highly privileged and can only be enabled on verified client domains. Please configure and verify your domain in the <button type="button" onClick={() => setActiveTab("domain")} className="font-bold underline cursor-pointer text-primary hover:text-primary/80">Domain</button> tab to unlock this feature.
            </p>
          </div>
        ) : (
          formData.features.endUserDomAccess && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold">⚠ Security note:</span> DOM access lets the widget
                read page content and user inputs. Only enable this if you trust all embedding sites.
              </p>
            </div>
          )
        )}
      </div>
    ),

    domain: (
      <div className="space-y-5">
        <SectionHeader
          title="Domain Verification"
          subtitle="Add and verify the domain name where the widget will be embedded."
        />

        <div className="space-y-4">
          <FieldRow label="Authorized Domain" htmlFor="verifiedDomain">
            <div className="flex gap-2">
              <Input
                id="verifiedDomain"
                value={formData.verifiedDomain || ""}
                onChange={(e) => onChange({
                  ...formData,
                  verifiedDomain: e.target.value,
                  ...(domainVerificationRequired
                    ? { domainVerificationStatus: "pending", domainVerificationToken: null }
                    : {}),
                })}
                placeholder="example.com"
                className="h-10 text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {domainVerificationRequired
                ? "Changing the domain resets verification and requires a new TXT record."
                : "DNS verification is skipped for local development."}
            </p>
          </FieldRow>

          {formData.verifiedDomain && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Verification Status</span>
                {domainAccessAllowed ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs px-2.5 py-0.5 font-semibold">
                    {domainVerificationRequired ? "Verified" : "Not required"}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs px-2.5 py-0.5 font-semibold animate-pulse">
                    Pending Verification
                  </Badge>
                )}
              </div>

              {domainVerificationRequired && formData.domainVerificationStatus !== "verified" && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {formData.domainVerificationToken
                      ? "To verify your domain, add the following TXT record to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap):"
                      : "Save the widget first to generate a DNS verification token for this domain."}
                  </p>
                  {formData.domainVerificationToken && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-semibold">Type</span>
                        <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">TXT</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-semibold">Host / Name</span>
                        <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">@</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Value</span>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={formData.domainVerificationToken || ""}
                            className="flex-1 bg-muted/50 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.domainVerificationToken || "");
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="shrink-0 h-8 px-2.5 cursor-pointer"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500 animate-in fade-in" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {domainVerificationRequired
                && formData.domainVerificationStatus !== "verified"
                && formData.domainVerificationToken && (
                  <Button
                    type="button"
                    onClick={() => {
                      verifyDomain(undefined, {
                        onSuccess: () => {
                          toast.success("Domain verified successfully!");
                        },
                        onError: (err) => {
                          toast.error(err.message || "Domain verification failed. Please check your DNS record.");
                        },
                      });
                    }}
                    disabled={isVerifying}
                    className="w-full h-10 text-sm shadow-md"
                  >
                    {isVerifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Verify Domain
                  </Button>
                )}
            </div>
          )}
        </div>
      </div>
    ),
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <section className="grid min-w-0 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="border-b border-border/70 bg-muted/10 p-3 lg:border-b-0 lg:border-r">
        <nav aria-label="Widget settings sections">
          <ul className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-1.5 lg:overflow-visible lg:pb-0">
            {tabs.map(({ id, label, icon: Icon, badge }) => {
              const active = visibleTab === id;
              return (
                <li key={id} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`relative flex min-w-max items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors cursor-pointer lg:w-full lg:min-w-0 ${
                      active
                        ? "bg-background text-foreground ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="lg:min-w-0 lg:flex-1 lg:text-left">{label}</span>
                    {badge && (
                      <Badge className="h-5 whitespace-nowrap border-border/70 bg-muted px-1.5 py-0 text-[9px] font-medium text-muted-foreground">
                        {badge}
                      </Badge>
                    )}
                    {active && (
                      <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-primary lg:block" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 p-5 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-7">
          {visibleTab === "general" && beforeContent}
          {panels[visibleTab] && (
            <div>
              {panels[visibleTab]}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

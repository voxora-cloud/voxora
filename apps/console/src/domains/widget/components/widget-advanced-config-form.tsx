import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";
import {
  Bot,
  Brush,
  ChevronRight,
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
} from "lucide-react";
import type { CreateWidgetData } from "../types";
import { Label } from "@/shared/ui/label";

import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WidgetAdvancedConfigFormProps {
  formData: CreateWidgetData;
  onChange: (next: CreateWidgetData) => void;
}

type TabId = "appearance" | "ai" | "behavior" | "conversation" | "features";

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
}: ToggleCardProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`w-full text-left flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer group ${
        checked
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-border/60 bg-card/50 hover:border-border hover:bg-card"
      }`}
    >
      {/* Icon badge */}
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-muted/80"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? "text-foreground" : "text-foreground/80"}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>

      {/* Pill toggle */}
      <div
        className={`relative h-5 w-9 rounded-full flex-shrink-0 transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0.5"
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
    <div className="pb-4 border-b border-border/60 mb-5">
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
}: WidgetAdvancedConfigFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [pageRuleInput, setPageRuleInput] = useState("");
  const [pageRuleError, setPageRuleError] = useState("");

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
      (formData.behavior.allowedPageRules || []).filter((item) => item !== rule),
    );
  };

  /* ── Tab config ───────────────────────────────────────────────────────── */

  const tabs: TabDef[] = [
    { id: "appearance", label: "Appearance", icon: Brush },
    {
      id: "ai",
      label: "AI",
      icon: Bot,
      badge: formData.ai.enabled ? "On" : undefined,
    },
    { id: "behavior", label: "Behavior", icon: Layers },
    { id: "conversation", label: "Conversation", icon: MessageSquareText },
    { id: "features", label: "Features", icon: Zap },
  ];

  /* ── Tab panels ───────────────────────────────────────────────────────── */

  const panels: Record<TabId, ReactNode> = {
    appearance: (
      <div className="space-y-5">
        <SectionHeader
          title="Appearance"
          subtitle="Customize how the launcher and chat window look to visitors."
        />

        {/* Theme selection row */}
        <div className="space-y-4">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Widget Theme
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => updateAppearance("theme", "light")}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${
                formData.appearance.theme === "light"
                  ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20 shadow-lg"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                formData.appearance.theme === "light" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Sun className="h-6 w-6" />
              </div>
              <span className={`text-sm font-semibold ${
                formData.appearance.theme === "light" ? "text-foreground" : "text-muted-foreground"
              }`}>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => updateAppearance("theme", "dark")}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${
                formData.appearance.theme === "dark"
                  ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20 shadow-lg"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                formData.appearance.theme === "dark" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Moon className="h-6 w-6" />
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


      </div>
    ),

    ai: (
      <div className="space-y-5">
        <SectionHeader
          title="AI Configuration"
          subtitle="Control how AI responds and routes conversations."
        />

        <div className="grid gap-3">
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
        <div className="grid gap-3">
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
                  {formData.behavior.allowedPageRules.map((rule) => (
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
        <div className="grid gap-3">
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
        <div className="grid gap-3">
          <ToggleCard
            icon={Shield}
            label="Host-page DOM access"
            description="Allow the widget to read and interact with the host page's DOM."
            checked={formData.features.endUserDomAccess}
            onCheckedChange={(v) => updateFeatures("endUserDomAccess", v)}
          />
        </div>

        {formData.features.endUserDomAccess && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">⚠ Security note:</span> DOM access lets the widget
              read page content and user inputs. Only enable this if you trust all embedding sites.
            </p>
          </div>
        )}
      </div>
    ),
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Card header */}
      <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4 border-b border-border/60">
        <h2 className="text-xl font-semibold text-foreground">Advanced Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure AI, behavior, conversation flow, and feature options.</p>
      </div>

      {/* Tab layout */}
      <div className="flex gap-0 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="w-44 flex-shrink-0 border-r border-border/70 bg-muted/30 py-3">
          <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Sections
          </p>
          <ul className="space-y-0.5 px-2">
            {tabs.map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group ${
                    active
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-primary" : ""}`} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/20 font-medium">
                      {badge}
                    </Badge>
                  )}
                  {active && <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />}
                </button>
              </li>
            );
          })}
        </ul>
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0 p-6 overflow-y-auto">
          {panels[activeTab]}
        </div>
      </div>
    </div>
  );
}

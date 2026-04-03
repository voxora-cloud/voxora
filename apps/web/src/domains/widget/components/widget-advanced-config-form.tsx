import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import type { LucideProps } from "lucide-react";
import {
  Bot,
  Brush,
  Check,
  ChevronRight,
  Cpu,
  Layers,
  MessageSquareText,
  Monitor,
  Paperclip,
  Shield,
  Smartphone,
  Timer,
  UserCheck,
  Zap,
} from "lucide-react";
import type { CreateWidgetData } from "../types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";

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

/* ─── Main Component ────────────────────────────────────────────────────── */

export function WidgetAdvancedConfigForm({
  formData,
  onChange,
}: WidgetAdvancedConfigFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  const textColor = formData.appearance.textColor || "#111827";

  const updateAppearance = (field: keyof CreateWidgetData["appearance"], value: string) =>
    onChange({ ...formData, appearance: { ...formData.appearance, [field]: value } });

  const updateBehavior = (field: keyof CreateWidgetData["behavior"], value: boolean) =>
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

        {/* Color row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Text Color" htmlFor="textColor">
            <div className="flex items-center gap-2">
              <label
                htmlFor="textColor"
                className="h-10 w-10 rounded-lg border border-border cursor-pointer flex-shrink-0 shadow-sm overflow-hidden hover:ring-2 hover:ring-ring/30 transition-all"
                style={{ background: textColor }}
              >
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => updateAppearance("textColor", e.target.value)}
                  className="opacity-0 w-full h-full cursor-pointer"
                />
              </label>
              <Input
                value={textColor}
                onChange={(e) => updateAppearance("textColor", e.target.value)}
                placeholder="#111827"
                className="h-10 font-mono text-sm uppercase flex-1"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </FieldRow>

          <FieldRow label="Position">
            <Select
              value={formData.appearance.position}
              onValueChange={(v) =>
                updateAppearance("position", v as CreateWidgetData["appearance"]["position"])
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        <FieldRow label="Launcher Text" htmlFor="launcherText">
          <Input
            id="launcherText"
            value={formData.appearance.launcherText}
            onChange={(e) => updateAppearance("launcherText", e.target.value)}
            placeholder="Chat with us"
            className="h-10"
          />
        </FieldRow>

        <FieldRow label="Welcome Message" htmlFor="welcomeMessage">
          <Textarea
            id="welcomeMessage"
            value={formData.appearance.welcomeMessage}
            onChange={(e) => updateAppearance("welcomeMessage", e.target.value)}
            placeholder="Hi there! How can we help you today?"
            className="min-h-[96px] resize-none text-sm"
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
          <ToggleCard
            icon={Timer}
            label="Auto-assign conversations"
            description="Automatically route incoming chats to available agents."
            checked={formData.ai.autoAssign}
            onCheckedChange={(v) => updateAi("autoAssign", v)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <FieldRow label="AI Model" htmlFor="aiModel">
            <Select
              value={formData.ai.model}
              onValueChange={(v) => updateAi("model", v)}
            >
              <SelectTrigger id="aiModel" className="h-10">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    GPT-4o mini
                    <Badge variant="secondary" className="text-xs ml-auto">Fast</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4.1-mini">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    GPT-4.1 mini
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4.1">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    GPT-4.1
                    <Badge variant="secondary" className="text-xs ml-auto">Powerful</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4o">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    GPT-4o
                    <Badge variant="secondary" className="text-xs ml-auto">Best</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Assignment Strategy">
            <Select
              value={formData.ai.assignmentStrategy}
              onValueChange={(v) =>
                updateAi("assignmentStrategy", v as CreateWidgetData["ai"]["assignmentStrategy"])
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Round Robin</SelectItem>
                <SelectItem value="least-loaded">Least Loaded</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
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
            icon={Timer}
            label="Auto-open on load"
            description="Widget opens automatically when a visitor lands on the page."
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
        </div>

        {/* Summary pill row */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { label: "Auto-open", active: formData.behavior.autoOpen },
            { label: "Mobile", active: formData.behavior.showOnMobile },
            { label: "Desktop", active: formData.behavior.showOnDesktop },
          ].map(({ label, active }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "border-primary/40 bg-primary/8 text-primary"
                  : "border-border/60 bg-muted text-muted-foreground line-through"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              {label}
            </span>
          ))}
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
            icon={Paperclip}
            label="File & media attachments"
            description="Allow visitors to send images, documents, and other files."
            checked={formData.features.acceptMediaFiles}
            onCheckedChange={(v) => updateFeatures("acceptMediaFiles", v)}
          />
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

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import {
  Bot,
  Brush,
  LayoutPanelLeft,
  MessageSquareText,
  Settings2,
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

interface WidgetAdvancedConfigFormProps {
  formData: CreateWidgetData;
  onChange: (next: CreateWidgetData) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}

interface ConfigSectionProps {
  title: string;
  subtitle: string;
  icon: ComponentType<LucideProps>;
  className?: string;
  children: ReactNode;
}

function ConfigSection({
  title,
  subtitle,
  icon: Icon,
  className = "",
  children,
}: ConfigSectionProps) {
  return (
    <section
      className={`rounded-xl border border-border/80 bg-background/60 p-5 space-y-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-card/70 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
          checked ? "border-primary/70 bg-primary/90" : "border-border bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function WidgetAdvancedConfigForm({
  formData,
  onChange,
}: WidgetAdvancedConfigFormProps) {
  const textColor = formData.appearance.textColor || "#111827";

  const updateAppearance = (
    field: keyof CreateWidgetData["appearance"],
    value: string,
  ) => {
    onChange({
      ...formData,
      appearance: {
        ...formData.appearance,
        [field]: value,
      },
    });
  };

  const updateBehavior = (
    field: keyof CreateWidgetData["behavior"],
    value: boolean,
  ) => {
    onChange({
      ...formData,
      behavior: {
        ...formData.behavior,
        [field]: value,
      },
    });
  };

  const updateAi = (
    field: keyof CreateWidgetData["ai"],
    value: boolean | string,
  ) => {
    onChange({
      ...formData,
      ai: {
        ...formData.ai,
        [field]: value,
      },
    });
  };

  const updateCollectUserInfo = (
    field: keyof CreateWidgetData["conversation"]["collectUserInfo"],
    value: boolean,
  ) => {
    onChange({
      ...formData,
      conversation: {
        ...formData.conversation,
        collectUserInfo: {
          ...formData.conversation.collectUserInfo,
          [field]: value,
        },
      },
    });
  };

  const updateFeatures = (
    field: keyof CreateWidgetData["features"],
    value: boolean,
  ) => {
    onChange({
      ...formData,
      features: {
        ...formData.features,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
          <Settings2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Advanced Widget Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Full-width layout for appearance, behavior, AI, conversation, and feature controls.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <ConfigSection
          title="Appearance"
          subtitle="Launcher look, welcome copy, and placement."
          icon={Brush}
          className="xl:col-span-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => updateAppearance("textColor", e.target.value)}
                  className="h-11 w-14 rounded-xl p-1 cursor-pointer"
                />
                <Input
                  value={textColor}
                  onChange={(e) => updateAppearance("textColor", e.target.value)}
                  placeholder="#111827"
                  className="h-11 rounded-xl font-mono uppercase"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={formData.appearance.position}
                onValueChange={(value) =>
                  updateAppearance(
                    "position",
                    value as CreateWidgetData["appearance"]["position"],
                  )
                }
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="launcherText">Launcher Text</Label>
              <Input
                id="launcherText"
                value={formData.appearance.launcherText}
                onChange={(e) => updateAppearance("launcherText", e.target.value)}
                placeholder="Chat with us"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                value={formData.appearance.welcomeMessage}
                onChange={(e) => updateAppearance("welcomeMessage", e.target.value)}
                placeholder="Hi there! How can we help you today?"
                className="min-h-[92px] rounded-xl"
              />
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          title="AI"
          subtitle="Model setup and assignment strategy."
          icon={Bot}
          className="xl:col-span-6"
        >
          <div className="space-y-3">
            <ToggleRow
              label="Enable AI"
              description="Allow AI-generated responses."
              checked={formData.ai.enabled}
              onCheckedChange={(next) => updateAi("enabled", next)}
            />
            <ToggleRow
              label="Fallback to agent"
              description="Escalate to humans when needed."
              checked={formData.ai.fallbackToAgent}
              onCheckedChange={(next) => updateAi("fallbackToAgent", next)}
            />
            <ToggleRow
              label="Auto assign"
              description="Automatically route conversations."
              checked={formData.ai.autoAssign}
              onCheckedChange={(next) => updateAi("autoAssign", next)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="aiModel">Model</Label>
              <Select
                value={formData.ai.model}
                onValueChange={(value) => updateAi("model", value)}
              >
                <SelectTrigger id="aiModel" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignment Strategy</Label>
              <Select
                value={formData.ai.assignmentStrategy}
                onValueChange={(value) =>
                  updateAi(
                    "assignmentStrategy",
                    value as CreateWidgetData["ai"]["assignmentStrategy"],
                  )
                }
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin</SelectItem>
                  <SelectItem value="least-loaded">Least Loaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigSection>

          <ConfigSection
            title="Behavior"
            subtitle="Visibility and auto-open controls."
            icon={LayoutPanelLeft}
            className="xl:col-span-4"
          >
            <div className="space-y-3">
              <ToggleRow
                label="Auto-open widget"
                description="Open chat automatically on load."
                checked={formData.behavior.autoOpen}
                onCheckedChange={(next) => updateBehavior("autoOpen", next)}
              />
              <ToggleRow
                label="Show on mobile"
                description="Enable widget on small screens."
                checked={formData.behavior.showOnMobile}
                onCheckedChange={(next) => updateBehavior("showOnMobile", next)}
              />
              <ToggleRow
                label="Show on desktop"
                description="Enable widget on larger screens."
                checked={formData.behavior.showOnDesktop}
                onCheckedChange={(next) => updateBehavior("showOnDesktop", next)}
              />
            </div>
          </ConfigSection>

          <ConfigSection
            title="Conversation"
            subtitle="Visitor data collection before chat."
            icon={MessageSquareText}
            className="xl:col-span-4"
          >
            <div className="space-y-3">
              <ToggleRow
                label="Collect name"
                description="Ask for visitor name."
                checked={formData.conversation.collectUserInfo.name}
                onCheckedChange={(next) => updateCollectUserInfo("name", next)}
              />
              <ToggleRow
                label="Collect email"
                description="Ask for visitor email."
                checked={formData.conversation.collectUserInfo.email}
                onCheckedChange={(next) => updateCollectUserInfo("email", next)}
              />
              <ToggleRow
                label="Collect phone"
                description="Ask for visitor phone number."
                checked={!!formData.conversation.collectUserInfo.phone}
                onCheckedChange={(next) => updateCollectUserInfo("phone", next)}
              />
            </div>
          </ConfigSection>

          <ConfigSection
            title="Features"
            subtitle="Attachments and host page access."
            icon={Settings2}
            className="xl:col-span-4"
          >
            <div className="space-y-3">
              <ToggleRow
                label="Accept media files"
                description="Allow file and image attachments."
                checked={formData.features.acceptMediaFiles}
                onCheckedChange={(next) => updateFeatures("acceptMediaFiles", next)}
              />
              <ToggleRow
                label="End user DOM access"
                description="Allow host-page DOM level integrations."
                checked={formData.features.endUserDomAccess}
                onCheckedChange={(next) => updateFeatures("endUserDomAccess", next)}
              />
            </div>
          </ConfigSection>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { useSaveWidget, useWidget } from "@/domains/widget/hooks";
import type { CreateWidgetData } from "@/domains/widget/types";
import { validateWidgetForm } from "@/shared/lib/validation";
import { toast } from "sonner";
import { Loader } from "@/shared/ui/loader";
import { authApi } from "@/domains/auth/api/auth.api";
import { apiClient } from "@/shared/lib/api-client";
import {
  WidgetActionsPanel,
  WidgetAdvancedConfigForm,
  WidgetAppearanceForm,
  WidgetHeader,
  WidgetInstallationCode,
  WidgetSuggestionsForm,
} from "@/domains/widget/components";

const CDN_URL =
  import.meta.env.VITE_WIDGET_URL ||
  "http://localhost:9001/interaone-widget/v1/InteraOne.js";

const DEFAULT_WIDGET_FORM_DATA: CreateWidgetData = {
  displayName: "",
  appearance: {
    theme: "dark",
    welcomeMessage: "Need help? Ask here and we’ll point you in the right direction.",
    pattern: "aurora",
  },
  behavior: {
    showWidget: true,
    showOnlyOnSelectedPages: false,
    allowedPageRules: [],
    autoOpen: false,
    showOnMobile: true,
    showOnDesktop: true,
  },
  ai: {
    enabled: true,
    model: "gpt-4o-mini",
    fallbackToAgent: true,
  },
  conversation: {
    collectUserInfo: {
      name: true,
      email: true,
      phone: false,
    },
  },
  features: {
    endUserDomAccess: false,
  },
  suggestions: [
    { text: "Get help with a question", showOutside: true },
    { text: "Learn about services", showOutside: false },
    { text: "Contact support", showOutside: true },
  ],
  verifiedDomains: [],
  verifiedDomain: null,
  domainVerificationToken: null,
  domainVerificationStatus: null,
};

function withWidgetDefaults(data: Partial<CreateWidgetData> | null | undefined): CreateWidgetData {
  if (!data) return { ...DEFAULT_WIDGET_FORM_DATA };

  return {
    ...DEFAULT_WIDGET_FORM_DATA,
    ...data,
    displayName:
      typeof data.displayName === "string"
        ? data.displayName
        : DEFAULT_WIDGET_FORM_DATA.displayName,
    appearance: {
      ...DEFAULT_WIDGET_FORM_DATA.appearance,
      ...data.appearance,
    },
    behavior: {
      ...DEFAULT_WIDGET_FORM_DATA.behavior,
      ...data.behavior,
    },
    ai: {
      ...DEFAULT_WIDGET_FORM_DATA.ai,
      ...data.ai,
    },
    conversation: {
      collectUserInfo: {
        ...DEFAULT_WIDGET_FORM_DATA.conversation.collectUserInfo,
        ...data.conversation?.collectUserInfo,
      },
    },
    features: {
      ...DEFAULT_WIDGET_FORM_DATA.features,
      ...data.features,
    },
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : DEFAULT_WIDGET_FORM_DATA.suggestions,
  };
}

function validatePageRule(value: string): boolean {
  const rule = value.trim();
  if (!rule || /\s/.test(rule)) return false;

  try {
    if (/^https?:\/\//i.test(rule)) {
      const url = new URL(rule);
      return url.protocol === "http:" || url.protocol === "https:";
    }

    if (rule.startsWith("/") && !rule.startsWith("//")) {
      new URL(rule, "https://example.com");
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function WidgetPage() {
  const [isExistingWidget, setIsExistingWidget] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
  }>({});
  const [formData, setFormData] = useState<CreateWidgetData>(
    DEFAULT_WIDGET_FORM_DATA,
  );
  const { data: widgetData, isLoading: isWidgetLoading } = useWidget();
  const saveWidget = useSaveWidget();

  useEffect(() => {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) return;

    const checkBillingStatus = async () => {
      try {
        const [orgRes, usageRes] = await Promise.allSettled([
          apiClient.get<any>(`/organizations/${orgId}`),
          apiClient.get<any>(`/organizations/${orgId}/billing/usage?t=${Date.now()}`),
        ]);

        if (orgRes.status === "fulfilled" && orgRes.value?.data?.organization) {
          const org = orgRes.value.data.organization;
          const isExpired = org?.subscriptionStatus !== null &&
            org?.subscriptionStatus !== undefined &&
            org?.subscriptionStatus !== "active";
          setIsSubscriptionExpired(isExpired);
        }

        if (usageRes.status === "fulfilled" && usageRes.value?.data?.usage?.messages) {
          const msgUsage = usageRes.value.data.usage.messages;
          if (msgUsage.limit !== null && msgUsage.used >= msgUsage.limit) {
            setIsQuotaExhausted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load widget page billing details:", err);
      }
    };

    void checkBillingStatus();
  }, []);

  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData((prev: CreateWidgetData) => ({
      ...prev,
      [field]: value,
    }));

    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  useEffect(() => {
    if (!widgetData?._id) return;
    setFormData(withWidgetDefaults(widgetData));
    setIsExistingWidget(true);
  }, [widgetData]);

  useEffect(() => {
    if (isSubscriptionExpired || isQuotaExhausted) {
      setFormData((prev) => ({
        ...prev,
        ai: { ...prev.ai, enabled: false },
      }));
    }
  }, [isSubscriptionExpired, isQuotaExhausted]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    const normalizedDisplayName = formData.displayName.trim();
    const validation = validateWidgetForm(
      normalizedDisplayName,
    );

    if (!validation.isValid) {
      const errors: { displayName?: string } = {};
      validation.errors.forEach((error) => {
        if (error.field === "displayName") {
          errors[error.field] = error.message;
        }
      });
      setValidationErrors(errors);
      toast.error(validation.errors[0]?.message || "Please fix the validation errors");
      return;
    }

    if (formData.behavior.showOnlyOnSelectedPages) {
      const rules = (formData.behavior.allowedPageRules || []).map((rule: string) =>
        rule.trim(),
      ).filter(Boolean);
      if (rules.some((rule: string) => !validatePageRule(rule))) {
        toast.error("Fix invalid hidden page URL or path");
        return;
      }
    }

    setValidationErrors({});

    try {
      const behavior = {
        ...formData.behavior,
        allowedPageRules: Array.from(
          new Set((formData.behavior.allowedPageRules || []).map((rule: string) => rule.trim())),
        ).filter(Boolean),
      };
      const widgetData = {
        displayName: normalizedDisplayName,
        appearance: formData.appearance,
        behavior,
        ai: formData.ai,
        conversation: formData.conversation,
        features: formData.features,
        suggestions: formData.suggestions,
      };

      const response = await saveWidget.mutateAsync({
        data: widgetData,
        isExisting: isExistingWidget,
      });

      if (response.success) {
        toast.success(
          isExistingWidget
            ? "Widget updated successfully!"
            : "Widget created successfully!",
        );

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(
          isExistingWidget ? "Failed to update widget" : "Failed to create widget",
        );
      }
    } catch (error) {
      console.error("Error saving widget:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save widget");
    } finally {
      // Mutation handles isPending state.
    }
  };

  const handleCopyInstallCode = () => {
    const publicKey = isExistingWidget ? formData._id : "your-widget-key";
    const code = `<script src="${CDN_URL}" data-InteraOne-public-key="${publicKey}" async></script>`;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_WIDGET_FORM_DATA);
    setIsExistingWidget(false);
  };

  if (isWidgetLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WidgetHeader
        title="Widget Configuration"
        subtitle="Customize your chat widget to match your brand"
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        {/* Main content column */}
        <main className="min-w-0 space-y-5">
          <div data-tour-id="page-widget-features">
          <WidgetAdvancedConfigForm
            formData={formData}
            onChange={setFormData}
            generalError={validationErrors.displayName}
            isSubscriptionExpired={isSubscriptionExpired}
            isQuotaExhausted={isQuotaExhausted}
            beforeContent={
              <WidgetAppearanceForm
                formData={formData}
                validationErrors={validationErrors}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            }
          />
          </div>

          <section className="space-y-3" data-tour-id="page-widget-features">
            <h2 className="text-base font-semibold text-foreground">Features</h2>
            <WidgetSuggestionsForm
              suggestions={formData.suggestions}
              onChange={(suggestions) => setFormData((prev: CreateWidgetData) => ({ ...prev, suggestions }))}
            />
          </section>
        </main>

        {/* Sticky sidebar column */}
        <aside className="xl:sticky xl:top-6" data-tour-id="page-widget-actions">
          <WidgetActionsPanel
            formData={formData}
            isSaving={saveWidget.isPending}
            isExistingWidget={isExistingWidget}
            onSave={() => handleSubmit()}
            onReset={handleResetDefaults}
          />
        </aside>
      </div>

      <WidgetInstallationCode
        isExistingWidget={isExistingWidget}
        widgetId={formData._id}
        cdnUrl={CDN_URL}
        isCopied={isCopied}
        onCopy={handleCopyInstallCode}
      />
    </div>
  );
}

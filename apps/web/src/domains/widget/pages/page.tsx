import { useEffect, useState, type FormEvent } from "react";
import { useSaveWidget, useWidget } from "@/domains/widget/hooks";
import type { CreateWidgetData } from "@/domains/widget/types";
import { validateWidgetForm } from "@/shared/lib/validation";
import { toast } from "sonner";
import { Loader } from "@/shared/ui/loader";
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
    welcomeMessage: "Hi there! How can we help you today?",
  },
  behavior: {
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
  suggestions: [],
};

function withWidgetDefaults(
  data: Partial<CreateWidgetData> | null | undefined,
): CreateWidgetData {
  if (!data) return { ...DEFAULT_WIDGET_FORM_DATA };

  return {
    ...DEFAULT_WIDGET_FORM_DATA,
    ...data,
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
    suggestions: Array.isArray(data.suggestions)
        ? data.suggestions.slice(0, 3).map((suggestion) => ({
          ...suggestion,
          showOutside:
            typeof suggestion.showOutside === "boolean"
              ? suggestion.showOutside
              : suggestion.source === "faq",
          enabled: true,
          source: suggestion.source === "faq" ? "faq" : "manual",
          knowledgeId: suggestion.knowledgeId || "",
        }))
      : DEFAULT_WIDGET_FORM_DATA.suggestions,
  };
}

export function WidgetPage() {
  const [isExistingWidget, setIsExistingWidget] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
  }>({});
  const [formData, setFormData] = useState<CreateWidgetData>(
    DEFAULT_WIDGET_FORM_DATA,
  );
  const { data: widgetData, isLoading: isWidgetLoading } = useWidget();
  const saveWidget = useSaveWidget();

  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData((prev) => ({
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

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    const validation = validateWidgetForm(formData.displayName);

    if (!validation.isValid) {
      const errors: { displayName?: string } = {};
      validation.errors.forEach((error) => {
        if (error.field === "displayName") {
          errors[error.field] = error.message;
        }
      });
      setValidationErrors(errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setValidationErrors({});

    try {
      const widgetData = {
        displayName: formData.displayName,
        appearance: formData.appearance,
        behavior: formData.behavior,
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
          isExistingWidget
            ? "Failed to update widget"
            : "Failed to create widget",
        );
      }
    } catch (error) {
      console.error("Error saving widget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save widget",
      );
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content column */}
        <div className="lg:col-span-8 space-y-6">
          <WidgetAppearanceForm
            formData={formData}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />

          <WidgetAdvancedConfigForm
            formData={formData}
            onChange={setFormData}
          />

          <WidgetSuggestionsForm
            suggestions={formData.suggestions}
            onChange={(suggestions) =>
              setFormData((prev) => ({ ...prev, suggestions }))
            }
          />
        </div>

        {/* Sticky sidebar column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="lg:sticky lg:top-6 space-y-6">
            <WidgetActionsPanel
              isSaving={saveWidget.isPending}
              isExistingWidget={isExistingWidget}
              onSave={() => handleSubmit()}
              onReset={handleResetDefaults}
            />
          </div>
        </div>
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

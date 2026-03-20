import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSaveWidget, useWidget } from "@/domains/widget/hooks";
import type { CreateWidgetData } from "@/domains/widget/types";
import { storageApi } from "@/shared/lib/storage.api";
import { validateWidgetForm } from "@/shared/lib/validation";
import { toast } from "sonner";
import {
  WidgetActionsPanel,
  WidgetAdvancedConfigForm,
  WidgetAppearanceForm,
  WidgetHeader,
  WidgetInstallationCode,
  WidgetProTip,
} from "@/domains/widget/components";

const CDN_URL =
  import.meta.env.VITE_CDN_URL ||
  "http://localhost:9001/voxora-widget/v1/voxora.js";
const API_ROOT =
  (import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1").replace(
    "/api/v1",
    "",
  );

const DEFAULT_WIDGET_FORM_DATA: CreateWidgetData = {
  displayName: "",
  backgroundColor: "#10b981",
  logoUrl: "",
  appearance: {
    primaryColor: "#10b981",
    textColor: "#111827",
    position: "bottom-right",
    launcherText: "Chat with us",
    welcomeMessage: "Hi there! How can we help you today?",
    logoUrl: "",
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
    autoAssign: true,
    assignmentStrategy: "least-loaded",
  },
  conversation: {
    collectUserInfo: {
      name: true,
      email: true,
      phone: false,
    },
  },
  features: {
    acceptMediaFiles: true,
    endUserDomAccess: false,
  },
};

function withWidgetDefaults(data: Partial<CreateWidgetData> | null | undefined): CreateWidgetData {
  if (!data) return { ...DEFAULT_WIDGET_FORM_DATA };

  return {
    ...DEFAULT_WIDGET_FORM_DATA,
    ...data,
    appearance: {
      ...DEFAULT_WIDGET_FORM_DATA.appearance,
      ...data.appearance,
      logoUrl: data.appearance?.logoUrl || data.logoUrl || "",
      primaryColor:
        data.appearance?.primaryColor ||
        data.backgroundColor ||
        DEFAULT_WIDGET_FORM_DATA.appearance.primaryColor,
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
  };
}

export function WidgetPage() {
  const [isExistingWidget, setIsExistingWidget] = useState(false);
  const [existingWidget, setExistingWidget] = useState<CreateWidgetData | null>(
    null,
  );
  const [isCopied, setIsCopied] = useState(false);
  const [uploadedFileKey, setUploadedFileKey] = useState<string>("");
  const [savedLogoUrl, setSavedLogoUrl] = useState<string>("");
  const widgetInitialized = useRef(false);
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    backgroundColor?: string;
  }>({});
  const [formData, setFormData] = useState<CreateWidgetData>(
    DEFAULT_WIDGET_FORM_DATA,
  );
  const { data: widgetData } = useWidget();
  const saveWidget = useSaveWidget();

  useEffect(() => {
    if (!formData._id) return;

    if (widgetInitialized.current) {
      return;
    }

    const existingScript = document.querySelector(
      "script[data-voxora-public-key]",
    );
    const existingButton = document.getElementById("voxora-widget-button");
    const existingIframe = document.getElementById("voxora-widget-iframe");

    existingScript?.remove();
    existingButton?.remove();
    existingIframe?.remove();

    widgetInitialized.current = true;

    const script = document.createElement("script");
    script.src = `${CDN_URL}?v=${Date.now()}`;
    script.setAttribute("data-voxora-public-key", formData._id);
    script.id = "voxora-widget-script";
    document.body.appendChild(script);

    return () => {
      widgetInitialized.current = false;

      const scriptEl = document.getElementById("voxora-widget-script");
      const widgetBtn = document.getElementById("voxora-widget-button");
      const widgetIframe = document.getElementById("voxora-widget-iframe");

      scriptEl?.remove();
      widgetBtn?.remove();
      widgetIframe?.remove();
    };
  }, [formData._id]);

  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      appearance:
        field === "logoUrl"
          ? { ...prev.appearance, logoUrl: value }
          : field === "backgroundColor"
            ? { ...prev.appearance, primaryColor: value }
            : prev.appearance,
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
    setExistingWidget(widgetData);
    setUploadedFileKey(widgetData.logoFileKey || "");
    setSavedLogoUrl(widgetData.logoUrl || "");
    setIsExistingWidget(true);
  }, [widgetData]);

  const handleUploadSuccess = (data: {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
  }) => {
    setUploadedFileKey(data.fileKey);
    setFormData((prev) => ({
      ...prev,
      logoUrl: data.downloadUrl,
      appearance: {
        ...prev.appearance,
        logoUrl: data.downloadUrl,
      },
    }));
    toast.success("Logo uploaded successfully!");
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  const handleFileRemove = () => {
    setUploadedFileKey("");
    setFormData((prev) => ({
      ...prev,
      logoUrl: "",
      appearance: {
        ...prev.appearance,
        logoUrl: "",
      },
    }));
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    const validation = validateWidgetForm(
      formData.displayName,
      formData.backgroundColor,
    );

    if (!validation.isValid) {
      const errors: { displayName?: string; backgroundColor?: string } = {};
      validation.errors.forEach((error) => {
        if (error.field === "displayName" || error.field === "backgroundColor") {
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
        backgroundColor: formData.backgroundColor,
        logoUrl: formData.logoUrl || "",
        appearance: {
          ...formData.appearance,
          logoUrl: formData.logoUrl || formData.appearance.logoUrl || "",
          primaryColor: formData.appearance.primaryColor || formData.backgroundColor,
        },
        behavior: formData.behavior,
        ai: formData.ai,
        conversation: formData.conversation,
        features: formData.features,
      };

      const response = await saveWidget.mutateAsync({
        data: widgetData,
        isExisting: isExistingWidget,
      });

      if (response.success) {
        if (
          isExistingWidget &&
          existingWidget?.logoFileKey &&
          uploadedFileKey &&
          existingWidget.logoFileKey !== uploadedFileKey
        ) {
          try {
            await storageApi.deleteStorageFile(existingWidget.logoFileKey);
          } catch (error) {
            console.error("Error deleting old logo:", error);
          }
        }

        toast.success(
          isExistingWidget
            ? "Widget updated successfully!"
            : "Widget created successfully!",
        );

        setSavedLogoUrl(formData.logoUrl || "");

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
    const code = `<script src="${CDN_URL}" data-voxora-public-key="${publicKey}" async></script>`;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_WIDGET_FORM_DATA);
    setUploadedFileKey("");
    setIsExistingWidget(false);
  };

  return (
    <div className="space-y-6">
      <WidgetHeader
        title="Widget Configuration"
        subtitle="Customize your chat widget to match your brand"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <WidgetAppearanceForm
            formData={formData}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            onFileRemove={handleFileRemove}
            existingWidget={existingWidget}
            savedLogoUrl={savedLogoUrl}
          />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <WidgetActionsPanel
            isSaving={saveWidget.isPending}
            isExistingWidget={isExistingWidget}
            onSave={() => handleSubmit()}
            onReset={handleResetDefaults}
          />
          <WidgetProTip />
        </div>
      </div>

      <WidgetInstallationCode
        isExistingWidget={isExistingWidget}
        widgetId={formData._id}
        cdnUrl={CDN_URL}
        isCopied={isCopied}
        onCopy={handleCopyInstallCode}
      />

      <WidgetAdvancedConfigForm
        formData={formData}
        onChange={setFormData}
      />
    </div>
  );
}

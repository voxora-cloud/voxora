"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { useRouter } from "next/navigation";
import { apiService, CreateWidgetData } from "@/lib/api";
import { Save, Loader2, MessageCircle, Copy, Check } from "lucide-react";
import Image from "next/image";
import { validateWidgetForm } from "@/lib/validation";
import { useAppToast } from "@/lib/hooks/useAppToast";

export default function CreateWidgetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingWidget, setIsExistingWidget] = useState(false);
  const [existingWidget, setExistingWidget] = useState<CreateWidgetData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [uploadedFileKey, setUploadedFileKey] = useState<string>("");
  const [savedLogoUrl, setSavedLogoUrl] = useState<string>("");
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string>("");
  const widgetInitialized = useRef(false);
  const { toastSuccess, toastError } = useAppToast();
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    backgroundColor?: string;
  }>({});
  const [formData, setFormData] = useState<CreateWidgetData>({
    displayName: "",
    backgroundColor: "#ffffff",
    logoUrl: "",
  });

  useEffect(() => {
    // Only load widget if we have a valid widget ID
    if (!formData._id) return;
    
    // Prevent double initialization in React Strict Mode
    if (widgetInitialized.current) {
      console.log('Widget already initialized, skipping');
      return;
    }

    // Clean up any existing widget elements first
    const existingScript = document.querySelector('script[data-voxora-public-key]');
    const existingButton = document.getElementById('voxora-widget-button');
    const existingIframe = document.getElementById('voxora-widget-iframe');
    
    existingScript?.remove();
    existingButton?.remove();
    existingIframe?.remove();

    widgetInitialized.current = true;

    const script = document.createElement("script");
    script.src =
      process.env.NEXT_PUBLIC_CDN_URL ||
      "http://localhost:9001/voxora-widget/v1/voxora.js?v=2";
    script.setAttribute("data-voxora-public-key", formData._id);
    script.setAttribute("data-voxora-env", process.env.NEXT_PUBLIC_ENV || "dev");
    script.id = "voxora-widget-script";
    document.body.appendChild(script);

    // Cleanup: remove script and widget elements when component unmounts
    return () => {
      widgetInitialized.current = false;
      
      const scriptEl = document.getElementById('voxora-widget-script');
      const widgetBtn = document.getElementById('voxora-widget-button');
      const widgetIframe = document.getElementById('voxora-widget-iframe');
      
      scriptEl?.remove();
      widgetBtn?.remove();
      widgetIframe?.remove();
      
      console.log('Widget cleanup completed');
    };
  }, [formData._id]);
  // Handle input changes
  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const getWidget = async () => {
    try {
      const response = await apiService.getWidget();
      if (response.success) {
        setFormData(response.data);
        setExistingWidget(response.data); // Store existing widget data
        
        // Use fileKey from response (backend already normalizes this)
        const fileKey = response.data.fileKey || response.data.logoFileKey || response.data.logoUrl;
        
        setUploadedFileKey(fileKey || ""); // Store existing file key
        
        // If there's a fileKey, get presigned download URL
        if (fileKey) {
          try {
            const downloadUrlResponse = await apiService.generatePresignedDownloadUrl(
              fileKey,
              900 // 15 minutes expiry
            );
            if (downloadUrlResponse.success) {
              setSavedLogoUrl(downloadUrlResponse.data.downloadUrl);
              setPreviewLogoUrl(downloadUrlResponse.data.downloadUrl);
            }
          } catch (error) {
            console.error("Error getting presigned download URL:", error);
            // Fallback to stored logoUrl if presigned URL fails
            setSavedLogoUrl(response.data.logoUrl || "");
            setPreviewLogoUrl(response.data.logoUrl || "");
          }
        } else {
          setSavedLogoUrl(response.data.logoUrl || "");
          setPreviewLogoUrl(response.data.logoUrl || "");
        }
        
        setIsExistingWidget(true);
      } else {
        toastError("Failed to load widget data");
      }
    } catch (error) {
      console.error("Error fetching widget data:", error);
      toastError(error instanceof Error ? error.message : "Failed to load widget data");
    }
  };

  useEffect(() => {
    getWidget();
  }, []);

  // Handle file upload success
  const handleUploadSuccess = (data: {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
  }) => {
    setUploadedFileKey(data.fileKey);
    handleInputChange("logoUrl", data.downloadUrl);
    setPreviewLogoUrl(data.downloadUrl); // Update preview with new upload
    toastSuccess("Logo uploaded successfully!");
  };

  // Handle file upload error
  const handleUploadError = (error: string) => {
    toastError(error);
  };

  // Handle file removal
  const handleFileRemove = () => {
    setUploadedFileKey("");
    handleInputChange("logoUrl", "");
    setPreviewLogoUrl(""); // Clear preview
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateWidgetForm(
      formData.displayName,
      formData.backgroundColor
    );

    if (!validation.isValid) {
      const errors: { displayName?: string; backgroundColor?: string } = {};
      validation.errors.forEach((error) => {
        if (error.field === "displayName" || error.field === "backgroundColor") {
          errors[error.field] = error.message;
        }
      });
      setValidationErrors(errors);
      toastError("Please fix the validation errors");
      return;
    }

    setIsLoading(true);
    setValidationErrors({});

    try {
      // Prepare widget data
      const widgetData = {
        displayName: formData.displayName,
        backgroundColor: formData.backgroundColor,
        logoUrl: formData.logoUrl || existingWidget?.logoUrl || "",
        logoFileKey: uploadedFileKey || existingWidget?.logoFileKey || "",
      };

      const response = isExistingWidget
        ? await apiService.updateWidget(widgetData)
        : await apiService.createWidget(widgetData);

      if (response.success) {
        // If updating and there was an old logo, delete it
        if (isExistingWidget && existingWidget?.logoFileKey && uploadedFileKey && existingWidget.logoFileKey !== uploadedFileKey) {
          try {
            await apiService.deleteStorageFile(existingWidget.logoFileKey);
          } catch (error) {
            console.error("Error deleting old logo:", error);
          }
        }

        toastSuccess(
          isExistingWidget ? "Widget updated successfully!" : "Widget created successfully!"
        );

        // Update saved logo preview only after successful save
        setSavedLogoUrl(previewLogoUrl);

        // Reload to see the updated widget
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toastError(
          isExistingWidget ? "Failed to update widget" : "Failed to create widget"
        );
      }
    } catch (error) {
      console.error("Error saving widget:", error);
      toastError(error instanceof Error ? error.message : "Failed to save widget");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />

      {/* Header Section */}
      <div className="relative border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Widget Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Customize your chat widget to match your brand
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Live Preview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Configuration Form */}
          <div className="lg:col-span-8 space-y-6">
            {/* Configuration Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl overflow-hidden">
              <div className="p-6 lg:p-8">
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Brand Name */}
                  <div className="space-y-3">
                    <Label htmlFor="displayName" className="text-sm font-medium text-foreground/90">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Acme Support"
                      value={formData.displayName}
                      onChange={(e) =>
                        handleInputChange("displayName", e.target.value)
                      }
                      className={`h-12 rounded-xl border-white/10 bg-white/5 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-text ${
                        validationErrors.displayName ? "border-red-500/50" : ""
                      }`}
                      required
                    />
                    {validationErrors.displayName && (
                      <p className="text-xs text-red-500">
                        {validationErrors.displayName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Shown in the widget header
                    </p>
                  </div>

                  {/* Brand Color */}
                  <div className="space-y-3">
                    <Label htmlFor="backgroundColor" className="text-sm font-medium text-foreground/90">
                      Brand Color
                    </Label>

                    <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm space-y-4">
                      {/* Color Preview */}
                      <div className="flex items-center gap-4">
                        <div
                          className="w-20 h-20 rounded-xl border-2 border-white/20 shadow-lg transition-transform hover:scale-105"
                          style={{ backgroundColor: formData.backgroundColor }}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="text-sm font-medium">Primary Color</div>
                          <div className="text-xs text-muted-foreground">
                            Used for buttons, links, and accents
                          </div>
                        </div>
                      </div>

                      {/* Color Inputs */}
                      <div className="flex gap-3 items-center">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) =>
                            handleInputChange("backgroundColor", e.target.value)
                          }
                          className="w-14 h-14 rounded-lg cursor-pointer border-white/20 p-1"
                          required
                        />

                        <Input
                          value={formData.backgroundColor}
                          onChange={(e) =>
                            handleInputChange("backgroundColor", e.target.value)
                          }
                          placeholder="#10b981"
                          className={`flex-1 h-14 rounded-xl font-mono uppercase border-white/10 bg-black/40 backdrop-blur-sm cursor-text ${
                            validationErrors.backgroundColor ? "border-red-500/50" : ""
                          }`}
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>

                      {validationErrors.backgroundColor && (
                        <p className="text-xs text-red-500">
                          {validationErrors.backgroundColor}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="logoUrl" className="text-sm font-medium text-foreground/90">
                      Brand Logo
                    </Label>

                    <FileUpload
                      accept="image/*"
                      maxSize={2 * 1024 * 1024} // 2MB
                      validate={(file) => {
                        if (!file.type.startsWith('image/')) {
                          return "Please select an image file";
                        }
                        return null;
                      }}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                      onRemove={handleFileRemove}
                      initialPreview={previewLogoUrl}
                      initialFileName={existingWidget?.logoUrl ? "Current Logo" : undefined}
                      showPreview={true}
                      buttonText="Choose from Device"
                      buttonVariant="outline"
                      helperText="Upload from your device (PNG, JPG, SVG - Max 2MB)"
                    />

                    {/* Logo preview — shows placeholder when empty, actual logo when uploaded */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="w-16 h-16 rounded-xl border border-white/20 overflow-hidden flex items-center justify-center bg-black/30 flex-shrink-0">
                        {savedLogoUrl ? (
                          <Image
                            src={savedLogoUrl}
                            alt="Current logo"
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {savedLogoUrl ? "Current Logo" : "No Logo Set"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {savedLogoUrl 
                            ? "This logo will appear in your chat widget" 
                            : "Upload a logo to display in your chat widget"}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Square format recommended, minimum 64x64px
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Integration Code Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl overflow-hidden">
              <div className="p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Installation Code</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add this snippet before the closing <span className="font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">&lt;/body&gt;</span> tag
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer rounded-lg border-white/10 hover:bg-white/5 transition-all w-full sm:w-auto"
                    onClick={() => {
                      const code = `<script src="${process.env.NEXT_PUBLIC_CDN_URL}" data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}" data-voxora-env="${process.env.NEXT_PUBLIC_ENV}" async></script>`;
                      navigator.clipboard.writeText(code);
                      setIsCopied(true);
                      toastSuccess("Code copied to clipboard!");
                      setTimeout(() => {
                        setIsCopied(false);
                      }, 2000);
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4 sm:mr-2 text-primary" />
                        <span className="hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Copy Code</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="relative bg-white rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                      <span className="text-xs text-muted-foreground font-bold">HTML</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                      </div>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm leading-relaxed text-black font-bold font-mono">
                        {`<script 
  src="${process.env.NEXT_PUBLIC_CDN_URL}" 
  data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}"
  data-voxora-env="${process.env.NEXT_PUBLIC_ENV}"
  async>
</script>`}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/5">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="text-primary">📋</span>
                    Integration Steps
                  </h4>
                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">1.</span>
                      <span>Copy the code snippet above</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">2.</span>
                      <span>Paste it into your website's HTML, just before the closing <span className="font-mono bg-white/5 px-1 rounded">&lt;/body&gt;</span> tag</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">3.</span>
                      <span>Save and publish your changes</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-semibold">4.</span>
                      <span>The chat widget will appear automatically on your site</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Features & Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Action Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl overflow-hidden">
              <div className="p-6 space-y-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 cursor-pointer transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isExistingWidget ? "Update Configuration" : "Create Widget"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Features Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Features
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Real-time messaging with instant notifications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Agent status indicators</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Mobile responsive design</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Customizable branding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Contact form collection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">Lightning-fast performance</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Info Card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl p-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold">💡</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Pro Tip</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a brand color that complements your website's design for seamless integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

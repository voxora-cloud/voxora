"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { apiService, CreateWidgetData } from "@/lib/api";
import { Save, Loader2, X, MessageCircle, Copy } from "lucide-react";

export default function CreateWidgetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingWidget, setIsExistingWidget] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [formData, setFormData] = useState<CreateWidgetData>({
    displayName: "",
    backgroundColor: "#ffffff",
    logoUrl: "",
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      process.env.NEXT_PUBLIC_CDN_URL ||
      "http://localhost:3002/widget-loader.js";
    script.setAttribute(
      "data-voxora-public-key",
      formData._id ? formData._id : "will-be-generated",
    );
    script.setAttribute("data-voxora-env", process.env.NEXT_PUBLIC_ENV || "dev");
    document.body.appendChild(script);
  }, [formData._id]);
  // Handle input changes
  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getWidget = async () => {
    try {
      const response = await apiService.getWidget();
      if (response.success) {
        setFormData(response.data);
        setIsExistingWidget(true);
      } else {
        setMessage({ type: "error", text: "Failed to load widget data" });
      }
    } catch (error) {
      console.error("Error fetching widget data:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to load widget data",
      });
    }
  };

  useEffect(() => {
    getWidget();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      setMessage({ type: "error", text: "Display name is required" });
      return;
    }

    if (!formData.backgroundColor.trim()) {
      setMessage({ type: "error", text: "Background color is required" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = isExistingWidget
        ? await apiService.updateWidget(formData)
        : await apiService.createWidget(formData);

      if (response.success) {
        setMessage({
          type: "success",
          text: isExistingWidget
            ? "Widget updated successfully!"
            : "Widget created successfully!",
        });
        setTimeout(() => {
          router.push("/admin/widget"); // Redirect to widgets list page
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: isExistingWidget
            ? "Failed to update widget"
            : "Failed to create widget",
        });
      }
    } catch (error) {
      console.error("Error saving widget:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save widget",
      });
    } finally {
      setIsLoading(false);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />
      
      {/* Header Section */}
      <div className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl">
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
        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border backdrop-blur-sm ${
              message.type === "success"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${
                message.type === "success" ? "bg-primary" : "bg-red-500"
              }`} />
              {message.text}
            </div>
          </div>
        )}

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
                      className="h-12 rounded-xl border-white/10 bg-white/5 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-text"
                      required
                    />
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
                          className="flex-1 h-14 rounded-xl font-mono uppercase border-white/10 bg-black/40 backdrop-blur-sm cursor-text"
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div className="space-y-3">
                    <Label htmlFor="logoUrl" className="text-sm font-medium text-foreground/90">
                      Brand Logo
                    </Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        handleInputChange("logoUrl", e.target.value)
                      }
                      className="h-12 rounded-xl border-white/10 bg-white/5 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-text"
                    />
                    {formData.logoUrl && (
                      <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                            <img 
                              src={formData.logoUrl} 
                              alt="Logo preview" 
                              width={32} 
                              height={32}
                              className="rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Logo Preview</div>
                            <div className="text-xs text-muted-foreground">64x64px recommended</div>
                          </div>
                        </div>
                      </div>
                    )}
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Installation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add this snippet before the closing &lt;/body&gt; tag
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer rounded-lg border-white/10 hover:bg-white/5"
                    onClick={() => {
                      const code = `<script src="${process.env.NEXT_PUBLIC_CDN_URL}" 
        data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}"
        data-voxora-env="${process.env.NEXT_PUBLIC_ENV}"></script>`;
                      navigator.clipboard.writeText(code);
                      setMessage({ type: "success", text: "Code copied to clipboard!" });
                      setTimeout(() => setMessage(null), 2000);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="relative group">
                  <code className="block text-xs leading-relaxed bg-black/60 text-primary/80 p-6 rounded-xl font-mono border border-white/5">
                    {`<script src="${process.env.NEXT_PUBLIC_CDN_URL}" 
        data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}"
        data-voxora-env="${process.env.NEXT_PUBLIC_ENV}"></script>`}
                  </code>
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

                {isExistingWidget && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      setFormData({
                        displayName: "",
                        backgroundColor: "#10b981",
                        logoUrl: "",
                      });
                      setIsExistingWidget(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reset to Defaults
                  </Button>
                )}
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

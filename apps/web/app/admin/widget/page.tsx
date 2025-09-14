"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { apiService, CreateWidgetData } from "@/lib/api";
import Image from "next/image";
import { Save, Loader2, X, MessageCircle } from "lucide-react";
import { Copy } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Widget Configuration
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Customize your chat widget appearance and configure visitor
            experience
          </p>
        </div>
      </div>

      {/* Full Width Configuration Panel */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Widget Settings
            </h2>
            <p className="text-gray-600">
              Configure how your widget appears to visitors on your website
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`mb-8 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Display Name */}
                <div className="space-y-3">
                  <Label
                    htmlFor="displayName"
                    className="text-sm font-medium text-gray-900"
                  >
                    Brand Name *
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g., Acme Support, Customer Care"
                    value={formData.displayName}
                    onChange={(e) =>
                      handleInputChange("displayName", e.target.value)
                    }
                    className="h-12 text-base"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    This name will appear in the widget header
                  </p>
                </div>

                {/* Background Color */}
                <div className="space-y-3">
                  <Label
                    htmlFor="backgroundColor"
                    className="text-sm font-medium text-gray-900"
                  >
                    Brand Color *
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) =>
                        handleInputChange("backgroundColor", e.target.value)
                      }
                      className="w-16 h-12 rounded-lg border cursor-pointer"
                      required
                    />
                    <Input
                      type="text"
                      placeholder="#6366f1"
                      value={formData.backgroundColor}
                      onChange={(e) =>
                        handleInputChange("backgroundColor", e.target.value)
                      }
                      className="flex-1 h-12 text-base"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Primary color for buttons and highlights
                  </p>
                </div>

                {/* Logo URL */}
                <div className="space-y-3">
                  <Label
                    htmlFor="logoUrl"
                    className="text-sm font-medium text-gray-900"
                  >
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
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-gray-500">
                    Logo URL (recommended: square format, 64x64px minimum)
                  </p>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-6">
                {/* Widget Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Widget Features:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Contact form collection</li>
                    <li>• Real-time messaging</li>
                    <li>• Agent status indicators</li>
                    <li>• Mobile responsive design</li>
                    <li>• Customizable branding</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 pt-8 border-t border-gray-200">
              <div className="flex gap-4 justify-center">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 h-12 text-base font-medium"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      {isExistingWidget ? "Update Widget" : "Create Widget"}
                    </>
                  )}
                </Button>

                {isExistingWidget && (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-8 h-12 text-base"
                    size="lg"
                    onClick={() => {
                      setFormData({
                        displayName: "",
                        backgroundColor: "#6366f1",
                        logoUrl: "",
                      });
                      setIsExistingWidget(false);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Integration Instructions */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Integration Code
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Add this code to your website to enable the chat widget:
              </p>
              <div className="relative">
                <code className="block text-sm bg-gray-800 text-green-400 p-4 rounded-lg font-mono overflow-x-auto">
                  {`<script src="${process.env.NEXT_PUBLIC_CDN_URL}" 
        data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}"
        data-voxora-env="${process.env.NEXT_PUBLIC_ENV}"></script>`}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-gray-700 text-gray-400 hover:text-white"
                  onClick={() => {
                    const code = `<script src="${process.env.NEXT_PUBLIC_CDN_URL}" 
        data-voxora-public-key="${isExistingWidget ? formData._id : "will-be-generated"}"></script>`;
                    navigator.clipboard.writeText(code);
                    setMessage({ type: "success", text: "Integration code copied to clipboard!" });
                    setTimeout(() => setMessage(null), 2000);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

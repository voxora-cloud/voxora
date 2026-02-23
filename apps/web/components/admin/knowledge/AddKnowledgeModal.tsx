"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Upload,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { AddKnowledgeFormData, KnowledgeSource } from "@/lib/interfaces/knowledge";

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddKnowledgeFormData) => void;
  isSubmitting: boolean;
}

export default function AddKnowledgeModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddKnowledgeModalProps) {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [formData, setFormData] = useState<Partial<AddKnowledgeFormData>>({
    title: "",
    description: "",
    catalog: "",
    content: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCatalog, setShowCustomCatalog] = useState(false);

  // Reset form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSource(null);
      setFormData({ title: "", description: "", catalog: "", content: "" });
      setSelectedFile(null);
      setErrors({});
      setShowCustomCatalog(false);
    }
  }, [isOpen]);

  // Predefined catalog categories
  const catalogCategories = [
    "Product Information",
    "Pricing & Billing",
    "Support & FAQs",
    "Technical Documentation",
    "Policies & Terms",
    "Troubleshooting",
    "Getting Started",
    "API Documentation",
    "Custom",
  ];

  const handleClose = () => {
    setStep(1);
    setSelectedSource(null);
    setFormData({ title: "", description: "", catalog: "", content: "" });
    setSelectedFile(null);
    setErrors({});
    setShowCustomCatalog(false);
    onClose();
  };

  const handleSourceSelect = (source: KnowledgeSource) => {
    setSelectedSource(source);
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ""),
        }));
      }
    }
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (selectedSource === "text" && !formData.content?.trim()) {
      newErrors.content = "Content is required";
    }
    if ((selectedSource === "pdf" || selectedSource === "docx") && !selectedFile) {
      newErrors.file = "Please upload a file";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step === 2) {
      setStep(1);
      setSelectedSource(null);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (!validateStep3() || !selectedSource) return;

    const submitData: AddKnowledgeFormData = {
      title: formData.title!,
      description: formData.description,
      source: selectedSource,
    };

    if (selectedSource === "text") {
      submitData.content = formData.content;
    } else if (selectedSource === "pdf" || selectedSource === "docx") {
      submitData.file = selectedFile!;
    }

    onSubmit(submitData);
  };

  const wordCount = formData.content?.trim().split(/\s+/).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={step === 3 ? "sm:max-w-[860px]" : "sm:max-w-[600px]"}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add Knowledge</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 3
            </p>
          </div>
        </div>

        {/* Step 1: Choose Source Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Choose how you want to add knowledge
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => handleSourceSelect("text")}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Text / Markdown
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Write or paste content directly
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleSourceSelect("pdf")}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Upload File
                  </div>
                  <div className="text-sm text-muted-foreground">
                    PDF or DOCX files supported
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>


            </div>
          </div>
        )}

        {/* Step 2: Content Input */}
        {step === 2 && selectedSource && (
          <div className="space-y-4">
            {selectedSource === "text" && (
              <div>
                <Label className="block mb-2">Content</Label>
                <Textarea
                  value={formData.content || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Enter your content here... (Markdown supported)"
                  className="w-full h-64 cursor-text resize-none"
                />
                {errors.content && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.content}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Markdown formatting supported
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {wordCount} words
                  </p>
                </div>
              </div>
            )}

            {(selectedSource === "pdf" || selectedSource === "docx") && (
              <div>
                <Label className="block mb-2">Upload File</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept={selectedSource === "pdf" ? ".pdf" : ".docx"}
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSource.toUpperCase()} files only
                    </p>
                  </Label>
                </div>
                {selectedFile && (
                  <div className="mt-3 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {selectedFile.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                {errors.file && (
                  <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.file}
                  </p>
                )}
              </div>
            )}



            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleNext} className="cursor-pointer">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Metadata */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Two-column landscape layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Refund Policy"
                    className="cursor-text"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="block mb-2">Description</Label>
                  <Textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Used for support answers..."
                    className="w-full h-24 cursor-text resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Help agents understand when to use this knowledge
                  </p>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted-foreground">Source:</div>
                    <div className="text-foreground uppercase">{selectedSource}</div>
                    {formData.catalog && (
                      <>
                        <div className="text-muted-foreground">Catalog:</div>
                        <div className="text-foreground">{formData.catalog}</div>
                      </>
                    )}
                    {selectedSource === "text" && wordCount > 0 && (
                      <>
                        <div className="text-muted-foreground">Word Count:</div>
                        <div className="text-foreground">{wordCount} words</div>
                      </>
                    )}
                    {selectedFile && (
                      <>
                        <div className="text-muted-foreground">File:</div>
                        <div className="text-foreground truncate">{selectedFile.name}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column — Catalog */}
              <div>
                <Label className="block mb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Catalog / Category
                  </div>
                </Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {catalogCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          if (category === "Custom") {
                            setShowCustomCatalog(true);
                            setFormData((prev) => ({ ...prev, catalog: "" }));
                          } else {
                            setShowCustomCatalog(false);
                            setFormData((prev) => ({ ...prev, catalog: category }));
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          formData.catalog === category && !showCustomCatalog
                            ? "border-primary bg-primary/10 text-primary"
                            : category === "Custom" && showCustomCatalog
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {showCustomCatalog && (
                    <div className="space-y-2">
                      <Input
                        value={formData.catalog || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, catalog: e.target.value }))
                        }
                        placeholder="Enter custom catalog name..."
                        className="cursor-text"
                      />
                      <p className="text-xs text-muted-foreground">
                        Create a custom catalog name for organizing your knowledge
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Organize knowledge into catalogs for easier navigation
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? "Adding..." : "Add Knowledge"}
              </Button>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex gap-2 mt-6">
          <div
            className={`h-1 flex-1 rounded-full ${
              step > 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step > 2 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step > 3 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

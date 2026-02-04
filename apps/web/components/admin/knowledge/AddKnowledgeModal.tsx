"use client";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  FileText,
  Upload,
  Link as LinkIcon,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
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
    content: "",
    url: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUrlPreview, setShowUrlPreview] = useState(false);

  const handleClose = () => {
    setStep(1);
    setSelectedSource(null);
    setFormData({ title: "", description: "", content: "", url: "" });
    setSelectedFile(null);
    setErrors({});
    setShowUrlPreview(false);
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
    if (selectedSource === "url" && !formData.url?.trim()) {
      newErrors.url = "URL is required";
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
    } else if (selectedSource === "url") {
      submitData.url = formData.url;
    }

    onSubmit(submitData);
  };

  const wordCount = formData.content?.trim().split(/\s+/).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add Knowledge</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 3
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
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

              <button
                onClick={() => handleSourceSelect("url")}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Website URL
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Extract content from a webpage
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Enter your content here... (Markdown supported)"
                  className="w-full h-64 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground cursor-text resize-none"
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept={selectedSource === "pdf" ? ".pdf" : ".docx"}
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
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
                  </label>
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

            {selectedSource === "url" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website URL
                </label>
                <Input
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://example.com/docs"
                  className="cursor-text"
                />
                {errors.url && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.url}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlPreview(!showUrlPreview)}
                  className="mt-3 cursor-pointer"
                >
                  {showUrlPreview ? "Hide Preview" : "Preview Content"}
                </Button>
                {showUrlPreview && (
                  <div className="mt-3 p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-xs text-muted-foreground">
                      Preview will be available after URL validation
                    </p>
                  </div>
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-red-500">*</span>
              </label>
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Used for support answers..."
                className="w-full h-20 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground cursor-text resize-none"
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
                {selectedSource === "text" && wordCount > 0 && (
                  <>
                    <div className="text-muted-foreground">Word Count:</div>
                    <div className="text-foreground">{wordCount} words</div>
                  </>
                )}
                {selectedFile && (
                  <>
                    <div className="text-muted-foreground">File:</div>
                    <div className="text-foreground">{selectedFile.name}</div>
                  </>
                )}
                {formData.url && (
                  <>
                    <div className="text-muted-foreground">URL:</div>
                    <div className="text-foreground truncate">{formData.url}</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
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
              step >= 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${
              step >= 3 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

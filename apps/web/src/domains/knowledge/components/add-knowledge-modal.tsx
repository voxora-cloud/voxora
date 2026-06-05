import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FolderOpen,
  HelpCircle,
} from "lucide-react";
import { Label } from "@/shared/ui/label";
import type {
  AddKnowledgeFormData,
  AddKnowledgeSource,
} from "../types";

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddKnowledgeFormData) => Promise<void> | void;
  isSubmitting: boolean;
}

export function AddKnowledgeModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddKnowledgeModalProps) {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<AddKnowledgeSource | null>(
    null,
  );
  const [formData, setFormData] = useState<Partial<AddKnowledgeFormData>>({
    title: "",
    description: "",
    catalog: "",
    content: "",
  });
  const [faqEntries, setFaqEntries] = useState([{ question: "", answer: "" }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCatalog, setShowCustomCatalog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSource(null);
      setFormData({ title: "", description: "", catalog: "", content: "" });
      setFaqEntries([{ question: "", answer: "" }]);
      setSelectedFile(null);
      setErrors({});
      setShowCustomCatalog(false);
    }
  }, [isOpen]);

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
    setFaqEntries([{ question: "", answer: "" }]);
    setSelectedFile(null);
    setErrors({});
    setShowCustomCatalog(false);
    onClose();
  };

  const handleSourceSelect = (source: AddKnowledgeSource) => {
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

  const updateFaqEntry = (
    index: number,
    field: "question" | "answer",
    value: string,
  ) => {
    setFaqEntries((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addFaqEntry = () => {
    setFaqEntries((prev) => [...prev, { question: "", answer: "" }]);
  };

  const removeFaqEntry = (index: number) => {
    setFaqEntries((prev) =>
      prev.length === 1 ? prev : prev.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const getValidFaqEntries = () =>
    faqEntries
      .map((entry) => ({
        question: entry.question.trim(),
        answer: entry.answer.trim(),
      }))
      .filter((entry) => entry.question && entry.answer);

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (selectedSource === "text" && !formData.content?.trim()) {
      newErrors.content = "Content is required";
    }
    if (selectedSource === "faq") {
      const hasCompleteEntry = getValidFaqEntries().length > 0;
      const hasPartialEntry = faqEntries.some(
        (entry) =>
          (entry.question.trim() && !entry.answer.trim()) ||
          (!entry.question.trim() && entry.answer.trim()),
      );

      if (!hasCompleteEntry) {
        newErrors.faqEntries = "Add at least one complete FAQ";
      } else if (hasPartialEntry) {
        newErrors.faqEntries = "Complete or remove partial FAQ rows";
      }
    }
    if ((selectedSource === "pdf" || selectedSource === "docx") && !selectedFile) {
      newErrors.file = "Please upload a file";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (selectedSource !== "faq" && !formData.title?.trim()) {
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

  const handleSubmit = async () => {
    if (!validateStep3() || !selectedSource) return;

    const validFaqEntries = getValidFaqEntries();
    const submitData: AddKnowledgeFormData = {
      title:
        selectedSource === "faq"
          ? validFaqEntries[0]?.question || "FAQ entries"
          : formData.title!,
      description: formData.description,
      catalog: formData.catalog,
      source: selectedSource,
    };

    if (selectedSource === "text") {
      submitData.content = formData.content;
    } else if (selectedSource === "pdf" || selectedSource === "docx") {
      submitData.file = selectedFile!;
    } else if (selectedSource === "faq") {
      submitData.faqEntries = validFaqEntries;
    }

    await onSubmit(submitData);
    handleClose();
  };

  const wordCount = formData.content?.trim().split(/\s+/).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden ${
          step === 3 ? "sm:max-w-[860px]" : "sm:max-w-[600px]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add Knowledge</h2>
            <p className="text-sm text-muted-foreground mt-1">Step {step} of 3</p>
          </div>
        </div>

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
                  <div className="font-medium text-foreground">Text / Markdown</div>
                  <div className="text-sm text-muted-foreground">
                    Write or paste content directly
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleSourceSelect("faq")}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">FAQ Entry</div>
                  <div className="text-sm text-muted-foreground">
                    Create a curated Question & Answer pair
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
                  <div className="font-medium text-foreground">Upload File</div>
                  <div className="text-sm text-muted-foreground">
                    PDF or DOCX files supported
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && selectedSource && (
          <div
            className={
              selectedSource === "faq"
                ? "flex min-h-0 flex-1 flex-col"
                : "min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
            }
          >
            {selectedSource === "faq" && (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                  {faqEntries.map((entry, index) => (
                    <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>FAQ {index + 1}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFaqEntry(index)}
                          disabled={faqEntries.length === 1}
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label className="block mb-2">Question</Label>
                        <Input
                          value={entry.question}
                          onChange={(e) =>
                            updateFaqEntry(index, "question", e.target.value)
                          }
                          placeholder="e.g., What is InteraOne's support email?"
                          className="cursor-text"
                        />
                      </div>

                      <div>
                        <Label className="block mb-2">Answer</Label>
                        <Textarea
                          value={entry.answer}
                          onChange={(e) =>
                            updateFaqEntry(index, "answer", e.target.value)
                          }
                          placeholder="Enter the curated answer for this FAQ..."
                          className="w-full h-28 cursor-text resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {errors.faqEntries && (
                  <p className="shrink-0 pt-3 text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.faqEntries}
                  </p>
                )}

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-4 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFaqEntry}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add FAQ
                  </Button>
                  <div className="flex items-center gap-2">
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
              </>
            )}

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
                  <p className="text-xs text-muted-foreground">{wordCount} words</p>
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

            {selectedSource !== "faq" && (
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
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {selectedSource === "faq" ? (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="text-sm font-medium text-foreground">FAQ Entries</h4>
                      <p className="text-xs text-muted-foreground">
                        {getValidFaqEntries().length} complete FAQs ready to add
                      </p>
                    </div>
                  ) : (
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
                  )}

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
                      {selectedSource === "faq" && (
                        <>
                          <div className="text-muted-foreground">FAQs:</div>
                          <div className="text-foreground">{getValidFaqEntries().length}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

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
            </div>

            <div className="flex shrink-0 justify-between border-t border-border pt-4 mt-4">
              <Button variant="outline" onClick={handleBack} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? "Adding..." : "Add Knowledge"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex shrink-0 gap-2 mt-6">
          <div
            className={`h-1 flex-1 rounded-full ${step > 1 ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${step > 2 ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${step > 3 ? "bg-primary" : "bg-muted"}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ClipboardList, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { authApi } from "@/domains/auth/api/auth.api";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "../hooks";
import type { Template, TemplateInput } from "../types/types";

interface TemplatePickerProps {
  onInsert: (content: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}

const emptyForm: TemplateInput = {
  title: "",
  content: "",
  shortcut: "",
  category: "General",
};

const DEFAULT_TEMPLATE_CATEGORIES = [
  "General",
  "Support",
  "Billing",
  "Sales",
  "Technical",
  "Follow-up",
];

const normalizeShortcut = (value?: string) =>
  (value || "").trim().replace(/^\/+/, "");

const normalizeCategory = (value?: string) => {
  const category = value?.trim();
  return category || "General";
};

export function TemplatePicker({
  onInsert,
  open: controlledOpen,
  onOpenChange,
  compact = false,
}: TemplatePickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [customCategory, setCustomCategory] = useState("");
  const [form, setForm] = useState<TemplateInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const role = authApi.getOrgRole();
  const canManage = role === "admin" || role === "owner";
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean | ((current: boolean) => boolean)) => {
    const resolvedOpen =
      typeof nextOpen === "function" ? nextOpen(open) : nextOpen;

    if (controlledOpen === undefined) {
      setUncontrolledOpen(resolvedOpen);
    }
    onOpenChange?.(resolvedOpen);
  };

  const categories = useMemo(() => {
    const names = new Set<string>(DEFAULT_TEMPLATE_CATEGORIES);
    templates.forEach((template) => {
      names.add(normalizeCategory(template.category));
    });
    return ["All", ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return templates.filter((template) => {
      const category = normalizeCategory(template.category);
      if (categoryFilter !== "All" && category !== categoryFilter) {
        return false;
      }
      if (!normalized) return true;

      return (
        template.title.toLowerCase().includes(normalized) ||
        template.content.toLowerCase().includes(normalized) ||
        template.shortcut?.toLowerCase().includes(normalized)
      );
    });
  }, [categoryFilter, query, templates]);

  const groupedTemplates = useMemo(() => {
    return filteredTemplates.reduce<Record<string, Template[]>>(
      (groups, template) => {
        const category = normalizeCategory(template.category);
        groups[category] = groups[category] || [];
        groups[category].push(template);
        return groups;
      },
      {},
    );
  }, [filteredTemplates]);

  const resetForm = () => {
    setForm(emptyForm);
    setCustomCategory("");
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const submitTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    const payload: TemplateInput = {
      title: form.title.trim(),
      content: form.content.trim(),
      shortcut: normalizeShortcut(form.shortcut),
      category: normalizeCategory(form.category),
    };

    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, data: payload });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync(payload);
        toast.success("Template created");
      }
      resetForm();
      setFormOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Template save failed");
    }
  };

  const startEdit = (template: Template) => {
    setEditingId(template._id);
    setCustomCategory("");
    setForm({
      title: template.title,
      content: template.content,
      shortcut: normalizeShortcut(template.shortcut),
      category: normalizeCategory(template.category),
    });
    setFormOpen(true);
  };

  const applyCustomCategory = () => {
    const category = normalizeCategory(customCategory);
    setForm((current) => ({ ...current, category }));
    setCustomCategory("");
  };

  const removeTemplate = async (template: Template) => {
    if (!window.confirm(`Delete "${template.title}" template?`)) return;

    try {
      await deleteTemplate.mutateAsync(template._id);
      if (editingId === template._id) resetForm();
      toast.success("Template deleted");
    } catch (error: any) {
      toast.error(error?.message || "Template delete failed");
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const canSubmit = form.title.trim() && form.content.trim() && !isSaving;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        title="Templates"
        aria-label="Templates"
      >
        <ClipboardList className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className={`absolute left-0 z-50 overflow-hidden rounded-lg border border-border bg-card shadow-xl ${compact
              ? "bottom-9 w-[min(96vw,42rem)]"
              : "bottom-11 w-[min(96vw,42rem)]"
            }`}
        >
          <div
            className={`border-b border-border bg-muted/20 ${compact ? "p-3" : "p-4"
              }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold">Templates</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {canManage && (
                  <Button type="button" size="sm" onClick={openCreateForm}>
                    <Plus className="h-3.5 w-3.5" />
                    Create Template
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close templates"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search templates"
                className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <div
              className={`flex gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1 ${compact ? "mt-2" : "mt-3"
                }`}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${categoryFilter === category
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  aria-pressed={categoryFilter === category}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`overflow-y-auto ${compact ? "max-h-80 p-2" : "max-h-[28rem] p-3"}`}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No templates found.
              </div>
            ) : (
              Object.entries(groupedTemplates).map(([category, items]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((template) => (
                      <div
                        key={template._id}
                        className="rounded-lg border border-border bg-background p-3 shadow-xs transition-colors hover:bg-muted/30"
                      >
                        <div className="flex h-full flex-col gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer text-left"
                            onClick={() => {
                              onInsert(template.content);
                              setOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {template.title}
                              </span>
                              {template.shortcut && (
                                <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  /{normalizeShortcut(template.shortcut)}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                              {template.content}
                            </p>
                          </button>

                          {canManage && (
                            <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/70 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => startEdit(template)}
                                aria-label={`Edit ${template.title} template`}
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="xs"
                                onClick={() => removeTemplate(template)}
                                aria-label={`Delete ${template.title} template`}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Save a reusable reply with an optional shortcut and category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitTemplate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-title">Title</Label>
                <Input
                  id="template-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Refund follow-up"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-shortcut">Shortcut</Label>
                <div className="flex rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                  <span className="flex h-9 items-center border-r border-border px-3 text-sm text-muted-foreground">
                    /
                  </span>
                  <Input
                    id="template-shortcut"
                    value={form.shortcut}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shortcut: normalizeShortcut(event.target.value),
                      }))
                    }
                    placeholder="refund"
                    className="border-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Selected
                </span>
                <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground">
                  {normalizeCategory(form.category)}
                </span>
              </div>
              <datalist id="template-categories">
                {categories
                  .filter((category) => category !== "All")
                  .map((category) => (
                    <option key={category} value={category} />
                  ))}
              </datalist>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/20 p-1.5">
                {categories
                  .filter((category) => category !== "All")
                  .map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, category }))
                      }
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${normalizeCategory(form.category) === category
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:bg-background hover:text-foreground"
                        }`}
                      aria-pressed={
                        normalizeCategory(form.category) === category
                      }
                    >
                      {category}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="template-custom-category"
                  value={customCategory}
                  list="template-categories"
                  onChange={(event) => setCustomCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && customCategory.trim()) {
                      event.preventDefault();
                      applyCustomCategory();
                    }
                  }}
                  placeholder="Custom category"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCustomCategory}
                  disabled={!customCategory.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">Message</Label>
              <Textarea
                id="template-content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Write the template message..."
                className="min-h-40 resize-y"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                <Plus className="h-3.5 w-3.5" />
                {editingId ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

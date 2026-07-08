import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ClipboardList,
  Edit2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
}

const emptyForm: TemplateInput = {
  title: "",
  content: "",
  shortcut: "",
  category: "General",
};

export function TemplatePicker({ onInsert }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<TemplateInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const role = authApi.getOrgRole();
  const canManage = role === "admin" || role === "owner";

  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return templates;

    return templates.filter((template) => {
      return (
        template.title.toLowerCase().includes(normalized) ||
        template.shortcut?.toLowerCase().includes(normalized)
      );
    });
  }, [query, templates]);

  const groupedTemplates = useMemo(() => {
    return filteredTemplates.reduce<Record<string, Template[]>>(
      (groups, template) => {
        const category = template.category?.trim() || "General";
        groups[category] = groups[category] || [];
        groups[category].push(template);
        return groups;
      },
      {},
    );
  }, [filteredTemplates]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submitTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, data: form });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync(form);
        toast.success("Template created");
      }
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Template save failed");
    }
  };

  const startEdit = (template: Template) => {
    setEditingId(template._id);
    setForm({
      title: template.title,
      content: template.content,
      shortcut: template.shortcut || "",
      category: template.category || "General",
    });
  };

  const removeTemplate = async (template: Template) => {
    try {
      await deleteTemplate.mutateAsync(template._id);
      if (editingId === template._id) resetForm();
      toast.success("Template deleted");
    } catch (error: any) {
      toast.error(error?.message || "Template delete failed");
    }
  };

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
        <div className="absolute bottom-11 left-0 z-40 w-[min(92vw,24rem)] overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          <div className="flex items-center gap-2 border-b border-border p-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
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

          <div className="max-h-72 overflow-y-auto p-2">
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
                  <div className="px-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((template) => (
                      <div
                        key={template._id}
                        className="group flex items-start gap-2 rounded-md p-2 hover:bg-muted/60"
                      >
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
                              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {template.shortcut}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {template.content}
                          </p>
                        </button>
                        {canManage && (
                          <div className="flex shrink-0 gap-1 opacity-80">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => startEdit(template)}
                              aria-label="Edit template"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeTemplate(template)}
                              aria-label="Delete template"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {canManage && (
            <form
              onSubmit={submitTemplate}
              className="space-y-2 border-t border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  {editingId ? "Edit template" : "New template"}
                </span>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title"
                />
                <Input
                  value={form.shortcut}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shortcut: event.target.value,
                    }))
                  }
                  placeholder="/shortcut"
                />
              </div>
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Category"
              />
              <Textarea
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Template content"
                className="min-h-20 resize-none"
              />
              <Button
                type="submit"
                size="sm"
                disabled={
                  createTemplate.isPending ||
                  updateTemplate.isPending ||
                  !form.title.trim() ||
                  !form.content.trim()
                }
              >
                <Plus className="h-3.5 w-3.5" />
                {editingId ? "Save" : "Create"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { User, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateContact } from "../hooks/use-contacts";
import { useUpdateContactAssociation } from "@/domains/conversation/hooks";

interface ContactFormProps {
  mode: "create" | "update";
  initialValues?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
  };
  onSubmit: (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    tags: string[];
  }) => void;
  onCancel: () => void;
  tagOptions: string[];
  loading?: boolean;
}

export function ContactForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  tagOptions,
  loading = false,
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name || "");
      setEmail(initialValues.email || "");
      setPhone(initialValues.phone || "");
      setCompany(initialValues.company || "");
      setTags(initialValues.tags || []);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setTags([]);
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="cursor-text"
            required
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@company.com"
            className="cursor-text"
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 (555) 000-0000"
            className="cursor-text"
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact-company">Organization</Label>
          <Input
            id="contact-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Organization name"
            className="cursor-text"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={loading}
              onClick={() =>
                setTags((prev) =>
                  prev.includes(tag)
                    ? prev.filter((item) => item !== tag)
                    : [...prev, tag],
                )
              }
              className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                tags.includes(tag)
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <DialogFooter className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="cursor-pointer"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name.trim() || loading}
          className="cursor-pointer"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create contact" : "Update"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface ContactDialogProps {
  mode: "create" | "update";
  contactId?: string;
  conversationId?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
  };
  triggerType?: "button" | "icon" | "custom";
  customTrigger?: React.ReactNode;
  onSubmit?: (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    tags: string[];
  }) => void;
  onSuccess?: (updatedContact: { name: string; email: string; phone: string; company: string; tags: string[] }) => void;
}

export function ContactDialog({
  mode,
  contactId,
  conversationId,
  contact,
  triggerType = "button",
  customTrigger,
  onSubmit,
  onSuccess,
}: ContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateContactMutation = useUpdateContact();
  const associateContactMutation = useUpdateContactAssociation();

  const TAG_OPTIONS = ["VIP", "Enterprise", "Trial", "Billing", "At Risk"];

  const handleFormSubmit = async (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    tags: string[];
  }) => {
    if (mode === "create") {
      onSubmit?.(payload);
      setOpen(false);
      return;
    }

    const trimmedName = payload.name.trim();
    const trimmedEmail = payload.email?.trim() || "";
    const trimmedPhone = payload.phone?.trim() || "";
    const trimmedCompany = payload.company?.trim() || "";
    const tags = payload.tags;

    if (!trimmedName && !trimmedEmail && !trimmedPhone && !trimmedCompany && tags.length === 0) {
      toast.error("Please provide at least a name, email address, phone number, company name, or tags to update.");
      return;
    }

    setLoading(true);
    try {
      if (!contactId || contactId === "temp-contact") {
        if (!conversationId) {
          toast.error("Cannot associate contact: conversation context is missing.");
          setLoading(false);
          return;
        }
        await associateContactMutation.mutateAsync({
          conversationId,
          name: trimmedName || undefined,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          company: trimmedCompany || undefined,
          tags,
        });
        toast.success("Contact associated successfully");
        setOpen(false);
        onSuccess?.({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          company: trimmedCompany,
          tags,
        });
        return;
      }

      await updateContactMutation.mutateAsync({
        id: contactId,
        name: trimmedName || undefined,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        company: trimmedCompany || undefined,
        tags,
      });

      toast.success("Details updated successfully");
      setOpen(false);
      onSuccess?.({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        company: trimmedCompany,
        tags,
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerType === "custom" && customTrigger ? (
          customTrigger
        ) : triggerType === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Edit contact details"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="cursor-pointer">
            <User className="h-4 w-4 mr-2" />
            {mode === "create" ? "Add contact" : "Update Info"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-180">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add new contact" : "Update Customer Information"}
          </DialogTitle>
          {mode === "create" && (
            <DialogDescription>
              Capture customer details so agents can provide faster, more personal support.
            </DialogDescription>
          )}
        </DialogHeader>
        <ContactForm
          mode={mode}
          initialValues={contact}
          onSubmit={handleFormSubmit}
          onCancel={() => setOpen(false)}
          tagOptions={TAG_OPTIONS}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}

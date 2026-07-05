import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { User, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateContact } from "@/domains/contacts/hooks/use-contacts";
import { useUpdateContactAssociation } from "../hooks";

interface UpdateContactDialogProps {
  contactId?: string;
  triggerType?: "text" | "icon";
  visitor?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
  };
  onUpdated?: (updatedVisitor: { name: string; email: string; phone: string; company: string; tags: string[] }) => void;
  conversationId?: string;
}

const TAG_OPTIONS = ["VIP", "Enterprise", "Trial", "Billing"];

export function UpdateContactDialog({
  contactId,
  triggerType = "text",
  visitor,
  onUpdated,
  conversationId,
}: UpdateContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const updateContactMutation = useUpdateContact();
  const associateContactMutation = useUpdateContactAssociation();

  useEffect(() => {
    if (open && visitor) {
      setName(visitor.name || "");
      setEmail(visitor.email || "");
      setPhone(visitor.phone || "");
      setCompany(visitor.company || "");
      setTags(visitor.tags || []);
    }
  }, [open, visitor]);

  const handleUpdate = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedCompany = company.trim();

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
        return;
      }

      // Update contact record directly
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
      onUpdated?.({
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
        {triggerType === "icon" ? (
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
            Update Info
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Customer Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="cursor-text"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="cursor-text"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="cursor-text"
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className="cursor-text"
            />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
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
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

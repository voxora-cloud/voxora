import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { DialogFooter } from "@/shared/ui/dialog";

interface AddContactFormProps {
  onSubmit: (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    tags: string[];
  }) => void;
  onCancel: () => void;
  tagOptions: string[];
}

export function AddContactForm({ onSubmit, onCancel, tagOptions }: AddContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="cursor-text"
          />
        </div>

        <div className="grid gap-2">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@company.com"
            className="cursor-text"
          />
        </div>

        <div className="grid gap-2">
          <Label>Phone</Label>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 (555) 000-0000"
            className="cursor-text"
          />
        </div>

        <div className="grid gap-2">
          <Label>Organization</Label>
          <Input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Organization name"
            className="cursor-text"
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
          variant="outline"
          onClick={onCancel}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSubmit({
              name,
              email: email || undefined,
              phone: phone || undefined,
              company: company || undefined,
              tags,
            })
          }
          disabled={!name.trim()}
          className="cursor-pointer"
        >
          Create contact
        </Button>
      </DialogFooter>
    </div>
  );
}

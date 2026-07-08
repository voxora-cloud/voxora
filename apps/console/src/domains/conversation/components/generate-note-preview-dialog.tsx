import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";
import { Loader } from "@/shared/ui/loader";

interface GenerateNotePreviewDialogProps {
  open: boolean;
  note: string;
  isLoading?: boolean;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: string) => void;
}

export function GenerateNotePreviewDialog({
  open,
  note,
  isLoading = false,
  isSaving = false,
  onOpenChange,
  onSave,
}: GenerateNotePreviewDialogProps) {
  const [editedNote, setEditedNote] = useState(note);

  useEffect(() => {
    setEditedNote(note);
  }, [note]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Contact note</DialogTitle>
          <DialogDescription>
            Review the generated note before saving it to this contact.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-muted/30">
            <Loader size="md" />
          </div>
        ) : (
          <Textarea
            value={editedNote}
            onChange={(event) => setEditedNote(event.target.value)}
            className="min-h-48 resize-none"
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={() => onSave(editedNote)}
            disabled={isLoading || isSaving || !editedNote.trim()}
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description,
  itemName,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const defaultDescription = itemName
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : "Are you sure you want to delete this item? This action cannot be undone.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {description || defaultDescription}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 cursor-pointer"
            >
              No, Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

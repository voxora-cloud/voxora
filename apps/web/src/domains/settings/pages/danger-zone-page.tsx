import { useState } from "react";
import { settingsApi } from "@/domains/settings/api/settings.api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { useAuth } from "@/domains/auth/hooks";
import { useLogout } from "@/domains/auth/hooks/useLogout";

export function DangerZonePage() {
  const { organization: currentOrg } = useAuth();
  const { mutate: logout } = useLogout();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requiredConfirmText = (currentOrg?.slug || currentOrg?.name || "").trim();
  const isConfirmMatched =
    requiredConfirmText.length > 0 && confirmText.trim() === requiredConfirmText;

  const handleDelete = async () => {
    if (!currentOrg?._id) return;
    if (!isConfirmMatched) {
      toast.error("Confirmation text does not match");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await settingsApi.deleteOrganization(currentOrg._id);
      if (response.success) {
        toast.success("Organization has been deleted");
        logout();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete organization";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Danger Zone</h1>
        <p className="text-muted-foreground mt-1">
          Sensitive operations that can permanently affect your organization.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-red-500/20 overflow-hidden shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold text-lg">Delete Organization</h3>
            </div>

            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Deleting your organization will permanently remove members, conversations, and settings.
              This action is irreversible and cannot be undone.
            </p>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="cursor-pointer">
                  Delete &quot;{currentOrg?.name}&quot;
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    Delete <span className="text-red-500">{currentOrg?.name}</span>?
                  </DialogTitle>
                  <DialogDescription>
                    This will permanently delete your organization, members, conversations, and
                    settings. You won’t be able to undo this action.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Confirmation required
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      Type the organization identifier below to confirm deletion.
                    </p>
                    <div className="mt-3 inline-flex select-none items-center rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                      <span
                        onCopy={(event) => event.preventDefault()}
                        onCut={(event) => event.preventDefault()}
                      >
                        {requiredConfirmText || "Organization name"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="delete-confirm"
                      className="text-xs font-semibold uppercase text-muted-foreground"
                    >
                      Enter confirmation text
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={requiredConfirmText}
                      className="cursor-text"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Ensure it matches exactly or the delete button will stay disabled.
                    </p>
                  </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isDeleting}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || !isConfirmMatched}
                    className="cursor-pointer"
                  >
                    {isDeleting ? "Deleting..." : "Yes, delete organization"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-red-500/5 px-6 py-3 border-t border-red-500/10">
            <p className="text-[11px] text-red-500/60 uppercase font-bold tracking-wider">
              Only organization owners can perform this action
            </p>
          </div>
      </div>
    </div>
  );
}

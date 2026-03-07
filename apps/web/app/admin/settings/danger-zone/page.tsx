"use client";

import React, { useState } from "react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function DangerZonePage() {
    const { organization: currentOrg, logout } = useAuth();
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [confirmSlug, setConfirmSlug] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDeactivate = async () => {
        if (!currentOrg?._id) return;
        if (confirmSlug !== currentOrg.slug) {
            toast.error("Organization slug does not match");
            return;
        }

        setIsDeactivating(true);
        try {
            const response = await apiService.deleteOrganization(currentOrg._id);
            if (response.success) {
                toast.success("Organization has been deactivated");
                // Log out the user as their active org is now gone/inactive
                logout();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to deactivate organization");
        } finally {
            setIsDeactivating(false);
            setIsDialogOpen(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Danger Zone</h1>
                <p className="text-muted-foreground mt-2">
                    Sensitive operations that can permanently affect your organization.
                </p>
            </div>

            <div className="space-y-6">
                {/* Deactivate Organization */}
                <div className="bg-card rounded-xl border border-red-500/20 overflow-hidden shadow-sm">
                    <div className="p-6">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="font-bold text-lg">Deactivate Organization</h3>
                        </div>

                        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                            Deactivating your organization will disable all members, stop all active chat widgets, and prevent anyone from accessing the data.
                            This action can be reversed by contacting support, but it will immediately disrupt your operations.
                        </p>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-500 hover:bg-red-600">
                                    Deactivate "{currentOrg?.name}"
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-red-500">
                                        <AlertTriangle className="h-5 w-5" />
                                        Are you absolutely sure?
                                    </DialogTitle>
                                    <DialogDescription className="pt-2">
                                        This will immediately take your organization offline. All active conversations will be disconnected.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="slug-confirm" className="text-xs font-semibold uppercase text-muted-foreground">
                                            Type the organization slug <span className="text-foreground font-mono bg-muted px-1 rounded">{currentOrg?.slug}</span> to confirm:
                                        </Label>
                                        <Input
                                            id="slug-confirm"
                                            value={confirmSlug}
                                            onChange={(e) => setConfirmSlug(e.target.value)}
                                            placeholder={currentOrg?.slug}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isDeactivating}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeactivate}
                                        disabled={isDeactivating || confirmSlug !== currentOrg?.slug}
                                    >
                                        {isDeactivating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Confirm Deactivation
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

                {/* Transfer Ownership Placeholder */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm opacity-60">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                        Transfer Ownership
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Transfer this organization to another member. You will lose owner permissions.
                    </p>
                    <Button variant="outline" size="sm" disabled>
                        Transfer Ownership
                    </Button>
                </div>
            </div>
        </div>
    );
}

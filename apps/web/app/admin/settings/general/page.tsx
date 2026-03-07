"use client";

import React, { useState, useEffect } from "react";
import { apiService, Organization } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

export default function GeneralSettingsPage() {
    const { organization: currentOrg, setOrganization } = useAuth();
    const [org, setOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState("");

    useEffect(() => {
        async function loadOrg() {
            if (!currentOrg?._id) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await apiService.getOrganization(currentOrg._id);
                if (response.success) {
                    setOrg(response.data.organization);
                    setName(response.data.organization.name);
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to load organization");
            } finally {
                setIsLoading(false);
            }
        }
        loadOrg();
    }, [currentOrg?._id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!org?._id) return;

        setIsSaving(true);
        try {
            const response = await apiService.updateOrganization(org._id, { name });
            if (response.success) {
                toast.success("Organization updated successfully");
                setOrg(response.data.organization);
                // Update global context if name/slug changed
                if (currentOrg?._id === response.data.organization._id) {
                    setOrganization(response.data.organization);
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to update organization");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">General Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your organization&apos;s basic information and identifier.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Organization Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="Your Organization Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="max-w-md"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            This is your organization&apos;s visible name across the platform.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}

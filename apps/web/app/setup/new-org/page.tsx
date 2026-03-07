"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

export default function NewOrganizationPage() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Organization name is required");
            return;
        }

        if (name.length < 2) {
            setError("Organization name must be at least 2 characters");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const res = await apiService.createOrganization({ name });
            if (res.success && res.data) {
                // Update local storage with the new context tokens
                apiService.setToken(res.data.accessToken);
                apiService.setActiveOrgId(res.data.organization._id);
                apiService.setOrgRole(res.data.role);

                // Clear any stored multi-tenant temp states if they exist
                localStorage.removeItem("tempMemberships");
                localStorage.removeItem("tempAuthUser");

                // Force a hard navigation to reboot the AuthContext completely
                window.location.href = "/admin";
            } else {
                throw new Error("Failed to create organization");
            }
        } catch (err: any) {
            setError(err.message || "Failed to create organization");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md relative">
                {/* Back Link */}
                <Link
                    href="/select-org"
                    className="absolute -top-12 left-0 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Selection
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <Building2 size={24} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Organization</h1>
                    <p className="text-zinc-400 mt-1 text-sm">
                        Set up a new workspace for your team.
                    </p>
                </div>

                {/* Create Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive" className="flex items-center space-x-2 bg-red-500/10 border-red-500/20 text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{error}</span>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <label
                            htmlFor="name"
                            className="text-sm font-medium text-zinc-300"
                        >
                            Organization Name
                        </label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="e.g. Acme Corp"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/50"
                            autoFocus
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium h-11 transition-colors mt-6"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating...</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span>Create Workspace</span>
                                <ArrowRight size={16} />
                            </div>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

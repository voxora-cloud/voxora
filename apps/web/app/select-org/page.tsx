"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService, OrgMembership, Organization, OrgRole } from "@/lib/api";
import { Building2, ArrowRight, Plus } from "lucide-react";

export default function SelectOrgPage() {
    const router = useRouter();
    const [memberships, setMemberships] = useState<OrgMembership[]>([]);
    const [selecting, setSelecting] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem("tempMemberships");
        if (!stored) {
            router.replace("/login");
            return;
        }
        setMemberships(JSON.parse(stored));
    }, [router]);

    const handleSelect = async (org: Organization, role: OrgRole) => {
        setSelecting(org._id);
        setError("");
        try {
            // Switch to selected org — issues a proper JWT
            const res = await apiService.switchOrganization(org._id);
            if (res.success && res.data) {
                apiService.setToken(res.data.accessToken);
                apiService.setActiveOrgId(org._id);
                apiService.setOrgRole(role);
                const tempAuthUser = localStorage.getItem("tempAuthUser");
                if (tempAuthUser) {
                    apiService.setUser(JSON.parse(tempAuthUser));
                }

                localStorage.removeItem("tempMemberships");
                localStorage.removeItem("tempAuthUser");

                // Redirect everyone to unified dashboard with hard reload to hydrate AuthContext
                window.location.href = "/admin";
            }
        } catch (err: any) {
            setError(err.message || "Failed to select organization");
            setSelecting(null);
        }
    };

    const roleBadge: Record<OrgRole, string> = {
        owner: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        agent: "bg-zinc-600/20 text-zinc-400 border border-zinc-600/30",
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <Building2 size={24} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Select Organization</h1>
                    <p className="text-zinc-400 mt-1 text-sm">
                        You belong to multiple organizations. Choose one to continue.
                    </p>
                </div>

                {/* Org list */}
                <div className="space-y-2">
                    {memberships.map(({ organization: org, role }) => (
                        <button
                            key={org._id}
                            id={`org-select-${org._id}`}
                            onClick={() => handleSelect(org, role)}
                            disabled={!!selecting}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-150 cursor-pointer disabled:opacity-60 group"
                        >
                            {/* Avatar */}
                            <div className="size-10 rounded-lg bg-emerald-600 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
                                {org.name?.[0]?.toUpperCase() ?? "?"}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-left">
                                <p className="font-medium text-zinc-100">{org.name}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{org.slug}</p>
                            </div>

                            {/* Role badge */}
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide ${roleBadge[role]}`}>
                                {role}
                            </span>

                            {/* Arrow / Spinner */}
                            {selecting === org._id ? (
                                <div className="size-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            ) : (
                                <ArrowRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
                )}

                {/* Create new org */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push("/setup/new-org")}
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        Create a new organization
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { apiService, OrgRole, Organization, OrgMembership } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check, Building2 } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

export default function OrgSwitcher({ isMinimized = false }: { isMinimized?: boolean }) {
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<OrgMembership[]>([]);
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);
    const [loading, setLoading] = useState(true);

    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch memberships on mount
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const res = await apiService.getMyOrganizations();
                if (res.success && res.data) {
                    const orgs = res.data.organizations as OrgMembership[];
                    setMemberships(orgs);

                    // We need to figure out which one is currently active
                    // We can check local storage for 'orgRole' and 'activeOrgId' if they exist,
                    // but since the backend token inherently is scoped to ONE org (or we just use the first/active one from array)
                    // Let's rely on apiService's getOrgRole() and the user's active org
                    // Alternatively, we can just ask the backend /auth/profile which returns the active organization
                    // For now, if getActiveOrgId exists we use it, otherwise fallback
                    let activeOrgId = apiService.getActiveOrgId();
                    const activeRole = apiService.getOrgRole();

                    let matchedOrg: OrgMembership | undefined;

                    // Try to match stored ID
                    if (activeOrgId) {
                        matchedOrg = orgs.find((m) => m.organization._id === activeOrgId);
                    }

                    // Try to match stored Role
                    if (!matchedOrg && activeRole) {
                        matchedOrg = orgs.find((m) => m.role === activeRole);
                    }

                    // Fallback to absolute first org
                    if (!matchedOrg && orgs.length > 0) {
                        matchedOrg = orgs[0];
                    }

                    // If a match was found, update local state & sync to apiService
                    if (matchedOrg) {
                        setCurrentOrg(matchedOrg.organization);
                        setCurrentRole(matchedOrg.role);

                        if (activeOrgId !== matchedOrg.organization._id) {
                            apiService.setActiveOrgId(matchedOrg.organization._id);
                        }
                        if (activeRole !== matchedOrg.role) {
                            apiService.setOrgRole(matchedOrg.role);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch organizations", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgs();
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSwitch = async (orgId: string) => {
        if (!currentOrg || orgId === currentOrg._id || switching) return;
        setSwitching(orgId);
        try {
            const res = await apiService.switchOrganization(orgId);
            if (res.success && res.data) {
                apiService.setToken(res.data.accessToken);
                // Assume apiService has these methods, or fallback to localStorage
                apiService.setActiveOrgId(res.data.organization._id);
                apiService.setOrgRole(res.data.role);
                window.location.reload();
            }
        } catch {
            /* no-op */
        } finally {
            setSwitching(null);
            setOpen(false);
        }
    };

    const badgeColor: Record<string, string> = {
        owner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        agent: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    };

    if (loading) {
        return <div className="animate-pulse h-10 bg-zinc-800 rounded-lg w-full"></div>;
    }

    if (!currentOrg || !currentRole) {
        return null; // fallback if no organizations found
    }

    return (
        <div className="relative w-full" ref={ref}>
            <button
                id="org-switcher-btn"
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all duration-150 cursor-pointer ${isMinimized ? "justify-center" : "justify-between"}`}
                title={isMinimized ? currentOrg.name : undefined}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    <Building2 size={14} className="text-emerald-400 flex-shrink-0" />
                    {!isMinimized && (
                        <>
                            <span className="truncate">{currentOrg.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide flex-shrink-0 ${badgeColor[currentRole] || badgeColor.agent}`}>
                                {currentRole}
                            </span>
                        </>
                    )}
                </div>
                {!isMinimized && (
                    <ChevronDown
                        size={14}
                        className={`text-zinc-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
                    />
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/40 z-50 overflow-hidden">
                    <div className="p-1 max-h-[300px] overflow-y-auto">
                        {/* Current org header */}
                        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Your Organizations
                        </div>

                        {/* Current org */}
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800 mb-1">
                            <div className="size-7 rounded-md bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {currentOrg.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-100 truncate">{currentOrg.name}</p>
                                <p className="text-[11px] text-zinc-400 capitalize">{currentRole}</p>
                            </div>
                            <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        </div>

                        {/* Other orgs */}
                        {memberships
                            .filter((m) => m.organization._id !== currentOrg._id)
                            .map((m) => (
                                <button
                                    key={m.organization._id}
                                    onClick={() => handleSwitch(m.organization._id)}
                                    disabled={!!switching}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <div className="size-7 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                                        {m.organization.name?.[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium text-zinc-200 truncate">{m.organization.name}</p>
                                        <p className="text-[11px] text-zinc-500 capitalize">{m.role}</p>
                                    </div>
                                    {switching === m.organization._id && (
                                        <div className="size-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    )}
                                </button>
                            ))}

                        {/* Divider + create */}
                        <div className="h-px bg-zinc-800 my-1" />
                        <button
                            onClick={() => { setOpen(false); router.push("/setup/new-org"); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                            <div className="size-7 rounded-md border-2 border-dashed border-zinc-600 flex items-center justify-center flex-shrink-0">
                                <Plus size={12} />
                            </div>
                            <span className="text-sm">Create organization</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

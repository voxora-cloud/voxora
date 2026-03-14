import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Plus, Check, Building2 } from "lucide-react";
import { authApi } from "@/domains/auth/api/auth.api";
import { useAuthStore } from "@/domains/auth/store/auth.store";

interface Organization {
  _id: string;
  name: string;
  slug?: string;
}

interface OrgMembership {
  organization: Organization;
  role: "owner" | "admin" | "agent";
}

interface OrgSwitcherProps {
  isMinimized?: boolean;
}

export function OrgSwitcher({ isMinimized = false }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Get from auth store as fallback
  const storeOrg = useAuthStore((state) => state.organization);
  
  // Get current org and role from localStorage
  const currentRole = authApi.getOrgRole();
  const currentOrgId = authApi.getActiveOrgId();
  const currentOrg = storeOrg && storeOrg._id === currentOrgId ? storeOrg : null;

  // Fetch memberships on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await authApi.getMyOrganizations();
        if (res.success && res.data) {
          const orgs = res.data.organizations as OrgMembership[];
          setMemberships(orgs);
        }
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        // If API fails but we have current org, create a single membership entry
        if (currentOrg && currentRole) {
          setMemberships([
            {
              organization: currentOrg,
              role: currentRole,
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have authentication
    const token = authApi.getToken();
    if (token) {
      fetchOrgs();
    } else {
      setLoading(false);
    }
  }, [currentOrg, currentRole]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwitch = async (orgId: string) => {
    const activeOrgId = authApi.getActiveOrgId();
    if (orgId === activeOrgId || switching) return;
    setSwitching(orgId);
    try {
      const res = await authApi.switchOrganization(orgId);
      if (res.success && res.data) {
        // Update localStorage first
        authApi.setToken(res.data.accessToken);
        authApi.setActiveOrgId(res.data.organization._id);
        authApi.setOrgRole(res.data.role);
        
        // Update Zustand store
        const setOrganization = useAuthStore.getState().setOrganization;
        setOrganization(res.data.organization);
        
        // Hard reload to refresh all data
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Failed to switch organization:", error);
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

  // Show component even if we don't have org data - prevents blank UI
  if (!currentOrg && !storeOrg) {
    return (
      <div className="w-full p-2 text-center">
        <p className="text-xs text-muted-foreground">No organization</p>
      </div>
    );
  }

  // Use either currentOrg or fallback to storeOrg
  const displayOrg = currentOrg || storeOrg;
  const displayRole = currentRole || "agent";

  if (!displayOrg) {
    return null;
  }

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all duration-150 cursor-pointer ${isMinimized ? "justify-center" : "justify-between"}`}
        title={isMinimized ? displayOrg.name : undefined}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <Building2 size={14} className="text-emerald-400 shrink-0" />
          {!isMinimized && (
            <>
              <span className="truncate">{displayOrg.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide shrink-0 ${badgeColor[displayRole] || badgeColor.agent}`}>
                {displayRole}
              </span>
            </>
          )}
        </div>
        {!isMinimized && (
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="p-1 max-h-75 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Your Organizations
            </div>

            {/* Current org */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800 mb-1">
              <div className="size-7 rounded-md bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {displayOrg.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{displayOrg.name}</p>
                <p className="text-[11px] text-zinc-400 capitalize">{displayRole}</p>
              </div>
              <Check size={14} className="text-emerald-400 shrink-0" />
            </div>

            {/* Other orgs */}
            {memberships
              .filter((m) => m.organization._id !== displayOrg._id)
              .map((m) => (
                <button
                  key={m.organization._id}
                  onClick={() => handleSwitch(m.organization._id)}
                  disabled={!!switching}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="size-7 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                    {m.organization.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-zinc-200 truncate">{m.organization.name}</p>
                    <p className="text-[11px] text-zinc-500 capitalize">{m.role}</p>
                  </div>
                  {switching === m.organization._id && (
                    <div className="size-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </button>
              ))}

            <div className="h-px bg-zinc-800 my-1" />
            <button
              onClick={() => { setOpen(false); navigate("/auth/setup"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <div className="size-7 rounded-md border-2 border-dashed border-zinc-600 flex items-center justify-center shrink-0">
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

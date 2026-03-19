import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Building2, ArrowRight, Plus } from "lucide-react";
import { authApi } from "../../api/auth.api";
import { useAuthStore } from "../../store/auth.store";

interface Organization {
  _id: string;
  name: string;
  slug?: string;
}

interface OrgMembership {
  organization: Organization;
  role: "owner" | "admin" | "agent";
}

export function SelectOrgPage() {
  const navigate = useNavigate();
  
  // Initialize memberships from localStorage
  const memberships = useState<OrgMembership[]>(() => {
    const stored = localStorage.getItem("tempMemberships");
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  })[0];
  
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Redirect if no memberships found
    if (memberships.length === 0) {
      navigate("/auth/login");
    }
  }, [memberships, navigate]);

  const handleSelect = async (org: Organization, role: "owner" | "admin" | "agent") => {
    setSelecting(org._id);
    setError("");
    try {
      // Switch to selected org — issues a proper JWT
      const res = await authApi.switchOrganization(org._id);
      if (res.success && res.data) {
        // Update localStorage
        authApi.setToken(res.data.accessToken);
        authApi.setActiveOrgId(res.data.organization._id);
        authApi.setOrgRole(res.data.role);
        
        const tempAuthUser = localStorage.getItem("tempAuthUser");
        let user = null;
        if (tempAuthUser) {
          user = JSON.parse(tempAuthUser);
          authApi.setUser(user);
        }

        // Update Zustand store BEFORE navigation
        useAuthStore.setState({
          user: user,
          organization: res.data.organization,
          isAuthenticated: true,
        });
        
        localStorage.removeItem("tempMemberships");
        localStorage.removeItem("tempAuthUser");

        // Use navigate instead of hard reload
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select organization");
      setSelecting(null);
    }
  };

  const roleBadge: Record<"owner" | "admin" | "agent", string> = {
    owner: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    agent: "bg-zinc-600/20 text-zinc-400 border border-zinc-600/30",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Building2 size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select Organization</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You belong to multiple organizations. Choose one to continue.
          </p>
        </div>

        {/* Org list */}
        <div className="space-y-2">
          {memberships.map(({ organization: org, role }) => (
            <button
              key={org._id}
              onClick={() => handleSelect(org, role)}
              disabled={!!selecting}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-accent hover:bg-accent/50 transition-all duration-150 cursor-pointer disabled:opacity-60 group"
            >
              {/* Avatar */}
              <div className="size-10 rounded-lg bg-emerald-600 flex items-center justify-center text-base font-bold text-white shrink-0">
                {org.name?.[0]?.toUpperCase() ?? "?"}
              </div>

              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-foreground truncate">{org.name}</p>
                {org.slug && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{org.slug}</p>
                )}
              </div>

              {/* Role badge */}
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide shrink-0 ${roleBadge[role]}`}>
                {role}
              </span>

              {/* Arrow / Spinner */}
              {selecting === org._id ? (
                <div className="size-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive text-center">{error}</p>
        )}

        {/* Create new org */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/organizations/create")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Create a new organization
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import LogoutConfirmDialog from "@/components/auth/LogoutConfirmDialog";
import { BarChart3, Crown, LogOut, UserCheck, Users, BookOpen, Settings, MessageSquare, Users2, Bot, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Team, Agent, apiService, OrgRole } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrgSwitcher from "@/components/shared/OrgSwitcher";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [showConversationsSubmenu, setShowConversationsSubmenu] = useState(false);
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(false);
  const [showMembersSubmenu, setShowMembersSubmenu] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [showKnowledgeSubmenu, setShowKnowledgeSubmenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Auto-open submenu when on a knowledge route
  useEffect(() => {
    if (pathname.includes("/admin/knowledge")) {
      setShowKnowledgeSubmenu(true);
    }
  }, [pathname]);

  // Read organization role
  useEffect(() => {
    if (!isLoading) {
      const role = apiService.getOrgRole();

      if (isAuthenticated && !role) {
        window.location.href = "/login";
        return;
      }

      setOrgRole(role);
    }
  }, [isLoading, isAuthenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Only fetch data if authenticated and owner/admin
    if (isAuthenticated && (orgRole === "admin" || orgRole === "owner")) {
      // Load teams and agents for counts
      const fetchData = async () => {
        try {
          // Get teams
          const teamsResponse = await apiService.getTeams();
          if (teamsResponse.success) {
            setTeams(teamsResponse.data.teams);
          }

          // Get agents
          const agentsResponse = await apiService.getAgents();
          if (agentsResponse.success) {
            setAgents(agentsResponse.data.agents);
          }
        } catch (error) {
          console.error("Error loading admin sidebar data:", error);
        }
      };

      fetchData();
    }
  }, [isAuthenticated, orgRole]);

  if (isLoading || !orgRole) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Access denied. Please log in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`bg-card shadow-lg flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300 ${isSidebarMinimized ? "w-20" : "w-64"}`}>
        {/* Logo/Header (Org Switcher) */}
        <div className={`p-4 border-b border-border relative z-50 flex items-center gap-2 ${isSidebarMinimized ? "justify-center" : "justify-between"}`}>
          <div className={isSidebarMinimized ? "w-full min-w-0" : "flex-1 min-w-0"}>
            <OrgSwitcher isMinimized={isSidebarMinimized} />
          </div>
          {!isSidebarMinimized && (
            <button
              onClick={() => setIsSidebarMinimized(true)}
              className="p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors shrink-0"
              title="Minimize Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {isSidebarMinimized && (
          <div className="p-2 flex justify-center border-b border-border">
            <button
              onClick={() => setIsSidebarMinimized(false)}
              className="p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={`mt-4 px-3 flex-1 overflow-y-auto scrollbar-hide space-y-1 ${isSidebarMinimized ? "flex flex-col items-center" : ""}`}>
          <Link href="/admin">
            <Button
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname === "/admin"
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Dashboard" : undefined}
            >
              <BarChart3 className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && <span className="flex-1 text-left">Dashboard</span>}
            </Button>
          </Link>

          {/* Conversations */}
          <div className="w-full">
            <Button
              onClick={() => !isSidebarMinimized && setShowConversationsSubmenu(!showConversationsSubmenu)}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/conversation")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Conversations" : undefined}
            >
              <MessageSquare className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && (
                <>
                  <span className="flex-1 text-left">Conversations</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showConversationsSubmenu ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </Button>
            {showConversationsSubmenu && !isSidebarMinimized && (
              <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                {["Inbox", "Unassigned", ...(orgRole === "owner" ? ["AI Handled"] : []), "Archived"].map((item) => {
                  const slug = item.toLowerCase().replace(" ", "-");
                  return (
                    <Link key={slug} href={`/admin/conversation/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname === `/admin/conversation/${slug}`
                          ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                      >
                        <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">{item}</span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="w-full">
            <Button
              onClick={() => !isSidebarMinimized && setShowContactsSubmenu(!showContactsSubmenu)}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/contacts")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Contacts" : undefined}
            >
              <Users2 className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && (
                <>
                  <span className="flex-1 text-left">Contacts</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showContactsSubmenu ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </Button>
            {showContactsSubmenu && !isSidebarMinimized && (
              <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                {["All Contacts", "Segments", ...(orgRole === "owner" ? ["Import Export"] : [])].map((item) => {
                  const slug = item.toLowerCase().replace(/ /g, "-").replace("/", "");
                  return (
                    <Link key={slug} href={`/admin/contacts/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname === `/admin/contacts/${slug}`
                          ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                      >
                        <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">{item.replace("Import Export", "Import / Export")}</span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          {(orgRole === "admin" || orgRole === "owner") && (
            <>
              <Link href="/admin/agents" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/agents")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Agents" : undefined}
                >
                  <UserCheck className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && <span className="flex-1 text-left">Agents</span>}
                </Button>
              </Link>

              <Link href="/admin/team" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/team")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Teams" : undefined}
                >
                  <Users className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && (
                    <>
                      <span className="flex-1 text-left">Teams</span>
                      <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-1">
                        {teams?.length || 0}
                      </span>
                    </>
                  )}
                </Button>
              </Link>
            </>
          )}

          {(orgRole === "admin" || orgRole === "owner") && (
            <div className="w-full">
              <Button
                onClick={() => !isSidebarMinimized && setShowKnowledgeSubmenu(!showKnowledgeSubmenu)}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/knowledge")
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                title={isSidebarMinimized ? "Knowledge Base" : undefined}
              >
                <BookOpen className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                {!isSidebarMinimized && (
                  <>
                    <span className="flex-1 text-left">Knowledge Base</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${showKnowledgeSubmenu ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>

              {showKnowledgeSubmenu && !isSidebarMinimized && (
                <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                  <Link href="/admin/knowledge/static">
                    <Button
                      variant="ghost"
                      className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname === "/admin/knowledge/static" || pathname === "/admin/knowledge"
                        ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                    >
                      <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">Static Content</span>
                    </Button>
                  </Link>
                  <Link href="/admin/knowledge/realtime">
                    <Button
                      variant="ghost"
                      className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname.startsWith("/admin/knowledge/realtime")
                        ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                    >
                      <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">Realtime Sync</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {(orgRole === "admin" || orgRole === "owner") && (
            <>
              <Link href="/admin/widget" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/widget")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Widget" : undefined}
                >
                  <Crown className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && <span className="flex-1 text-left">Widget</span>}
                </Button>
              </Link>

              {/* Members */}
              <div className="w-full">
                <Button
                  onClick={() => !isSidebarMinimized && setShowMembersSubmenu(!showMembersSubmenu)}
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/agents") || pathname.startsWith("/admin/members")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Members" : undefined}
                >
                  <UserCheck className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && (
                    <>
                      <span className="flex-1 text-left">Members</span>
                      <svg
                        className={`h-4 w-4 transition-transform ${showMembersSubmenu ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </Button>
                {showMembersSubmenu && !isSidebarMinimized && (
                  <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                    {[{ label: "All Members", path: "/admin/members" }, ...(orgRole === "owner" ? [{ label: "Roles & Permissions", path: "/admin/members/roles" }] : [])].map((item) => {
                      return (
                        <Link key={item.label} href={item.path}>
                          <Button
                            variant="ghost"
                            className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname === item.path
                              ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                          >
                            <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">{item.label}</span>
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Org Settings (Owner Only) */}
          {orgRole === "owner" && (
            <div className="w-full">
              <Button
                onClick={() => !isSidebarMinimized && setShowSettingsSubmenu(!showSettingsSubmenu)}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/admin/settings")
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                title={isSidebarMinimized ? "Organization Settings" : undefined}
              >
                <Settings className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                {!isSidebarMinimized && (
                  <>
                    <span className="flex-1 text-left">Organization Settings</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${showSettingsSubmenu ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>
              {showSettingsSubmenu && !isSidebarMinimized && (
                <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                  {["General", "Security", "Data & Export", "Danger Zone"].map((item) => {
                    const slug = item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
                    return (
                      <Link key={slug} href={`/admin/settings/${slug}`}>
                        <Button
                          variant="ghost"
                          className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname === `/admin/settings/${slug}`
                            ? "text-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            }`}
                        >
                          <span className="flex-1 text-left relative before:absolute before:top-1/2 before:-left-3.5 before:w-2 before:h-px before:bg-border">{item}</span>
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className={`p-4 border-t border-border mt-auto ${isSidebarMinimized ? "flex flex-col items-center" : ""}`}>
          <div className={`flex items-center mb-4 mt-2 ${isSidebarMinimized ? "justify-center" : "space-x-3"}`}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            {!isSidebarMinimized && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowLogoutDialog(true)}
            variant="outline"
            size="sm"
            className={`w-full cursor-pointer ${isSidebarMinimized ? "px-0" : ""}`}
            title={isSidebarMinimized ? "Sign out" : undefined}
          >
            <LogOut className={`h-4 w-4 ${isSidebarMinimized ? "" : "mr-2"}`} />
            {!isSidebarMinimized && "Sign out"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-background overflow-auto h-screen">{children}</div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={() => {
          setShowLogoutDialog(false);
          logout();
        }}
      />
    </div>
  );
}

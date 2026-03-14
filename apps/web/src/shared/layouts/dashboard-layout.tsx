import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@/shared/ui/button";
import { Loader } from "@/shared/ui/loader";
import {
  BarChart3,
  Crown,
  LogOut,
  UserCheck,
  Users,
  BookOpen,
  Settings,
  MessageSquare,
  Users2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { OrgSwitcher } from "../components/org-switcher";
import { useAuth } from "@/domains/auth/hooks";
import { authApi } from "@/domains/auth/api/auth.api";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Initialize submenus based on current path
  const [showConversationsSubmenu, setShowConversationsSubmenu] = useState(
    location.pathname.includes("/dashboard/conversations")
  );
  const [showContactsSubmenu, setShowContactsSubmenu] = useState(
    location.pathname.includes("/dashboard/contacts")
  );
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(
    location.pathname.includes("/dashboard/settings")
  );
  const [showKnowledgeSubmenu, setShowKnowledgeSubmenu] = useState(
    location.pathname.includes("/dashboard/knowledge")
  );
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Get org role directly from storage
  const orgRole = !isLoading && isAuthenticated ? authApi.getOrgRole() : null;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = () => {
    authApi.logout();
    navigate("/auth/login");
  };

  if (isLoading || !orgRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">Access denied. Please log in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`bg-card shadow-lg flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300 ${isSidebarMinimized ? "w-20" : "w-64"}`}
      >
        {/* Logo/Header (Org Switcher) */}
        <div
          className={`p-4 border-b border-border relative z-50 flex items-center gap-2 ${isSidebarMinimized ? "justify-center" : "justify-between"}`}
        >
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
        <nav
          className={`mt-4 px-3 flex-1 overflow-y-auto scrollbar-hide space-y-1 ${isSidebarMinimized ? "flex flex-col items-center" : ""}`}
        >
          <Link to="/dashboard">
            <Button
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname === "/dashboard"
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
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/conversations")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Conversations" : undefined}
            >
              <MessageSquare className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && (
                <>
                  <span className="flex-1 text-left">Conversations</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showConversationsSubmenu ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </Button>
            {showConversationsSubmenu && !isSidebarMinimized && (
              <div className="ml-8 mt-1 space-y-1">
                {["Inbox", "Unassigned", "Archived"].map((item) => {
                  const slug = item.toLowerCase();
                  return (
                    <Link key={slug} to={`/dashboard/conversations/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg justify-start ${location.pathname === `/dashboard/conversations/${slug}`
                          ? "text-primary bg-primary/5 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                      >
                        <span>{item}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="w-full">
            <Button
              onClick={() => !isSidebarMinimized && setShowContactsSubmenu(!showContactsSubmenu)}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/contacts")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Contacts" : undefined}
            >
              <Users2 className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && (
                <>
                  <span className="flex-1 text-left">Contacts</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showContactsSubmenu ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </Button>
            {showContactsSubmenu && !isSidebarMinimized && (
              <div className="ml-8 mt-1 space-y-1">
                {["All Contacts", "Segments"].map((item) => {
                  const slug = item.toLowerCase().replace(/ /g, "-");
                  return (
                    <Link key={slug} to={`/dashboard/contacts/${slug}`}>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <span>{item}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin/Owner Features */}
          {(orgRole === "admin" || orgRole === "owner") && (
            <>
              <Link to="/dashboard/teams" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/teams")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Teams" : undefined}
                >
                  <Users className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && <span className="flex-1 text-left">Teams</span>}
                </Button>
              </Link>

              <Link to="/dashboard/agents" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/agents")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Agents" : undefined}
                >
                  <UserCheck className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && <span className="flex-1 text-left">Agents</span>}
                </Button>
              </Link>

              {/* Knowledge Base */}
              <div className="w-full">
                <Button
                  onClick={() => !isSidebarMinimized && setShowKnowledgeSubmenu(!showKnowledgeSubmenu)}
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/knowledge")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Knowledge Base" : undefined}
                >
                  <BookOpen className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && (
                    <>
                      <span className="flex-1 text-left">Knowledge Base</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showKnowledgeSubmenu ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </Button>
                {showKnowledgeSubmenu && !isSidebarMinimized && (
                  <div className="ml-8 mt-1 space-y-1">
                    {["Static", "Realtime"].map((item) => {
                      const slug = item.toLowerCase();
                      return (
                        <Link key={slug} to={`/dashboard/knowledge/${slug}`}>
                          <Button
                            variant="ghost"
                            className="w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                          >
                            <span>{item}</span>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <Link to="/dashboard/widget" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/widget")
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
              <Link to="/dashboard/members" className="w-full">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/members")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  title={isSidebarMinimized ? "Members" : undefined}
                >
                  <UserCheck className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                  {!isSidebarMinimized && <span className="flex-1 text-left">Members</span>}
                </Button>
              </Link>
            </>
          )}

          {/* Owner Settings */}
          {orgRole === "owner" && (
            <div className="w-full">
              <Button
                onClick={() => !isSidebarMinimized && setShowSettingsSubmenu(!showSettingsSubmenu)}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${location.pathname.startsWith("/dashboard/settings")
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                title={isSidebarMinimized ? "Organization Settings" : undefined}
              >
                <Settings className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
                {!isSidebarMinimized && (
                  <>
                    <span className="flex-1 text-left">Settings</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showSettingsSubmenu ? "rotate-180" : ""}`}
                    />
                  </>
                )}
              </Button>
              {showSettingsSubmenu && !isSidebarMinimized && (
                <div className="ml-8 mt-1 space-y-1">
                  {["General", "Security", "Danger Zone"].map((item) => {
                    const slug = item.toLowerCase().replace(/ /g, "-");
                    return (
                      <Link key={slug} to={`/dashboard/settings/${slug}`}>
                        <Button
                          variant="ghost"
                          className="w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <span>{item}</span>
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div
          className={`p-4 border-t border-border mt-auto ${isSidebarMinimized ? "flex flex-col items-center" : ""}`}
        >
          <div
            className={`flex items-center mb-4 mt-2 ${isSidebarMinimized ? "justify-center" : "space-x-3"}`}
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            {!isSidebarMinimized && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{orgRole}</p>
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
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Sign Out</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLogoutDialog(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="cursor-pointer"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { type ReactNode, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronRight,
  Inbox,
  Crown,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  UserCheck,
  UserCog,
  Users,
  Users2,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/domains/auth/hooks/useAuth";
import { useLogout } from "@/domains/auth/hooks/useLogout";
import { authApi } from "@/domains/auth/api/auth.api";
import { OrgSwitcher } from "@/shared/components/org-switcher";
import { useTheme } from "@/shared/theme/theme-context";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Loader } from "@/shared/ui/loader";

interface DashboardLayoutProps {
  children: ReactNode;
}

type OrgRole = "owner" | "admin" | "agent";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();

  const orgRole: OrgRole | null = isAuthenticated ? authApi.getOrgRole() : null;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isContentFullscreen, setIsContentFullscreen] = useState(false);

  const searchableRoutes = useMemo(() => {
    const base = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Inbox", to: "/dashboard/conversations/inbox" },
      { label: "All Contacts", to: "/dashboard/contacts/all-contacts" },
      { label: "Segments", to: "/dashboard/contacts/segments" },
    ];

    if (orgRole === "admin" || orgRole === "owner") {
      base.push(
        { label: "Teams", to: "/dashboard/teams" },
        { label: "Agents", to: "/dashboard/agents" },
        { label: "Members", to: "/dashboard/members" },
        { label: "Knowledge Static", to: "/dashboard/knowledge/static" },
        { label: "Knowledge Realtime", to: "/dashboard/knowledge/realtime" },
        { label: "Widget", to: "/dashboard/widget" }
      );
    }

    if (orgRole === "owner") {
      base.push(
        { label: "General Settings", to: "/dashboard/settings/general" },
        { label: "Danger Zone", to: "/dashboard/settings/danger-zone" }
      );
    }

    return base;
  }, [orgRole]);

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Home", to: "/" }];

    const items: Array<{ label: string; to: string }> = [];
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath += `/${part}`;

      const label =
        index === 0 && part === "dashboard"
          ? "Dashboard"
          : part
              .split("-")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ");

      items.push({ label, to: currentPath });
    });

    return items;
  }, [location.pathname]);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return searchableRoutes.filter((route) => route.label.toLowerCase().includes(term)).slice(0, 5);
  }, [searchQuery, searchableRoutes]);

  const notifications = [
    { id: 1, title: "New visitor message", description: "A new inbox conversation is waiting.", time: "2m ago" },
    { id: 2, title: "Agent assigned", description: "Conversation was assigned to your team.", time: "10m ago" },
    { id: 3, title: "Knowledge synced", description: "Knowledge base indexing completed.", time: "1h ago" },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const firstMatch = searchResults[0];
    if (firstMatch) {
      navigate(firstMatch.to);
      setSearchQuery("");
    }
  };

  const isActive = (path: string, exact = false) => {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  };

  const isConversationRoute = location.pathname.startsWith("/dashboard/conversations");

  const renderSidebar = () => {
    return (
      <>
        <div className="p-4 relative z-50">
          <OrgSwitcher isMinimized={false} />
        </div>

        <nav className="mt-4 px-3 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <Link to="/dashboard">
              <Button
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard", true)
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Dashboard</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Conversations
            </p>
            {[
              { label: "Inbox", to: "/dashboard/conversations/inbox", icon: Inbox },
       
            ].map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg justify-start ${isActive(item.to, true)
                    ? "text-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Contacts</p>
            {[
              { label: "All Contacts", to: "/dashboard/contacts/all-contacts", icon: Users2 },
              { label: "Segments", to: "/dashboard/contacts/segments", icon: UsersRound },
            ].map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg justify-start ${isActive(item.to, true)
                    ? "text-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>

          {(orgRole === "admin" || orgRole === "owner") && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Operations
              </p>

              <Link to="/dashboard/teams">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/teams")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Teams</span>
                </Button>
              </Link>

              <Link to="/dashboard/agents">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/agents")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <UserCog className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Agents</span>
                </Button>
              </Link>

              <Link to="/dashboard/members">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/members")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <UserCheck className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Members</span>
                </Button>
              </Link>
            </div>
          )}

          {(orgRole === "admin" || orgRole === "owner") && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                AI and Widget
              </p>

              {[
                { label: "Knowledge Static", to: "/dashboard/knowledge/static", icon: BookOpen },
                { label: "Knowledge Realtime", to: "/dashboard/knowledge/realtime", icon: Bot },
              ].map((item) => (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg justify-start ${isActive(item.to, true)
                      ? "text-primary bg-primary/5 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}

              <Link to="/dashboard/widget">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/widget")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Crown className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Widget</span>
                </Button>
              </Link>
            </div>
          )}

          {orgRole === "owner" && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Settings
              </p>
              {[
                { label: "General", to: "/dashboard/settings/general", icon: Settings },
                { label: "Danger Zone", to: "/dashboard/settings/danger-zone", icon: TriangleAlert },
              ].map((item) => (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer rounded-lg justify-start ${isActive(item.to, true)
                      ? "text-primary bg-primary/5 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <div className="flex items-center mb-4 mt-2 space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{orgRole}</p>
            </div>
          </div>

          <Button
            onClick={() => setShowLogoutDialog(true)}
            variant="outline"
            size="sm"
            className="w-full cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </>
    );
  };

  if (isLoading) {
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
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {!isContentFullscreen && (
          <aside className="hidden lg:flex bg-background flex-col lg:fixed lg:top-4 lg:left-4 lg:h-[calc(100vh-2rem)] w-72">
            {renderSidebar()}
          </aside>
        )}

        <div className={`flex min-w-0 flex-1 flex-col bg-background ${isContentFullscreen ? "lg:ml-0" : "lg:ml-76"}`}>
          <main className={`flex-1 bg-background ${isConversationRoute ? "overflow-hidden" : "overflow-auto"}`}>
            <div
              className={`mx-auto w-full ${isConversationRoute ? "h-full p-4 sm:p-6 lg:p-8 flex flex-col min-h-0" : isContentFullscreen ? "max-w-none p-4 sm:p-6 lg:p-8" : "max-w-384 p-4 sm:p-6 lg:p-8"}`}
            >
              <div className="mb-4 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.to} className="flex items-center gap-1 shrink-0">
                        {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                        {index === breadcrumbs.length - 1 ? (
                          <span className="font-medium text-foreground">{crumb.label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(crumb.to)}
                            className="cursor-pointer hover:text-foreground transition-colors"
                          >
                            {crumb.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 lg:gap-3">
                    <form className="relative w-full max-w-xs" onSubmit={handleSearchSubmit}>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search anywhere..."
                        className="pl-9 cursor-text"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute mt-2 w-full rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
                          {searchResults.map((result) => (
                            <button
                              key={result.to}
                              type="button"
                              onClick={() => {
                                navigate(result.to);
                                setSearchQuery("");
                              }}
                              className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </form>

                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer relative"
                        aria-label="Notifications"
                        onClick={() => setShowNotifications((prev) => !prev)}
                      >
                        <Bell className="h-4 w-4" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
                      </Button>

                      {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg z-50">
                          <div className="flex items-center justify-between px-2 pb-2">
                            <p className="text-sm font-semibold text-foreground">Notifications</p>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              Mark all read
                            </button>
                          </div>
                          <div className="space-y-1 max-h-72 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {notifications.map((item) => (
                              <div key={item.id} className="rounded-md px-2 py-2 hover:bg-accent">
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{item.time}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={toggleTheme}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4 mr-2" />
                      ) : (
                        <Moon className="h-4 w-4 mr-2" />
                      )}
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setIsContentFullscreen((prev) => !prev)}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      aria-label={isContentFullscreen ? "Exit fullscreen content" : "Fullscreen content"}
                    >
                      {isContentFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {isConversationRoute ? (
                <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  {children}
                </div>
              ) : (
                <div className="min-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 lg:p-8">
                  {children}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

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
              <Button variant="destructive" onClick={handleLogout} className="cursor-pointer">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

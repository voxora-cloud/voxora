import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useWidget } from "@/domains/widget/hooks/useWidget";
import {
  Bell,
  BookOpen,
  Bot,
  ChevronRight,
  CreditCard,
  Inbox,
  Crown,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Radio,
  Search,
  QrCode,
  Settings,
  Sun,
  TriangleAlert,
  UserCheck,
  UserCog,
  Users2,
  UserPlus,
  Info,
  Clock,
  Ticket,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/domains/auth/hooks/useAuth";
import { useLogout } from "@/domains/auth/hooks/useLogout";
import { authApi } from "@/domains/auth/api/auth.api";
import io, { Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";
import {
  getInteraOneMode,
  isEeEnabledByEnv,
} from "@/shared/ee";
import { OrgSwitcher } from "@/shared/components/org-switcher";
import { playNotificationSound } from "@/shared/lib/audio";
import { UsageBanner } from "@/shared/components/usage-banner";
import { UpgradeModalRoot } from "@/shared/components/upgrade-modal";
import { useTheme } from "@/shared/theme/theme-context";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Loader } from "@/shared/ui/loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { apiClient } from "@/shared/lib/api-client";

interface DashboardLayoutProps {
  children: ReactNode;
}

type OrgRole = "owner" | "admin" | "agent";

const CDN_URL =
  (import.meta.env.VITE_WIDGET_URL as string | undefined) ||
  "http://localhost:9001/interaone-widget/v1/InteraOne.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

interface Notification {
  id: string;
  type: "assignment" | "ai_sync" | "administrative" | "system" | "billing";
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationApiItem {
  _id: string;
  id?: string;
  type: Notification["type"];
  title: string;
  description: string;
  createdAt?: string;
  timestamp?: string;
  isRead: boolean;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const logoutMutation = useLogout();
  const { data: widgetData } = useWidget();

  const orgRole: OrgRole | null = isAuthenticated ? authApi.getOrgRole() : null;
  const canAccessContacts = true;
  const billingVisible =
    getInteraOneMode() === "cloud" && isEeEnabledByEnv();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const [isContentFullscreen, setIsContentFullscreen] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement | null>(null);
  const widgetScriptInjected = useRef(false);

  // Inject widget script once for the entire dashboard session so the
  // floating button persists across page navigations.
  useEffect(() => {
    const widgetId = widgetData?._id;
    if (!widgetId || widgetScriptInjected.current) return;

    // Remove any stale widget elements before injecting fresh script.
    document.getElementById("InteraOne-widget-script")?.remove();
    document.getElementById("InteraOne-widget-button")?.remove();
    document.getElementById("InteraOne-widget-iframe")?.remove();

    const script = document.createElement("script");
    script.src = `${CDN_URL}?v=${Date.now()}`;
    script.setAttribute("data-InteraOne-public-key", widgetId);
    script.id = "InteraOne-widget-script";
    document.body.appendChild(script);
    widgetScriptInjected.current = true;
  }, [widgetData?._id]);

  const searchableRoutes = useMemo(() => {
    const base = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Inbox", to: "/dashboard/conversations/inbox" },
      { label: "Tickets", to: "/dashboard/tickets" },
    ];

    if (canAccessContacts) {
      base.push({ label: "All Contacts", to: "/dashboard/contacts/all-contacts" });
    }

    if (orgRole === "admin" || orgRole === "owner") {
      base.push(

        { label: "Agents", to: "/dashboard/agents" },
        { label: "Members", to: "/dashboard/members" },
        { label: "Knowledge Static", to: "/dashboard/knowledge/static" },
        { label: "Knowledge Realtime", to: "/dashboard/knowledge/realtime" },
        { label: "Widget", to: "/dashboard/widget" }
      );
    }

    if (orgRole === "owner") {
      if (billingVisible) {
        base.push({ label: "Billing", to: "/dashboard/settings/billing" });
      }

      base.push(
        { label: "QR Codes", to: "/dashboard/widget/qr" },
        { label: "General Settings", to: "/dashboard/settings/general" },
        { label: "Danger Zone", to: "/dashboard/settings/danger-zone" }
      );
    }

    return base;
  }, [billingVisible, canAccessContacts, orgRole]);

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

    return items
      .map((item) =>
        item.to === "/dashboard/conversations"
          ? { ...item, to: "/dashboard/conversations/inbox" }
          : item,
      )
      .filter((item, index, list) => item.to !== list[index + 1]?.to);
  }, [location.pathname]);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return searchableRoutes.filter((route) => route.label.toLowerCase().includes(term)).slice(0, 5);
  }, [searchQuery, searchableRoutes]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Setup Socket listener for notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("notification", (newNotif: NotificationApiItem) => {
      playNotificationSound();
      setNotifications(prev => [
        {
          ...newNotif,
          id: newNotif.id || newNotif._id,
          timestamp: new Date(newNotif.timestamp || Date.now()),
          isRead: newNotif.isRead ?? false
        },
        ...prev
      ].slice(0, 50)); // Keep last 50
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  // Fetch historical notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get<{ data?: NotificationApiItem[] }>(`/notifications`);
        if (res?.data) {
          setNotifications(res.data.map((n) => ({
            ...n,
            id: n.id || n._id,
            timestamp: new Date(n.createdAt || n.timestamp || Date.now())
          })));
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };
    fetchNotifications();
  }, [isAuthenticated, user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = notifications.filter(n => notificationFilter === "all" || !n.isRead);

  const markAllAsRead = async () => {
    try {
      await apiClient.patch(`/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "ai_sync": return <Bot className="h-4 w-4 text-purple-500" />;
      case "administrative": return <UserCheck className="h-4 w-4 text-emerald-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const firstMatch = searchResults[0];
    if (firstMatch) {
      navigate(firstMatch.to);
      setSearchQuery("");
      setShowSearchResults(false);
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
              { label: "Tickets", to: "/dashboard/tickets", icon: Ticket },
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

          {canAccessContacts && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Contacts</p>
              {[
                { label: "All Contacts", to: "/dashboard/contacts/all-contacts", icon: Users2 },
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

          {(orgRole === "admin" || orgRole === "owner") && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Channels
              </p>
              <Link to="/dashboard/channels">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/channels")
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Radio className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Channels</span>
                </Button>
              </Link>
            </div>
          )}



          {(orgRole === "admin" || orgRole === "owner") && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Operations
              </p>

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
                  className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/widget", true)
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Crown className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">Widget</span>
                </Button>
              </Link>

              {orgRole === "owner" && (
                <Link to="/dashboard/widget/qr">
                  <Button
                    variant="ghost"
                    className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors justify-start ${isActive("/dashboard/widget/qr", true)
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                  >
                    <QrCode className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">QR Codes</span>
                  </Button>
                </Link>
              )}
            </div>
          )}

          {orgRole === "owner" && billingVisible && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Billing &amp; Usage
              </p>
              {[
                { label: "Plans & Pricing", to: "/dashboard/settings/billing/plans", icon: CreditCard },
                { label: "Resource Usage", to: "/dashboard/settings/billing/usage", icon: BarChart3 },
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

          {orgRole === "owner" && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Settings
              </p>
              {[
                { label: "General", to: "/dashboard/settings/general", icon: Settings, visible: true },
                { label: "Danger Zone", to: "/dashboard/settings/danger-zone", icon: TriangleAlert, visible: true },
              ]
                .filter((item) => item.visible)
                .map((item) => (
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
                      <div key={`${crumb.to}-${index}`} className="flex items-center gap-1 shrink-0">
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
                    <form
                      ref={searchContainerRef}
                      className="relative w-full max-w-xs"
                      onSubmit={handleSearchSubmit}
                    >
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Search anywhere..."
                        className="pl-9 cursor-text"
                      />
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute mt-2 w-full rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
                          {searchResults.map((result) => (
                            <button
                              key={result.to}
                              type="button"
                              onClick={() => {
                                navigate(result.to);
                                setSearchQuery("");
                                setShowSearchResults(false);
                              }}
                              className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {result.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </form>

                    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer relative"
                          aria-label="Notifications"
                        >
                          <Bell className="h-4 w-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground border-2 border-background">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border">
                        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30 shrink-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                                Notifications
                                <div className="flex bg-background/50 border border-border/50 p-0.5 rounded-lg">
                                  <Button
                                    variant={notificationFilter === "all" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setNotificationFilter("all")}
                                    className="h-7 text-xs px-3"
                                  >
                                    All History
                                  </Button>
                                  <Button
                                    variant={notificationFilter === "unread" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setNotificationFilter("unread")}
                                    className="h-7 text-xs px-3"
                                  >
                                    Unread
                                  </Button>
                                </div>
                              </DialogTitle>
                              <p className="text-xs text-muted-foreground mt-2 font-medium">
                                {unreadCount} Unread Messages
                              </p>
                            </div>
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer mr-6"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-2">
                          {filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <p className="text-base font-medium text-foreground">No notifications yet</p>
                              <p className="text-sm text-muted-foreground mt-1">Important updates appear here.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/40 space-y-1">
                              {filteredNotifications.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => markAsRead(item.id)}
                                  className={`group flex items-start gap-4 p-4 rounded-xl hover:bg-accent/50 transition-all cursor-pointer relative ${!item.isRead ? 'bg-primary/5' : ''}`}
                                >
                                  {!item.isRead && (
                                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-md" />
                                  )}

                                  <div className="mt-1 shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-background border border-border/50 flex items-center justify-center shadow-sm">
                                      {getNotificationIcon(item.type)}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                      <p className={`text-base truncate ${!item.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                                        {item.title}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                        <Clock className="h-3.5 w-3.5" />
                                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

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
                  <UsageBanner />
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

      {/* Global upgrade modal — triggered by 429 responses or socket limit events */}
      <UpgradeModalRoot />
    </div>
  );
}

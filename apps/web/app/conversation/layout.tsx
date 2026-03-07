"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import LogoutConfirmDialog from "@/components/auth/LogoutConfirmDialog";
import {
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrgSwitcher from "@/components/shared/OrgSwitcher";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = React.useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated && !isLoading) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  // Use auth user data
  const displayName = user?.name || "Agent";
  const userTeams = ["Agent"];

  const pathname = usePathname();
  const [showConversationsSubmenu, setShowConversationsSubmenu] = React.useState(false);
  const [showContactsSubmenu, setShowContactsSubmenu] = React.useState(false);
  const [showProfileSubmenu, setShowProfileSubmenu] = React.useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`bg-card shadow-lg flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300 ${isSidebarMinimized ? "w-20" : "w-64"}`}>
        {/* Logo/Header (Org Switcher) */}
        <div className={`p-4 border-b border-border relative z-50 flex items-center ${isSidebarMinimized ? "justify-center" : "justify-between"}`}>
          <div className={isSidebarMinimized ? "w-full" : "flex-1"}>
            <OrgSwitcher isMinimized={isSidebarMinimized} />
          </div>
          {!isSidebarMinimized && (
            <button
              onClick={() => setIsSidebarMinimized(true)}
              className="ml-2 p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors"
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
          {/* Conversations */}
          <div className="w-full">
            <Button
              onClick={() => !isSidebarMinimized && setShowConversationsSubmenu(!showConversationsSubmenu)}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/conversation/inbox")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Conversations" : undefined}
            >
              <MessageCircle className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
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
                {["My Conversations", "Assigned", "Archived"].map((item) => {
                  const slug = item.toLowerCase().replace(" ", "-");
                  return (
                    <Link key={slug} href={`/conversation/inbox/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname.includes(slug)
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
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/conversation/contacts")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Contacts" : undefined}
            >
              <UserIcon className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
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
                {["View Contacts"].map((item) => {
                  const slug = item.toLowerCase().replace(" ", "-");
                  return (
                    <Link key={slug} href={`/conversation/contacts/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname.includes(slug)
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

          {/* Profile */}
          <div className="w-full">
            <Button
              onClick={() => !isSidebarMinimized && setShowProfileSubmenu(!showProfileSubmenu)}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${isSidebarMinimized ? "justify-center" : ""} ${pathname.startsWith("/conversation/settings")
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              title={isSidebarMinimized ? "Profile" : undefined}
            >
              <Settings className={`h-5 w-5 ${isSidebarMinimized ? "" : "mr-3"}`} />
              {!isSidebarMinimized && (
                <>
                  <span className="flex-1 text-left">Profile</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showProfileSubmenu ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </Button>
            {showProfileSubmenu && !isSidebarMinimized && (
              <div className="ml-8 mt-1 space-y-1 relative before:absolute before:inset-y-0 before:left-[-14px] before:w-px before:bg-border">
                {["My Settings"].map((item) => {
                  const slug = item.toLowerCase().replace(" ", "-");
                  return (
                    <Link key={slug} href={`/conversation/settings/${slug}`}>
                      <Button
                        variant="ghost"
                        className={`w-full flex items-center px-3 py-1.5 text-sm cursor-pointer rounded-lg transition-colors ${pathname.includes(slug)
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
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userTeams.join(", ")}
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

      {/* Main Content Area - Full Width */}
      <main className="flex-1 p-6 bg-background overflow-auto h-screen">{children}</main>

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

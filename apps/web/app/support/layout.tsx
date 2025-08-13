"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import {
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated && !isLoading) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  // Use auth user data
  const displayName = user?.name || "Agent";
  const userTeams = user?.teams?.map((team) => team.name) || ["Support"];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                V
              </span>
            </div>
            <span className="text-xl font-medium text-foreground">Voxora</span>
          </div>
          <div className="hidden md:flex">
            <span className="text-sm text-muted-foreground ml-2 px-2 py-1 bg-muted rounded-full">
              Support Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
          <div className="h-8 border-l border-border mx-1"></div>
          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {userTeams.join(", ")}
              </p>
            </div>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <UserIcon className="h-4 w-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="Logout"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Secondary Navbar */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center">
        <nav className="flex space-x-2">
          <Link href="/support/dashboard">
            <Button variant="ghost" className="text-sm h-8" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
            </Button>
          </Link>
          {/* <Link href="/support/analytics">
              <Button variant="ghost" className="text-sm h-8" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </Link>
            <Link href="/support/settings">
              <Button variant="ghost" className="text-sm h-8" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link> */}
        </nav>
      </div>

      {/* Main Content Area - Full Width */}
      <main className="flex-1 overflow-auto bg-muted/20">{children}</main>
    </div>
  );
}

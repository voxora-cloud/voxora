"use client";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import { BarChart3, Crown, LogOut, UserCheck, Users } from "lucide-react";
import React, { useEffect } from "react";
import { Team, Agent } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.includes("/admin/team")) return "teams";
      if (path.includes("/admin/agent")) return "agents";
      if (path.includes("/admin/widget")) return "widgets";
    }
    return "overview";
  });

  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [agents, setAgents] = React.useState<Agent[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Only fetch data if authenticated and admin
    if (isAuthenticated && user?.role === "admin") {
      // Load teams and agents for counts
      const fetchData = async () => {
        try {
          const apiService = await import("@/lib/api").then(
            (m) => m.apiService,
          );

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
  }, [isAuthenticated, user?.role]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Access denied. Admin role required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card shadow-lg flex flex-col h-screen sticky top-0 border-r border-border">
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="Voxora Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <h1 className="ml-3 text-lg font-semibold text-foreground">
              Voxora Admin
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <Link href="/admin">
              <Button
                onClick={() => setActiveTab("overview")}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${
                  activeTab === "overview"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Dashboard</span>
              </Button>
            </Link>

            <Link href="/admin/team">
              <Button
                onClick={() => setActiveTab("teams")}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${
                  activeTab === "teams"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Teams</span>
                <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-1">
                  {teams?.length || 0}
                </span>
              </Button>
            </Link>

            <Link href="/admin/agent">
              <Button
                onClick={() => setActiveTab("agents")}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm cursor-pointer font-medium rounded-lg transition-colors ${
                  activeTab === "agents"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <UserCheck className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Agents</span>
                <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-1">
                  {agents?.length || 0}
                </span>
              </Button>
            </Link>

            <Link href="/admin/widget">
              <Button
                onClick={() => setActiveTab("widgets")}
                variant="ghost"
                className={`w-full flex items-center px-3 py-2 text-sm font-medium cursor-pointer rounded-lg transition-colors ${
                  activeTab === "widgets"
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Crown className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">Widgets</span>
              </Button>
            </Link>
        </nav>

        {/* User Profile & Logout */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Admin
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-background">{children}</div>
    </div>
  );
};

export default Layout;

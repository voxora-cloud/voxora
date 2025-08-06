"use client";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import { BarChart3, Crown, LogOut, UserCheck, Users } from "lucide-react";
import React, { useEffect } from "react";
import { Team, Agent } from "@/lib/api";

const Layout = ({ children }: { children: React.ReactNode }) => {
  // Set initial active tab based on the current path
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.includes("/admin/team")) return "teams";
      if (path.includes("/admin/agent")) return "agents";
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
          const apiService = await import("@/lib/api").then(m => m.apiService);
          
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="ml-3 text-lg font-semibold text-gray-900">
              Voxora Admin
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            <Button
              onClick={() => {
                setActiveTab("overview");
                window.location.href = "/admin";
              }}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "overview"
                  ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Overview
            </Button>

            <Button
              onClick={() => {
                setActiveTab("teams");
                window.location.href = "/admin/team";
              }}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "teams"
                  ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Users className="h-5 w-5 mr-3" />
              <span className="flex-1 text-left">Teams</span>
              <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-1">
                {teams?.length || 0}
              </span>
            </Button>

            <Button
              onClick={() => {
                setActiveTab("agents");
                window.location.href = "/admin/agent";
              }}
              variant="ghost"
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "agents"
                  ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <UserCheck className="h-5 w-5 mr-3" />
              <span className="flex-1 text-left">Agents</span>
              <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-1">
                {agents?.length || 0}
              </span>
            </Button>
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Admin
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-y-auto bg-gray-50">{children}</div>
      </div>
    </div>
  );
};

export default Layout;

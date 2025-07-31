"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { useTeams, useAgents, useDashboardStats } from "@/lib/hooks/useAdmin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  UserCheck,
  Trash2,
  Crown,
  Star,
  LogOut,
  AlertCircle
} from "lucide-react"

export function AdminDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const { 
    teams, 
    loading: teamsLoading, 
    error: teamsError, 
    deleteTeam 
  } = useTeams()
  
  const { 
    agents, 
    loading: agentsLoading, 
    error: agentsError, 
    deleteAgent 
  } = useAgents()
  
  const { 
    stats, 
    loading: statsLoading, 
    error: statsError 
  } = useDashboardStats()

  const [activeTab, setActiveTab] = useState<"teams" | "agents">("teams")
  
  // Filter states
  const [teamFilter, setTeamFilter] = useState({ search: "" })
  const [agentFilter, setAgentFilter] = useState({ 
    search: "", 
    role: "All" as "All" | "admin" | "agent"
  })

  // Handle authentication redirect
  useEffect(() => {
    console.log('Auth state:', { isLoading, isAuthenticated, user })
    if (!isLoading && !isAuthenticated) {
      console.log('Redirecting to login - not authenticated')
      window.location.href = '/login'
    }
  }, [isAuthenticated, isLoading, user])

  // Debug data loading
  useEffect(() => {
    console.log('Dashboard data:', { 
      teams, 
      agents, 
      stats, 
      teamsLoading, 
      agentsLoading, 
      statsLoading,
      teamsError,
      agentsError,
      statsError
    })
  }, [teams, agents, stats, teamsLoading, agentsLoading, statsLoading, teamsError, agentsError, statsError])

  // Show loading while checking authentication
  if (isLoading) {
    console.log('Showing loading spinner')
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated || user?.role !== 'admin') {
    console.log('Access denied:', { isAuthenticated, userRole: user?.role })
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Access denied. Admin role required.</div>
      </div>
    )
  }

  console.log('Rendering dashboard...')

  const handleDeleteTeam = async (teamId: string) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteTeam(teamId)
      } catch (error) {
        console.error('Failed to delete team:', error)
      }
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await deleteAgent(agentId)
      } catch (error) {
        console.error('Failed to delete agent:', error)
      }
    }
  }

  const filteredTeams = (teams || []).filter(team => 
    !teamFilter.search || 
    team.name?.toLowerCase().includes(teamFilter.search.toLowerCase()) ||
    team.description?.toLowerCase().includes(teamFilter.search.toLowerCase())
  )

  const filteredAgents = (agents || []).filter(agent => {
    if (agentFilter.search && !agent.email?.toLowerCase().includes(agentFilter.search.toLowerCase())) {
      return false
    }
    if (agentFilter.role !== "All" && agent.role !== agentFilter.role) {
      return false
    }
    return true
  })

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your teams, agents, and organization settings
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{user?.email}</span>
          </div>
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : statsError ? (
        <div className="text-red-500">Failed to load stats</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalTeams || teams?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active teams in your organization
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview?.totalAgents || agents?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active agents across all teams
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.overview?.onlineAgents || agents?.filter(a => a.inviteStatus === 'active').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently online agents
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === "teams" ? "default" : "ghost"}
            onClick={() => setActiveTab("teams")}
            className="px-4 py-2"
          >
            <Users className="h-4 w-4 mr-2" />
            Teams
          </Button>
          <Button
            variant={activeTab === "agents" ? "default" : "ghost"}
            onClick={() => setActiveTab("agents")}
            className="px-4 py-2"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Agents
          </Button>
        </div>

        {/* Teams Tab */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search teams..."
                    value={teamFilter.search}
                    onChange={(e) => setTeamFilter({ search: e.target.value })}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>

            {teamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : teamsError ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Failed to load teams
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <Card key={team.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{team.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Agents:</span>
                            <span>{team.agentCount || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Online Agents:</span>
                            <span>{team.onlineAgents || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Created:</span>
                            <span>{new Date(team.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center py-16">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                      <p className="text-gray-500 mb-4">Get started by creating your first team.</p>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Team
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === "agents" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search agents..."
                    value={agentFilter.search}
                    onChange={(e) => setAgentFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={agentFilter.role}
                  onChange={(e) => 
                    setAgentFilter(prev => ({ ...prev, role: e.target.value as typeof agentFilter.role }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-40"
                >
                  <option value="All">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                Invite Agent
              </Button>
            </div>

            {agentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse flex items-center space-x-4">
                        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : agentsError ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Failed to load agents
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agent) => (
                    <Card key={agent.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {agent.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-medium">{agent.name || agent.email}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                                  {agent.role}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  agent.inviteStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {agent.inviteStatus}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  agent.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {agent.status}
                                </span>
                                {agent.teams?.length > 0 && (
                                  <span>• {agent.teams.length} team{agent.teams.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAgent(agent.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
                      <p className="text-gray-500 mb-4">Invite your first agent to get started.</p>
                      <Button>
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Agent
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard

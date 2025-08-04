"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { useTeams, useAgents, useDashboardStats } from "@/lib/hooks/useAdmin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Search, 
  Mail, 
  UserCheck,
  Trash2,
  Crown,
  LogOut,
  AlertCircle,
  Plus,
  Edit3,
  BarChart3,
  Target,
  Activity,
  RotateCcw,
  Eye,
  X
} from "lucide-react"

import type { Team, Agent, CreateTeamData, CreateAgentData, UpdateTeamData, UpdateAgentData } from "@/lib/api"
import { apiService } from "@/lib/api"


import TeamForm from "./team/Form"
import AgentForm from "./agent/Form"
import Modal from "../ui/model"
import Spinner from "../ui/Spinner"

export interface TeamFormData {
  name: string
  description: string
  color?: string
}

export interface AgentFormData {
  name: string
  email: string
  role: 'admin' | 'agent'
  teamIds: string[]
}

function TeamDetailModal({ team, isOpen, onClose }: {
  team: Team | null
  isOpen: boolean
  onClose: () => void
}) {


  if (!isOpen || !team) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Team Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Team Header */}
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: team.color || '#3b82f6' }}
            >
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{team.name}</h3>
              <p className="text-gray-600">{team.description || 'No description provided'}</p>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold">{team.agentCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Online Agents</p>
              <p className="text-2xl font-bold text-green-600">{team.onlineAgents || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Team Color</p>
              <div className="flex items-center space-x-2 mt-2">
                <div 
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: team.color || '#3b82f6' }}
                ></div>
                <span className="text-sm">{team.color || '#3b82f6'}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-sm font-medium">{new Date(team.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function AgentDetailModal({ agent, isOpen, onClose }: {
  agent: Agent | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !agent) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Agent Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {agent.name?.charAt(0) || agent.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{agent.name || agent.email}</h3>
              <p className="text-gray-600">{agent.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {agent.role}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Account Status</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.inviteStatus === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : agent.inviteStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.inviteStatus}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Last Active</h4>
                <p className="text-sm text-gray-600">
                  {new Date(agent.lastActive).toLocaleString()}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Member Since</h4>
                <p className="text-sm text-gray-600">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Teams ({agent.teams?.length || 0})</h4>
              <div className="space-y-2">
                {agent.teams && agent.teams.length > 0 ? (
                  agent.teams.map((team) => (
                    <div key={team.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: team.color || '#3b82f6' }}
                      ></div>
                      <span className="text-sm">{team.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Not assigned to any teams</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const { 
    teams, 
    loading: teamsLoading, 
    error: teamsError, 
    createTeam,
    updateTeam,
    deleteTeam,
  } = useTeams()
  
  const { 
    agents, 
    loading: agentsLoading, 
    error: agentsError,
    updateAgent, 
    deleteAgent,
    resendInvite,
  } = useAgents()
  
  const { 
    stats, 
    loading: statsLoading,
  } = useDashboardStats()



  const [activeTab, setActiveTab] = useState<"overview" | "teams" | "agents">("overview")
  

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false)
  const [isTeamDetailModalOpen, setIsTeamDetailModalOpen] = useState(false)
  const [isAgentDetailModalOpen, setIsAgentDetailModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null)
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null)
  
  
  const [operationLoading, setOperationLoading] = useState<{
    teamCreate: boolean
    teamUpdate: boolean
    teamDelete: string | null
    agentCreate: boolean
    agentUpdate: boolean
    agentDelete: string | null
    agentResendInvite: string | null
  }>({
    teamCreate: false,
    teamUpdate: false,
    teamDelete: null,
    agentCreate: false,
    agentUpdate: false,
    agentDelete: null,
    agentResendInvite: null
  })
  

  const [teamFilter, setTeamFilter] = useState({ search: "" })
  const [agentFilter, setAgentFilter] = useState({ 
    search: "", 
    role: "All" as "All" | "admin" | "agent"
  })


  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isAuthenticated, isLoading])

 
  if (isLoading) {
      <Spinner />
  }



  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Access denied. Admin role required.</div>
      </div>
    )
  }


  const handleCreateTeam = async (data: TeamFormData) => {
    setOperationLoading(prev => ({ ...prev, teamCreate: true }))
    try {
      const createData: CreateTeamData = {
        name: data.name,
        description: data.description,
        color: data.color
      }
      
      await createTeam(createData)
      setIsTeamModalOpen(false)
      showToast(`Team "${data.name}" created successfully`, 'success')
    } catch (error) {
      console.error('Failed to create team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create team'
      showToast(errorMessage, 'error')
    } finally {
      setOperationLoading(prev => ({ ...prev, teamCreate: false }))
    }
  }

  const handleUpdateTeam = async (data: TeamFormData) => {
    if (!editingTeam) return
    
    setOperationLoading(prev => ({ ...prev, teamUpdate: true }))
    try {
      const updateData: UpdateTeamData = {
        name: data.name,
        description: data.description,
        color: data.color
      }

      await updateTeam(editingTeam._id, updateData)
      // Refresh team and stats data after successful update
  
      setEditingTeam(null)
      setIsTeamModalOpen(false)
      showToast(`Team "${data.name}" updated successfully`, 'success')
    } catch (error) {
      console.error('Failed to update team:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update team'
      showToast(errorMessage, 'error')
    } finally {
      setOperationLoading(prev => ({ ...prev, teamUpdate: false }))
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams?.find(t => t.id === teamId)
    const teamName = team?.name || 'this team'
    
    if (window.confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone and will remove all agents from this team.`)) {
      setOperationLoading(prev => ({ ...prev, teamDelete: teamId }))
      try {
        await deleteTeam(teamId)

        showToast(`Team "${teamName}" deleted successfully`, 'success')
      } catch (error) {
        console.error('Failed to delete team:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete team'
        showToast(errorMessage, 'error')
      } finally {
        setOperationLoading(prev => ({ ...prev, teamDelete: null }))
      }
    }
  }

  const handleCreateAgent = async (data: AgentFormData) => {
    setOperationLoading(prev => ({ ...prev, agentCreate: true }))
    try {
      const createData: CreateAgentData = {
        name: data.name,
        email: data.email,
        role: 'agent', 
        teamIds: data.teamIds
      }

      console.log("Creating agent with data:", createData)

      const result = await apiService.inviteAgent(createData)
      if (result.success) {
    
        setIsAgentModalOpen(false)
        showToast(`Invitation sent to "${data.name}" (${data.email})`, 'success')
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite agent'
      showToast(errorMessage, 'error')
    } finally {
      setOperationLoading(prev => ({ ...prev, agentCreate: false }))
    }
  }

  const handleUpdateAgent = async (data: AgentFormData) => {
    if (!editingAgent) return
    
    setOperationLoading(prev => ({ ...prev, agentUpdate: true }))
    try {
      const updateData: UpdateAgentData = {
        name: data.name,
        role: 'agent', 
        teamIds: data.teamIds
      }
      console.log("Updating agent with data:", updateData)

      if (data.email !== editingAgent.email) {
        updateData.email = data.email
      }
      
      // Actually call the updateAgent function to send the update to the API
      await updateAgent(editingAgent._id, updateData)
      
      setEditingAgent(null)
      setIsAgentModalOpen(false)
      showToast(`Agent "${data.name}" updated successfully`, 'success')
    } catch (error) {
      console.error('Failed to update agent:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update agent'
      showToast(errorMessage, 'error')
    } finally {
      setOperationLoading(prev => ({ ...prev, agentUpdate: false }))
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents?.find(a => a._id === agentId)
    const agentName = agent?.name || agent?.email || 'this agent'
    
    if (window.confirm(`Are you sure you want to delete "${agentName}"? This will permanently remove their account and access to the system.`)) {
      setOperationLoading(prev => ({ ...prev, agentDelete: agentId }))
      try {
        await deleteAgent(agentId)
 
        showToast(`Agent "${agentName}" deleted successfully`, 'success')
      } catch (error) {
        console.error('Failed to delete agent:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete agent'
        showToast(errorMessage, 'error')
      } finally {
        setOperationLoading(prev => ({ ...prev, agentDelete: null }))
      }
    }
  }

  const handleResendInvite = async (agentId: string) => {
    setOperationLoading(prev => ({ ...prev, agentResendInvite: agentId }))
    try {
      const inviteLink = await resendInvite(agentId)
      if (inviteLink) {

        showToast('Invitation resent successfully', 'success')
      }
    } catch (error) {
      console.error('Failed to resend invite:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend invitation'
      showToast(errorMessage, 'error')
    } finally {
      setOperationLoading(prev => ({ ...prev, agentResendInvite: null }))
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="ml-3 text-lg font-semibold text-gray-900">Voxora Admin</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "overview"
                  ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab("teams")}
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
            </button>

            <button
              onClick={() => setActiveTab("agents")}
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
            </button>
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" size="sm" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "teams" && "Team Management"}
                {activeTab === "agents" && "Agent Management"}
              </h2>
              <p className="text-gray-600 mt-1">
                {activeTab === "overview" && "Monitor your customer support performance"}
                {activeTab === "teams" && "Organize your support agents into teams"}
                {activeTab === "agents" && "Manage your customer support agents"}
              </p>
            </div>
            {/* Quick Actions */}
            {activeTab === "teams" && (
              <Button onClick={() => setIsTeamModalOpen(true)} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
            {activeTab === "agents" && (
              <Button onClick={() => setIsAgentModalOpen(true)} className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Invite Agent
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome back, Admin!</h2>
              <p className="text-blue-100">
                Here&apos;s an overview of your customer support organization
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Teams</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.overview?.totalTeams || teams?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Agents</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.overview?.totalAgents || agents?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Activity className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Online Agents</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.overview?.onlineAgents || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {statsLoading ? "..." : stats?.overview?.pendingInvites || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Management
                  </CardTitle>
                  <CardDescription>
                    Create and organize teams for better customer support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsTeamModalOpen(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Team
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Agent Management
                  </CardTitle>
                  <CardDescription>
                    Invite agents and assign them to teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setIsAgentModalOpen(true)}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invite New Agent
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {stats?.recentAgents && stats.recentAgents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Agent Activity</CardTitle>
                  <CardDescription>Latest agent invitations and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentAgents.slice(0, 5).map((agent) => (
                      <div key={agent._id} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {agent.name?.charAt(0) || agent.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{agent.name || agent.email}</p>
                          <p className="text-xs text-gray-500">
                            {agent.inviteStatus === 'pending' ? 'Invitation sent' : 'Joined the team'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* Teams Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Teams</h2>
                <p className="text-gray-600">Organize your support agents into teams</p>
              </div>
            </div>

            {/* Teams Search */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search teams..."
                  value={teamFilter.search}
                  onChange={(e) => setTeamFilter({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Teams Grid */}
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
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load teams</h3>
                  <p className="text-gray-500">Please try refreshing the page</p>
                </div>
              </div>
            ) : filteredTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: team.color || '#3b82f6' }}
                          >
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {team.description || 'No description'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingTeam(team)
                              setIsTeamDetailModalOpen(true)
                            }}
                            title="View Team Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTeam(team)
                              setIsTeamModalOpen(true)
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeam(team._id)}
                            disabled={operationLoading.teamDelete === team._id}
                          >
                            {operationLoading.teamDelete === team._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Agents:</span>
                          <span className="font-medium">{team.agentCount || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Online:</span>
                          <span className="font-medium text-green-600">{team.onlineAgents || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-500">
                            {new Date(team.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
                  <p className="text-gray-500 mb-4">
                    {teamFilter.search ? 'Try adjusting your search' : 'Get started by creating your first team'}
                  </p>
                  <Button onClick={() => setIsTeamModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-6">
            {/* Agents Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
                <p className="text-gray-600">Manage your customer support agents</p>
              </div>
            </div>

            {/* Agents Search and Filter */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search agents..."
                  value={agentFilter.search}
                  onChange={(e) => setAgentFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <select
                value={agentFilter.role}
                onChange={(e) => 
                  setAgentFilter(prev => ({ ...prev, role: e.target.value as typeof agentFilter.role }))
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="All">All Roles</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            {/* Agents List */}
            {agentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse flex items-center space-x-4">
                        <div className="rounded-full bg-gray-200 h-12 w-12"></div>
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
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load agents</h3>
                  <p className="text-gray-500">Please try refreshing the page</p>
                </div>
              </div>
            ) : filteredAgents.length > 0 ? (
              <div className="space-y-4">
                {filteredAgents.map((agent) => (
                  <Card key={agent.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {agent.name?.charAt(0) || agent.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {agent.name || agent.email}
                            </h3>
                            <p className="text-sm text-gray-500">{agent.email}</p>
                            <div className="flex items-center space-x-3 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                agent.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {agent.role}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                agent.inviteStatus === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : agent.inviteStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {agent.inviteStatus}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                agent.status === 'online' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {agent.status}
                              </span>
                              {agent.teams?.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  • {agent.teams.length} team{agent.teams.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingAgent(agent)
                              setIsAgentDetailModalOpen(true)
                            }}
                            title="View Agent Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAgent(agent)
                              setIsAgentModalOpen(true)
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {agent.inviteStatus === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvite(agent.id)}
                              title="Resend Invite"
                              disabled={operationLoading.agentResendInvite === agent.id}
                            >
                              {operationLoading.agentResendInvite === agent.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id)}
                            disabled={operationLoading.agentDelete === agent.id}
                          >
                            {operationLoading.agentDelete === agent.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
                  <p className="text-gray-500 mb-4">
                    {agentFilter.search ? 'Try adjusting your search' : 'Get started by inviting your first agent'}
                  </p>
                  <Button onClick={() => setIsAgentModalOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Agent
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isTeamModalOpen} 
        onClose={() => {
          setIsTeamModalOpen(false)
          setEditingTeam(null)
        }}
        title={editingTeam ? "Edit Team" : "Create New Team"}
      >
        <TeamForm 
          team={editingTeam}
          onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam}
          onCancel={() => {
            setIsTeamModalOpen(false)
            setEditingTeam(null)
          }}
          isLoading={editingTeam ? operationLoading.teamUpdate : operationLoading.teamCreate}
        />
      </Modal>

      <Modal 
        isOpen={isAgentModalOpen} 
        onClose={() => {
          setIsAgentModalOpen(false)
          setEditingAgent(null)
        }}
        title={editingAgent ? "Edit Agent" : "Invite New Agent"}
      >
        <AgentForm 
          agent={editingAgent}
          teams={teams || []}
          onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
          onCancel={() => {
            setIsAgentModalOpen(false)
            setEditingAgent(null)
          }}
          isLoading={editingAgent ? operationLoading.agentUpdate : operationLoading.agentCreate}
        />
      </Modal>

      {/* Detail Modals */}
      <TeamDetailModal 
        team={viewingTeam}
        isOpen={isTeamDetailModalOpen}
        onClose={() => {
          setIsTeamDetailModalOpen(false)
          setViewingTeam(null)
        }}
      />

      <AgentDetailModal 
        agent={viewingAgent}
        isOpen={isAgentDetailModalOpen}
        onClose={() => {
          setIsAgentDetailModalOpen(false)
          setViewingAgent(null)
        }}
      />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

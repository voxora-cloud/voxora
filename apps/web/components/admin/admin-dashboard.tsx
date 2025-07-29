"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Plus, 
  Settings, 
  Bell, 
  Search, 
  Mail, 
  UserCheck,
  Edit,
  Trash2,
  Crown,
  Star,
  LogOut,
  Save
} from "lucide-react"

interface Team {
  id: string
  name: string
  description: string
  agentCount: number
  onlineAgents: number
  createdAt: Date
}

interface Agent {
  id: string
  name: string
  email: string
  role: "Admin" | "Manager" | "Agent"
  teams: string[]
  status: "Online" | "Offline" | "Busy"
  avatar?: string
  lastActive: Date
  inviteStatus: "Pending" | "Active" | "Inactive"
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"teams" | "agents">("teams")
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteAgent, setShowInviteAgent] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  
  // Filter states
  const [agentFilter, setAgentFilter] = useState({
    role: "All",
    team: "All", 
    status: "All",
    search: ""
  })
  
  const [teams, setTeams] = useState<Team[]>([
    {
      id: "1",
      name: "Support",
      description: "Customer support and technical assistance",
      agentCount: 8,
      onlineAgents: 5,
      createdAt: new Date(Date.now() - 86400000)
    },
    {
      id: "2", 
      name: "Sales",
      description: "Sales team for lead conversion and demos",
      agentCount: 4,
      onlineAgents: 3,
      createdAt: new Date(Date.now() - 172800000)
    },
    {
      id: "3",
      name: "Technical",
      description: "Advanced technical support and integration help",
      agentCount: 3,
      onlineAgents: 2,
      createdAt: new Date(Date.now() - 259200000)
    }
  ])

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Sarah Williams",
      email: "sarah@company.com",
      role: "Manager",
      teams: ["Support", "Technical"],
      status: "Online",
      lastActive: new Date(),
      inviteStatus: "Active"
    },
    {
      id: "2",
      name: "John Smith", 
      email: "john@company.com",
      role: "Agent",
      teams: ["Support"],
      status: "Online",
      lastActive: new Date(Date.now() - 300000),
      inviteStatus: "Active"
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@company.com", 
      role: "Admin",
      teams: ["Sales", "Support"],
      status: "Offline",
      lastActive: new Date(Date.now() - 3600000),
      inviteStatus: "Active"
    },
    {
      id: "4",
      name: "Emma Davis",
      email: "emma@company.com",
      role: "Agent", 
      teams: ["Sales"],
      status: "Busy",
      lastActive: new Date(Date.now() - 900000),
      inviteStatus: "Pending"
    },
    {
      id: "5",
      name: "Alex Chen",
      email: "alex@company.com",
      role: "Agent",
      teams: ["Technical"],
      status: "Online",
      lastActive: new Date(Date.now() - 600000),
      inviteStatus: "Active"
    }
  ])

  // Team CRUD operations
  const handleCreateTeam = (teamData: { name: string; description: string }) => {
    const newTeam: Team = {
      id: Date.now().toString(),
      name: teamData.name,
      description: teamData.description,
      agentCount: 0,
      onlineAgents: 0,
      createdAt: new Date()
    }
    setTeams(prev => [...prev, newTeam])
    setShowCreateTeam(false)
  }

  const handleUpdateTeam = (teamId: string, teamData: { name: string; description: string }) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, ...teamData } : team
    ))
    setEditingTeam(null)
  }

  const handleDeleteTeam = (teamId: string) => {
    if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      setTeams(prev => prev.filter(team => team.id !== teamId))
      // Also remove team from agents
      setAgents(prev => prev.map(agent => ({
        ...agent,
        teams: agent.teams.filter(team => teams.find(t => t.id === teamId)?.name !== team)
      })))
    }
  }

  // Agent CRUD operations
  const handleInviteAgent = (agentData: { name: string; email: string; role: Agent['role']; teams: string[] }) => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: agentData.name,
      email: agentData.email,
      role: agentData.role,
      teams: agentData.teams,
      status: "Offline",
      lastActive: new Date(),
      inviteStatus: "Pending"
    }
    setAgents(prev => [...prev, newAgent])
    setShowInviteAgent(false)
  }

  const handleUpdateAgent = (agentId: string, agentData: { name: string; email: string; role: Agent['role']; teams: string[] }) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...agentData } : agent
    ))
    setEditingAgent(null)
  }

  const handleDeleteAgent = (agentId: string) => {
    if (confirm("Are you sure you want to remove this agent? This action cannot be undone.")) {
      setAgents(prev => prev.filter(agent => agent.id !== agentId))
    }
  }

  // Filter logic
  const filteredAgents = agents.filter(agent => {
    if (agentFilter.search && !agent.name.toLowerCase().includes(agentFilter.search.toLowerCase()) && 
        !agent.email.toLowerCase().includes(agentFilter.search.toLowerCase())) {
      return false
    }
    if (agentFilter.role !== "All" && agent.role !== agentFilter.role) {
      return false
    }
    if (agentFilter.team !== "All" && !agent.teams.includes(agentFilter.team)) {
      return false
    }
    if (agentFilter.status !== "All" && agent.status !== agentFilter.status) {
      return false
    }
    return true
  })

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      // Implement logout logic here
      window.location.href = "/"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online": return "text-green-500"
      case "Offline": return "text-gray-500"
      case "Busy": return "text-yellow-500"
      default: return "text-gray-500"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin": return <Crown className="h-4 w-4" />
      case "Manager": return <Star className="h-4 w-4" />
      case "Agent": return <UserCheck className="h-4 w-4" />
      default: return <UserCheck className="h-4 w-4" />
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">V</span>
              </div>
              <span className="text-xl font-bold text-foreground">Voxora Admin</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">F</span>
              </div>
              <span className="text-sm font-medium">Founder</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Button 
              variant={activeTab === "teams" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("teams")}
            >
              <Users className="mr-2 h-4 w-4" />
              Teams
              <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                {teams.length}
              </span>
            </Button>
            <Button 
              variant={activeTab === "agents" ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setActiveTab("agents")}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Agents
              <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                {agents.filter(a => a.inviteStatus === "Active").length}
              </span>
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "teams" ? (
            <div>
              {/* Teams Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Teams</h1>
                  <p className="text-muted-foreground">Manage your support teams and organization</p>
                </div>
                <Button onClick={() => setShowCreateTeam(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Button>
              </div>

              {/* Teams Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription>{team.description}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingTeam(team)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Agents</span>
                          <span className="font-medium">{team.agentCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Online Now</span>
                          <span className="font-medium text-green-600">{team.onlineAgents}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {team.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Agents Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Agents</h1>
                  <p className="text-muted-foreground">Manage your team members and their permissions</p>
                </div>
                <Button onClick={() => setShowInviteAgent(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite Agent
                </Button>
              </div>

              {/* Search and Filters */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search agents..." 
                    className="pl-10" 
                    value={agentFilter.search}
                    onChange={(e) => setAgentFilter(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                
                <select 
                  className="flex h-10 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={agentFilter.role}
                  onChange={(e) => setAgentFilter(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Agent">Agent</option>
                </select>

                <select 
                  className="flex h-10 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={agentFilter.team}
                  onChange={(e) => setAgentFilter(prev => ({ ...prev, team: e.target.value }))}
                >
                  <option value="All">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>

                <select 
                  className="flex h-10 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={agentFilter.status}
                  onChange={(e) => setAgentFilter(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="All">All Status</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Busy">Busy</option>
                </select>
              </div>

              {/* Agents List */}
              <div className="space-y-4">
                {filteredAgents.map((agent) => (
                  <Card key={agent.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {agent.name.split(" ").map(n => n[0]).join("")}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-foreground">{agent.name}</h3>
                              {getRoleIcon(agent.role)}
                              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                                {agent.role}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{agent.email}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`text-xs flex items-center ${getStatusColor(agent.status)}`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${
                                  agent.status === "Online" ? "bg-green-500" :
                                  agent.status === "Busy" ? "bg-yellow-500" : "bg-gray-500"
                                }`} />
                                {agent.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Teams: {agent.teams.join(", ")}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {agent.inviteStatus === "Pending" && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Pending Invite
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Last active: {formatTime(agent.lastActive)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingAgent(agent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAgent(agent.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredAgents.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No agents found matching your filters.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <TeamModal
          isOpen={showCreateTeam}
          onClose={() => setShowCreateTeam(false)}
          onSave={handleCreateTeam}
          title="Create New Team"
        />
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <TeamModal
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={(data) => handleUpdateTeam(editingTeam.id, data)}
          title="Edit Team"
          initialData={editingTeam}
        />
      )}

      {/* Invite Agent Modal */}
      {showInviteAgent && (
        <AgentModal
          isOpen={showInviteAgent}
          onClose={() => setShowInviteAgent(false)}
          onSave={handleInviteAgent}
          title="Invite New Agent"
          teams={teams}
        />
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <AgentModal
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          onSave={(data) => handleUpdateAgent(editingAgent.id, data)}
          title="Edit Agent"
          teams={teams}
          initialData={editingAgent}
        />
      )}
    </div>
  )
}

// Team Modal Component
interface TeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string }) => void
  title: string
  initialData?: { name: string; description: string }
}

function TeamModal({ isOpen, onClose, onSave, title, initialData }: TeamModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim() && formData.description.trim()) {
      onSave(formData)
      setFormData({ name: "", description: "" })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {initialData ? "Update team information" : "Add a new team to organize your agents"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input 
                placeholder="e.g., Support, Sales, Technical" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input 
                placeholder="Brief description of team purpose" 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {initialData ? "Update" : "Create"} Team
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Agent Modal Component
interface AgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; email: string; role: Agent['role']; teams: string[] }) => void
  title: string
  teams: Team[]
  initialData?: { name: string; email: string; role: Agent['role']; teams: string[] }
}

function AgentModal({ isOpen, onClose, onSave, title, teams, initialData }: AgentModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    role: initialData?.role || "Agent" as Agent['role'],
    teams: initialData?.teams || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim() && formData.email.trim() && formData.teams.length > 0) {
      onSave(formData)
      setFormData({ name: "", email: "", role: "Agent", teams: [] })
    }
  }

  const handleTeamToggle = (teamName: string) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams.includes(teamName)
        ? prev.teams.filter(t => t !== teamName)
        : [...prev.teams, teamName]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {initialData ? "Update agent information" : "Send an invitation to join your team"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input 
                placeholder="John Doe" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                placeholder="agent@company.com" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select 
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Agent['role'] }))}
              >
                <option value="Agent">Agent</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teams</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-border" 
                      checked={formData.teams.includes(team.name)}
                      onChange={() => handleTeamToggle(team.name)}
                    />
                    <span className="text-sm">{team.name}</span>
                  </label>
                ))}
              </div>
              {formData.teams.length === 0 && (
                <p className="text-xs text-red-500">Please select at least one team</p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {initialData ? "Update" : "Invite"} Agent
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

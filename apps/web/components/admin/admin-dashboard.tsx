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
  MoreVertical, 
  Mail, 
  Shield, 
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Crown,
  Star
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
  
  const [teams] = useState<Team[]>([
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

  const [agents] = useState<Agent[]>([
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
    }
  ])

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
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
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
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
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

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search agents..." className="pl-10 max-w-sm" />
              </div>

              {/* Agents List */}
              <div className="space-y-4">
                {agents.map((agent) => (
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
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal Placeholder */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Team</CardTitle>
              <CardDescription>Add a new team to organize your agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input placeholder="e.g., Support, Sales, Technical" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input placeholder="Brief description of team purpose" />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateTeam(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1">Create Team</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Agent Modal Placeholder */}
      {showInviteAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite New Agent</CardTitle>
              <CardDescription>Send an invitation to join your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" placeholder="agent@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="Agent">Agent</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teams</label>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <label key={team.id} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border" />
                      <span className="text-sm">{team.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowInviteAgent(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1">Send Invite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'agent' | 'admin' | 'founder'
  companyName?: string
  teams?: Array<{ id: string; name: string; color?: string }>
  permissions?: string[]
  status?: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  message?: string
  statusCode?: number
}

export interface FounderRegistrationData {
  name: string
  email: string
  password: string
  companyName: string
}

export interface LoginData {
  email: string
  password: string
}

export interface Team {
  id: string
  name: string
  description: string
  color?: string
  agentCount?: number
  onlineAgents?: number
  createdAt: Date
  updatedAt?: Date
}

export interface Agent {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent' | 'manager'
  teams: Array<{ id: string; name: string; color?: string }>
  status: 'online' | 'offline' | 'busy'
  avatar?: string
  lastActive: Date
  inviteStatus: 'pending' | 'active' | 'inactive'
  permissions?: string[]
  createdAt: Date
  updatedAt?: Date
}

export interface CreateTeamData {
  name: string
  description: string
  color?: string
}

export interface UpdateTeamData {
  name?: string
  description?: string
  color?: string
}

export interface CreateAgentData {
  name: string
  email: string
  role: 'admin' | 'agent' | 'manager'
  teamIds: string[]
  permissions?: string[]
}

export interface UpdateAgentData {
  name?: string
  email?: string
  role?: 'admin' | 'agent' | 'manager'
  teamIds?: string[]
  permissions?: string[]
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken()
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
        // console.log(`Making request to ${API_BASE_URL}  ${endpoint} with options:`, config)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Token management
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('token', token)
  }

  removeToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // User management
  setUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('user', JSON.stringify(user))
  }

  getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  // Auth API methods
  async adminSignup(data: FounderRegistrationData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/admin/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async adminLogin(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async agentLogin(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/agent/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  // Team Management APIs
  async getTeams(): Promise<{ success: boolean; data: Team[] }> {
    return this.makeRequest<{ success: boolean; data: Team[] }>('/admin/teams', {
      method: 'GET',
    })
  }

  async createTeam(data: CreateTeamData): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>('/admin/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTeam(teamId: string, data: UpdateTeamData): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>(`/admin/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTeam(teamId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/admin/teams/${teamId}`, {
      method: 'DELETE',
    })
  }

  async getTeamById(teamId: string): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>(`/admin/teams/${teamId}`, {
      method: 'GET',
    })
  }

  // Agent Management APIs
  async getAgents(): Promise<{ success: boolean; data: Agent[] }> {
    return this.makeRequest<{ success: boolean; data: Agent[] }>('/admin/agents', {
      method: 'GET',
    })
  }

  async createAgent(data: CreateAgentData): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>('/admin/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAgent(agentId: string, data: UpdateAgentData): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(`/admin/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAgent(agentId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/admin/agents/${agentId}`, {
      method: 'DELETE',
    })
  }

  async getAgentById(agentId: string): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(`/admin/agents/${agentId}`, {
      method: 'GET',
    })
  }

  async inviteAgent(data: CreateAgentData): Promise<{ success: boolean; data: Agent; inviteLink?: string }> {
    return this.makeRequest<{ success: boolean; data: Agent; inviteLink?: string }>('/admin/agents/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async resendInvite(agentId: string): Promise<{ success: boolean; inviteLink?: string }> {
    return this.makeRequest<{ success: boolean; inviteLink?: string }>(`/admin/agents/${agentId}/resend-invite`, {
      method: 'POST',
    })
  }

  async activateAgent(agentId: string): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(`/admin/agents/${agentId}/activate`, {
      method: 'POST',
    })
  }

  async deactivateAgent(agentId: string): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(`/admin/agents/${agentId}/deactivate`, {
      method: 'POST',
    })
  }

  // Analytics and Stats APIs
  async getDashboardStats(): Promise<{ 
    success: boolean; 
    data: {
      totalTeams: number;
      totalAgents: number;
      activeAgents: number;
      totalConversations: number;
      activeConversations: number;
      avgResponseTime: number;
    }
  }> {
    return this.makeRequest<{ 
      success: boolean; 
      data: {
        totalTeams: number;
        totalAgents: number;
        activeAgents: number;
        totalConversations: number;
        activeConversations: number;
        avgResponseTime: number;
      }
    }>('/admin/stats/dashboard', {
      method: 'GET',
    })
  }

  async getTeamStats(teamId: string): Promise<{ 
    success: boolean; 
    data: {
      teamId: string;
      agentCount: number;
      onlineAgents: number;
      totalConversations: number;
      avgResponseTime: number;
    }
  }> {
    return this.makeRequest<{ 
      success: boolean; 
      data: {
        teamId: string;
        agentCount: number;
        onlineAgents: number;
        totalConversations: number;
        avgResponseTime: number;
      }
    }>(`/admin/stats/teams/${teamId}`, {
      method: 'GET',
    })
  }

  // Auth state methods
  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  logout(): void {
    this.removeToken()
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}

export const apiService = new ApiService()

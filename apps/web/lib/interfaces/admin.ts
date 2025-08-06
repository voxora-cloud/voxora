// Admin interfaces for Voxora application

// Dashboard statistics interfaces
export interface DashboardOverview {
  totalTeams: number;
  totalAgents: number;
  onlineAgents: number;
  pendingInvites: number;
}

export interface TeamStat {
  _id: string;
  name: string;
  agentCount: number;
  onlineAgents: number;
  color?: string;
}

export interface RecentAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
  inviteStatus?: string;
  createdAt: string;
}

export interface DashboardStats {
  overview: DashboardOverview;
  teamStats: TeamStat[];
  recentAgents: RecentAgent[];
}

export interface TeamStats {
  teamId: string;
  agentCount: number;
  onlineAgents: number;
  totalConversations: number;
  avgResponseTime: number;
}

// Form data interfaces for admin operations
export interface TeamFormData {
  name: string;
  description: string;
  color?: string;
}

export interface AgentFormData {
  name: string;
  email: string;
  role: 'agent';
  teamIds: string[];
  permissions?: string[];
    password?: string; // Optional for existing agents
}

// Response interfaces for admin API calls
export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface TeamStatsResponse {
  success: boolean;
  data: TeamStats;
}

// Pagination interface for listing data
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

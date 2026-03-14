export interface Agent {
  _id: string;
  membershipId?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    lastSeen?: Date;
    isActive?: boolean;
  };
  role: "admin" | "agent";
  teams: Array<{ _id: string; name: string; color?: string }>;
  status: "online" | "offline" | "busy";
  avatar?: string;
  lastSeen: Date;
  inviteStatus: "pending" | "active" | "inactive";
  permissions?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface InviteAgentData {
  name: string;
  email: string;
  role: "agent";
  teamIds: string[];
  permissions?: string[];
  password?: string;
}

export interface UpdateAgentData {
  name?: string;
  email?: string;
  role?: "agent";
  teamIds?: string[];
  permissions?: string[];
}

export interface AgentFormData {
  name: string;
  email: string;
  role: "agent";
  teamIds: string[];
  password?: string;
}

export interface AgentsResponse {
  success: boolean;
  data: {
    agents: Agent[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface AgentResponse {
  success: boolean;
  data: Agent;
}

export interface InviteResponse {
  success: boolean;
  data: Agent;
  inviteLink?: string;
}

export interface ResendInviteResponse {
  success: boolean;
  inviteLink?: string;
}

export interface DeleteResponse {
  success: boolean;
}
export interface Team {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  agentCount?: number;
  onlineAgents?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTeamData {
  name: string;
  description: string;
  color?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  color?: string;
}

export interface TeamFormData {
  name: string;
  description: string;
  color: string;
}


export interface TeamsResponse {
  success: boolean;
  data: {
    teams: Team[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface TeamResponse {
  success: boolean;
  data: Team;
}

export interface DeleteResponse {
  success: boolean;
}
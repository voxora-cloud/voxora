import { DashboardStats, TeamStats } from "./interfaces/admin";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "agent" | "admin" | "founder";
  companyName?: string;
  teams?: Array<{ id: string; name: string; color?: string }>;
  permissions?: string[];
  status?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  message?: string;
  statusCode?: number;
}

export interface AdminRegistrationData {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  color?: string;
  agentCount?: number;
  onlineAgents?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Agent {
  _id: string;
  name: string;
  email: string;
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

export interface CreateAgentData {
  name: string;
  email: string;
  role: "agent"; // Always agent
  teamIds: string[];
  permissions?: string[];
  password?: string;
}

export interface UpdateAgentData {
  name?: string;
  email?: string;
  role?: "agent"; // Always agent
  teamIds?: string[];
  permissions?: string[];
}

export interface CreateWidgetData {
  _id?: string;
  displayName: string;
  backgroundColor: string;
  logoUrl: string;
}

export interface UpdateWidgetData {
  displayName?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface Widget {
  _id: string;
  displayName: string;
  backgroundColor: string;
  logoUrl: string;
  createdAt: Date;
  updatedAt?: Date;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      // console.log(`Making request to ${API_BASE_URL}  ${endpoint} with options:`, config)
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Token management
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("token", token);
  }

  removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // User management
  setUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("user", JSON.stringify(user));
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  // Auth API methods
  async adminSignup(data: AdminRegistrationData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/admin/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adminLogin(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async agentLogin(data: LoginData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/agent/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Team Management APIs
  async getTeams(): Promise<{
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
  }> {
    return this.makeRequest<{
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
    }>("/admin/teams", {
      method: "GET",
    });
  }

  async createTeam(
    data: CreateTeamData,
  ): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>("/admin/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTeam(
    teamId: string,
    data: UpdateTeamData,
  ): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>(
      `/admin/teams/${teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteTeam(teamId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/admin/teams/${teamId}`, {
      method: "DELETE",
    });
  }

  async getTeamById(teamId: string): Promise<{ success: boolean; data: Team }> {
    return this.makeRequest<{ success: boolean; data: Team }>(
      `/admin/teams/${teamId}`,
      {
        method: "GET",
      },
    );
  }

  // Agent Management APIs
  async getAgents(): Promise<{
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
  }> {
    return this.makeRequest<{
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
    }>("/admin/agents", {
      method: "GET",
    });
  }

  async createAgent(
    data: CreateAgentData,
  ): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(
      "/admin/agents",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async updateAgent(
    agentId: string,
    data: UpdateAgentData,
  ): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(
      `/admin/agents/${agentId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteAgent(agentId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/admin/agents/${agentId}`, {
      method: "DELETE",
    });
  }

  async getAgentById(
    agentId: string,
  ): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(
      `/admin/agents/${agentId}`,
      {
        method: "GET",
      },
    );
  }

  async inviteAgent(
    data: CreateAgentData,
  ): Promise<{ success: boolean; data: Agent; inviteLink?: string }> {
    return this.makeRequest<{
      success: boolean;
      data: Agent;
      inviteLink?: string;
    }>("/admin/agents/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resendInvite(
    agentId: string,
  ): Promise<{ success: boolean; inviteLink?: string }> {
    return this.makeRequest<{ success: boolean; inviteLink?: string }>(
      `/admin/agents/${agentId}/resend-invite`,
      {
        method: "POST",
      },
    );
  }

  async acceptInvite(token: string): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async activateAgent(
    agentId: string,
  ): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(
      `/admin/agents/${agentId}/activate`,
      {
        method: "POST",
      },
    );
  }

  async deactivateAgent(
    agentId: string,
  ): Promise<{ success: boolean; data: Agent }> {
    return this.makeRequest<{ success: boolean; data: Agent }>(
      `/admin/agents/${agentId}/deactivate`,
      {
        method: "POST",
      },
    );
  }

  // Widget Management APIs
  async createWidget(
    data: CreateWidgetData,
  ): Promise<{ success: boolean; data: Widget }> {
    return this.makeRequest<{ success: boolean; data: Widget }>(
      "/admin/create-widget",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async getWidget(): Promise<{
    success: boolean;
    data: Widget;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: Widget;
    }>("/admin/widget", {
      method: "GET",
    });
  }

  async updateWidget(
    data: UpdateWidgetData,
  ): Promise<{ success: boolean; data: Widget }> {
    return this.makeRequest<{ success: boolean; data: Widget }>(
      "/admin/widget",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  // Analytics and Stats APIs
  async getDashboardStats(): Promise<{
    success: boolean;
    data: DashboardStats;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: DashboardStats;
    }>("/admin/stats/dashboard", {
      method: "GET",
    });
  }

  async getTeamStats(teamId: string): Promise<{
    success: boolean;
    data: TeamStats;
  }> {
    return this.makeRequest<{
      success: boolean;
      data: TeamStats;
    }>(`/admin/stats/teams/${teamId}`, {
      method: "GET",
    });
  }

  // Auth state methods
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  logout(): void {
    this.removeToken();
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  // Storage/MinIO APIs
  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn?: number
  ): Promise<{
    success: boolean;
    data: {
      uploadUrl: string;
      fileKey: string;
      fileName: string;
      expiresIn: number;
    };
  }> {
    return this.makeRequest<{
      success: boolean;
      data: {
        uploadUrl: string;
        fileKey: string;
        fileName: string;
        expiresIn: number;
      };
    }>("/storage/presigned-upload", {
      method: "POST",
      body: JSON.stringify({ fileName, mimeType, expiresIn }),
    });
  }

  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn?: number
  ): Promise<{
    success: boolean;
    data: {
      downloadUrl: string;
      fileKey: string;
    };
  }> {
    return this.makeRequest<{
      success: boolean;
      data: {
        downloadUrl: string;
        fileKey: string;
      };
    }>("/storage/presigned-download", {
      method: "POST",
      body: JSON.stringify({ fileKey, expiresIn }),
    });
  }

  async deleteStorageFile(fileKey: string): Promise<{
    success: boolean;
    data: { fileKey: string };
  }> {
    return this.makeRequest<{
      success: boolean;
      data: { fileKey: string };
    }>(`/storage/${encodeURIComponent(fileKey)}`, {
      method: "DELETE",
    });
  }

  async uploadFileWithPresignedUrl(
    presignedUrl: string,
    file: File
  ): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload file to storage");
    }
  }
}

export const apiService = new ApiService();

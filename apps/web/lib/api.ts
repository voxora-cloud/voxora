import { DashboardStats, TeamStats } from "./interfaces/admin";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type OrgRole = "owner" | "admin" | "agent";

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface OrgMembership {
  organization: Organization;
  role: OrgRole;
  membershipId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    requiresOrgSelection: boolean;
    user: User;
    role?: OrgRole;
    organization?: Organization;
    accessToken?: string;
    refreshToken?: string;
    memberships?: OrgMembership[];
    selectionToken?: string;
  };
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    role?: OrgRole;
    organization?: Organization;
    accessToken?: string;
    refreshToken?: string;
  };
  message?: string;
  statusCode?: number;
}

export interface AdminRegistrationData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
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
  logoFileKey?: string; // MinIO file key for logo
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
  logoFileKey?: string; // MinIO file key for logo
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

  // Auth state methods (updated for multi-tenant)
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  getActiveOrgId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("activeOrgId");
  }

  setActiveOrgId(orgId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("activeOrgId", orgId);
  }

  getOrgRole(): OrgRole | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("orgRole") as OrgRole | null;
  }

  setOrgRole(role: OrgRole): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("orgRole", role);
  }

  logout(): void {
    this.removeToken();
    if (typeof window === "undefined") return;
    localStorage.removeItem("activeOrgId");
    localStorage.removeItem("orgRole");
    window.location.href = "/login";
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  async checkBootstrapStatus(): Promise<{ success: boolean; data: { bootstrapRequired: boolean } }> {
    return this.makeRequest<{ success: boolean; data: { bootstrapRequired: boolean } }>(
      "/auth/bootstrap-status",
      { method: "GET" },
    );
  }

  async setup(data: AdminRegistrationData): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/setup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Unified Login ──────────────────────────────────────────────────────────

  async login(data: LoginData): Promise<LoginResponse> {
    return this.makeRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Legacy aliases
  async adminLogin(data: LoginData): Promise<LoginResponse> {
    return this.login(data);
  }

  async agentLogin(data: LoginData): Promise<LoginResponse> {
    return this.login(data);
  }

  async adminSignup(data: AdminRegistrationData): Promise<AuthResponse> {
    return this.setup(data);
  }

  // ─── Organization Management ────────────────────────────────────────────────

  async getMyOrganizations(): Promise<{ success: boolean; data: { organizations: Array<{ organization: Organization; role: OrgRole }> } }> {
    return this.makeRequest("/organizations", { method: "GET" });
  }

  async createOrganization(data: { name: string; slug?: string }): Promise<{ success: boolean; data: { organization: Organization; role: OrgRole; accessToken: string } }> {
    return this.makeRequest("/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async switchOrganization(orgId: string): Promise<{ success: boolean; data: { organization: Organization; role: OrgRole; accessToken: string; refreshToken: string } }> {
    return this.makeRequest(`/organizations/${orgId}/switch`, { method: "POST" });
  }

  async getOrganization(orgId: string): Promise<{ success: boolean; data: { organization: Organization; role: OrgRole } }> {
    return this.makeRequest(`/organizations/${orgId}`, { method: "GET" });
  }

  async updateOrganization(orgId: string, data: { name?: string; slug?: string; logoUrl?: string }): Promise<{ success: boolean; data: { organization: Organization } }> {
    return this.makeRequest(`/organizations/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(orgId: string): Promise<{ success: boolean }> {
    return this.makeRequest(`/organizations/${orgId}`, { method: "DELETE" });
  }

  // ─── Membership Management ───────────────────────────────────────────────────

  async listMembers(orgId: string): Promise<{ success: boolean; data: { members: any[] } }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members`, { method: "GET" });
  }

  async inviteMember(orgId: string, data: { email: string; name: string; role: OrgRole; teamIds?: string[] }): Promise<{ success: boolean }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async resendMemberInvite(orgId: string, memberId: string): Promise<{ success: boolean }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members/${memberId}/resend-invite`, {
      method: "POST",
    });
  }

  async updateMemberRole(orgId: string, memberId: string, role: OrgRole): Promise<{ success: boolean }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members/${memberId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async updateMemberStatus(orgId: string, memberId: string, status: "active" | "inactive"): Promise<{ success: boolean }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members/${memberId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async removeMember(orgId: string, memberId: string): Promise<{ success: boolean }> {
    return this.makeRequest(`/memberships/organizations/${orgId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  async verifyInvite(token: string): Promise<{ success: boolean; data: { email: string; name: string; requiresPassword: boolean; organization: any } }> {
    return this.makeRequest(`/memberships/verify-invite/${token}`, {
      method: "GET",
    });
  }

  async acceptInvite(token: string, password?: string): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/memberships/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }


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

  // Knowledge Base APIs
  async getKnowledgeItems(): Promise<{
    success: boolean;
    data: { items: import("./interfaces/knowledge").KnowledgeBase[]; total: number };
  }> {
    return this.makeRequest("/knowledge", { method: "GET" });
  }

  /**
   * Step 1 (file): request a presigned MinIO PUT URL + create the DB record.
   */
  async requestKnowledgeUpload(meta: {
    title: string;
    description?: string;
    catalog?: string;
    source: "pdf" | "docx";
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<{
    success: boolean;
    data: { documentId: string; presignedUrl: string; fileKey: string };
  }> {
    return this.makeRequest("/knowledge/request-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
  }

  /**
   * Step 2 (file): PUT the file binary directly to MinIO via the presigned URL.
   * No auth headers — this goes straight to MinIO, bypassing the API.
   */
  async uploadFileToMinIO(presignedUrl: string, file: File): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`MinIO upload failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Step 3 (file): confirm the upload — marks DB record as queued + enqueues BullMQ job.
   */
  async confirmKnowledgeUpload(documentId: string): Promise<{
    success: boolean;
    data: import("./interfaces/knowledge").KnowledgeBase;
  }> {
    return this.makeRequest(`/knowledge/${documentId}/confirm`, { method: "POST" });
  }

  /**
   * Single-step create for text / URL knowledge entries.
   */
  async createTextKnowledge(data: {
    title: string;
    description?: string;
    catalog?: string;
    source: "text" | "url";  // "url" only used by realtime sync
    content?: string;
    url?: string;
    fetchMode?: "single" | "crawl";
    crawlDepth?: number;
    syncFrequency?: string;
  }): Promise<{ success: boolean; data: import("./interfaces/knowledge").KnowledgeBase }> {
    return this.makeRequest("/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a short-lived presigned GET URL to preview/download a file.
   */
  async getKnowledgeViewUrl(documentId: string): Promise<{
    success: boolean;
    data: { url: string; fileName?: string; mimeType?: string };
  }> {
    return this.makeRequest(`/knowledge/${documentId}/view-url`, { method: "GET" });
  }

  /**
   * Re-enqueue an existing knowledge item for indexing (reindex or retry).
   */
  async reindexKnowledgeItem(documentId: string): Promise<{
    success: boolean;
    data: import("./interfaces/knowledge").KnowledgeBase;
  }> {
    return this.makeRequest(`/knowledge/${documentId}/reindex`, { method: "POST" });
  }

  /**
   * Partial-update a knowledge item (pause/resume, syncFrequency, etc.).
   */
  async updateKnowledgeItem(
    documentId: string,
    patch: {
      isPaused?: boolean;
      syncFrequency?: string;
      status?: string;
    },
  ): Promise<{ success: boolean; data: import("./interfaces/knowledge").KnowledgeBase }> {
    return this.makeRequest(`/knowledge/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  /**
   * Delete a knowledge item (MongoDB record + MinIO file).
   */
  async deleteKnowledgeItem(documentId: string): Promise<{ success: boolean; data: { id: string } }> {
    return this.makeRequest(`/knowledge/${documentId}`, { method: "DELETE" });
  }
}

export const apiService = new ApiService();

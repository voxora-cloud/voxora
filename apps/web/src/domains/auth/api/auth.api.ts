import { apiClient } from "../../../shared/lib/api-client";
import type { User } from "../../../shared/types/types";
import type { 
  LoginPayload, 
  LoginResponse, 
  SignupPayload, 
  SignupResponse,
  AcceptInviteResponse,
  OrganizationResponse,
  VerifyInviteResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  CreateOrganizationResponse,
} from "../types/types";


class AuthApi {
  async login(data: LoginPayload): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/auth/login", data);
  }

  async signup(data: SignupPayload): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>("/auth/setup", {
      name: data.name,
      email: data.email,
      password: data.password,
      companyName: data.companyName,
    });

    // Normalize bootstrap response shape from API (`organization.id`) to app shape (`organization._id`).
    if (response?.success && response.data?.organization) {
      const org = response.data.organization as unknown as {
        _id?: string;
        id?: string;
        name: string;
        slug: string;
        isActive?: boolean;
        logoUrl?: string;
      };

      if (!org._id && org.id) {
        response.data.organization = {
          ...org,
          _id: org.id,
          isActive: org.isActive ?? true,
        } as typeof response.data.organization;
      }
    }

    return response;
  }

  async acceptInvite(token: string, password?: string): Promise<AcceptInviteResponse> {
    return apiClient.post<AcceptInviteResponse>("/memberships/accept-invite", { token, password });
  }

  async getOrganization(orgId: string): Promise<OrganizationResponse> {
    return apiClient.get<OrganizationResponse>(`/organizations/${orgId}`);
  }

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

  // Organization management
  setActiveOrgId(orgId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("activeOrgId", orgId);
  }

  getActiveOrgId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("activeOrgId");
  }

  setOrgRole(role: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("orgRole", role);
  }

  getOrgRole(): "owner" | "admin" | "agent" | null {
    if (typeof window === "undefined") return null;
    const role = localStorage.getItem("orgRole");
    return role as "owner" | "admin" | "agent" | null;
  }

  removeOrgData(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("activeOrgId");
    localStorage.removeItem("orgRole");
  }

  logout(): void {
    this.removeToken();
    this.removeOrgData();
  }

  async getMyOrganizations(): Promise<any> {
    return apiClient.get(`/organizations`);
  }

  async switchOrganization(orgId: string): Promise<any> {
    return apiClient.post(`/organizations/${orgId}/switch`, { organizationId: orgId });
  }

  async createOrganization(name: string): Promise<CreateOrganizationResponse> {
    return apiClient.post<CreateOrganizationResponse>("/organizations", { name });
  }

  async verifyInvite(token: string): Promise<VerifyInviteResponse> {
    return apiClient.get<VerifyInviteResponse>(`/memberships/verify-invite/${token}`);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>("/auth/reset-password", { 
      token, 
      newPassword 
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    return apiClient.post<ChangePasswordResponse>("/auth/change-password", { 
      currentPassword, 
      newPassword 
    });
  }
}

export const authApi = new AuthApi();
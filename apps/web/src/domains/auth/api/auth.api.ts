import { apiClient } from "../../../shared/lib/api-client";
import type { User } from "../../../shared/types/types";
import type {
  LoginPayload,
  LoginResponse,
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

  async initiateSignup(data: { name: string; email: string }): Promise<any> {
    return apiClient.post("/auth/initiate-signup", data);
  }

  async completeSignup(data: any): Promise<SignupResponse> {
    const response = await apiClient.post<SignupResponse>("/auth/complete-signup", data);

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

  setOrgPlan(plan: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("orgPlan", plan);
  }

  getOrgPlan(): "free" | "pro" | "proplus" | null {
    if (typeof window === "undefined") return null;
    const plan = localStorage.getItem("orgPlan");
    return plan as "free" | "pro" | "proplus" | null;
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
    localStorage.removeItem("orgPlan");
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

  async forgotPassword(email: string, verificationMethod: "link" | "otp" = "link"): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", { email, verificationMethod });
  }

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>("/auth/reset-password", {
      token,
      newPassword
    });
  }

  async verifyResetToken(token: string): Promise<any> {
    return apiClient.get(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    return apiClient.post<ChangePasswordResponse>("/auth/change-password", {
      currentPassword,
      newPassword
    });
  }

  async verifyOTP(email: string, code: string, type: "email_verification" | "password_reset"): Promise<any> {
    return apiClient.post("/auth/verify-otp", { email, code, type });
  }

  async sendEmailVerification(email: string): Promise<any> {
    return apiClient.post("/auth/send-email-verification", { email });
  }

  async verifyEmailLink(token: string): Promise<any> {
    return apiClient.get(`/auth/verify-email-link?token=${encodeURIComponent(token)}`);
  }

  async getEmailVerificationStatus(email: string): Promise<any> {
    return apiClient.get(`/auth/email-verification-status?email=${encodeURIComponent(email)}`);
  }

  async resendOTP(email: string, type: "email_verification" | "password_reset"): Promise<any> {
    return apiClient.post("/auth/resend-otp", { email, type });
  }

  async resetPasswordWithOTP(data: any): Promise<any> {
    return apiClient.post("/auth/reset-password-otp", data);
  }
}

export const authApi = new AuthApi();

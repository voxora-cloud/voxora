import type { Organization, OrgMembership, OrgRole, User } from "../../../shared/types/types";

export interface LoginPayload {
    email: string;
    password: string;   
}

export interface SignupPayload {
    name: string;
    email: string;
    password: string;
    companyName: string;
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

export interface SignupResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken: string;
    role: string;
    organization: Organization;
  };
  message?: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
}

export interface OrganizationResponse {
  success: boolean;
  data: { organization: Organization };
}

export interface VerifyInviteResponse {
  success: boolean;
  data: {
    email: string;
    name: string;
    requiresPassword: boolean;
    organization: Organization;
  };
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export interface CreateOrganizationResponse {
  success: boolean;
  data?: {
    organization: Organization;
    role: OrgRole;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}
export type OrgRole = "owner" | "admin" | "agent";

export interface OrganizationEmailSender {
  fromEmail?: string;
  fromName?: string;
  domain?: string;
  verified: boolean;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  emailSender?: OrganizationEmailSender;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
}
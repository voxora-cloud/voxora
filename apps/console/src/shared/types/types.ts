export type OrgRole = "owner" | "admin" | "agent";



export interface Organization {
  _id: string;
  name: string;
  slug: string;
  plan?: "free" | "pro" | "proplus";
  logoUrl?: string;
  whiteLabelEnabled?: boolean;

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
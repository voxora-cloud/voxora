export type OrgRole = "owner" | "admin" | "agent";

export interface Member {
  membershipId: string; // The membership ID
  userId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    lastSeen?: string;
  };
  role: OrgRole;
  inviteStatus: "active" | "pending" | "inactive";
  teams: {
    _id: string;
    name: string;
    color?: string;
  }[];
  activatedAt?: string;
  organizationId: string;
}

export interface MemberFormData {
  name: string;
  email: string;
  role: OrgRole;
  teamIds: string[];
}

export interface InviteMemberData {
  email: string;
  name: string;
  role: OrgRole;
  teamIds?: string[];
}

export interface UpdateMemberRoleData {
  role: OrgRole;
}

export interface MembersResponse {
  success: boolean;
  data: {
    members: Member[];
  };
}

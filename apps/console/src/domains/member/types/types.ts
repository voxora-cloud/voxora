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

  activatedAt?: string;
  organizationId: string;
}

export interface MemberFormData {
  name: string;
  email: string;
  role: OrgRole;

}

export interface InviteMemberData {
  email: string;
  name: string;
  role: OrgRole;

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

import { MembershipRole } from "@shared/models";

export interface InviteMemberInput {
    email: string;
    name: string;
    role: MembershipRole;
    password?: string;
}

import { Membership, User, MembershipRole, IMembership } from "@shared/models";
import { Types } from "mongoose";
import emailService from "@shared/utils/email";
import crypto from "crypto";

export class MembershipService {
    /**
     * List all members of an organization.
     */
    static async listMembers(organizationId: string) {
        const memberships = await Membership.find({
            organizationId,
            inviteStatus: { $in: ["active", "pending", "inactive"] },
        }).populate("userId", "name email avatar status lastSeen");

        return memberships.map((m) => ({
            membershipId: m._id,
            user: m.userId,
            role: m.role,
            inviteStatus: m.inviteStatus,
            teams: m.teams,
            invitedAt: m.invitedAt,
            activatedAt: m.activatedAt,
        }));
    }

    /**
     * Invite a user to our organization.
     * If they already have an account – reuse it.
     * If not – create a pending user record.
     */
    static async inviteMember(
        invitedByUserId: string,
        organizationId: string,
        data: {
            email: string;
            name: string;
            role: MembershipRole;
            teamIds?: string[];
            password?: string;
        },
    ) {
        // Enforce role assignment rules
        // Only owners can invite other owners.
        const inviterMembership = await Membership.findOne({ userId: invitedByUserId, organizationId });
        if (data.role === "owner" && inviterMembership?.role !== "owner") {
            throw new Error("Admins cannot invite users as Owners");
        }

        // Check for existing membership
        let user = await User.findOne({ email: data.email.toLowerCase() });

        if (user) {
            const existing = await Membership.findOne({ userId: user._id, organizationId });
            if (existing) throw new Error("User is already a member of this organization");
        } else {
            // Create stub user
            user = new User({
                name: data.name,
                email: data.email.toLowerCase(),
                password: data.password ?? crypto.randomBytes(16).toString("hex"),
                isActive: true,
                emailVerified: false,
            });
            await user.save();
        }

        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const membership = await Membership.create({
            userId: user._id,
            organizationId: new Types.ObjectId(organizationId),
            role: data.role,
            inviteStatus: "pending",
            invitedBy: new Types.ObjectId(invitedByUserId),
            invitedAt: new Date(),
            inviteExpiresAt,
            teams: (data.teamIds ?? []).map((id) => new Types.ObjectId(id)),
            permissions: this.defaultPermissionsForRole(data.role),
        });

        // Store token on user for invite verification
        await User.findByIdAndUpdate(user._id, {
            emailVerificationToken: inviteToken,
        });

        // Send invite email
        await emailService.sendInviteEmail(
            data.email,
            "Your Organization",
            data.role,
            inviteToken,
            (data.teamIds ?? []).join(", "),
        );

        return { membership, inviteToken };
    }

    /**
     * Verify an invite token without accepting it.
     */
    static async verifyInvite(token: string) {
        const user = await User.findOne({ emailVerificationToken: token });
        if (!user) throw new Error("Invalid or expired invitation token");

        const membership = await Membership.findOne({
            userId: user._id,
            inviteStatus: "pending",
        }).populate("organizationId", "name slug");

        if (!membership) throw new Error("Invitation not found");

        if (membership.inviteExpiresAt && new Date() > membership.inviteExpiresAt) {
            throw new Error("Invitation has expired. Please request a new invite.");
        }

        return {
            email: user.email,
            name: user.name,
            requiresPassword: !user.emailVerified,
            organization: membership.organizationId
        };
    }

    /**
     * Accept an invite by token.
     */
    static async acceptInvite(token: string, password?: string) {
        const user = await User.findOne({
            emailVerificationToken: token,
        });

        if (!user) throw new Error("Invalid or expired invitation token");

        const membership = await Membership.findOne({
            userId: user._id,
            inviteStatus: "pending",
        });

        if (!membership) throw new Error("Invitation not found");

        if (membership.inviteExpiresAt && new Date() > membership.inviteExpiresAt) {
            throw new Error("Invitation has expired. Please request a new invite.");
        }

        membership.inviteStatus = "active";
        membership.activatedAt = new Date();
        await membership.save();

        if (!user.emailVerified) {
            if (!password) {
                throw new Error("Password is required to complete registration");
            }
            user.password = password; // The User model pre-save hook will hash this
        }

        user.emailVerificationToken = undefined;
        user.emailVerified = true;
        user.isActive = true;
        await user.save();

        return { user, membership };
    }

    /**
     * Resend an invitation to a pending member.
     */
    static async resendInvite(organizationId: string, memberId: string) {
        const membership = await Membership.findOne({ _id: memberId, organizationId });

        if (!membership) throw new Error("Membership not found");
        if (membership.inviteStatus !== "pending") {
            throw new Error("Can only resend invitations to pending members");
        }

        const user = await User.findById(membership.userId);
        if (!user) throw new Error("User not found");

        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        membership.inviteExpiresAt = inviteExpiresAt;
        await membership.save();

        user.emailVerificationToken = inviteToken;
        await user.save();

        // Send invite email
        await emailService.sendInviteEmail(
            user.email,
            "Your Organization",
            membership.role,
            inviteToken,
            (membership.teams ?? []).join(", "),
        );

        return { success: true };
    }

    static async updateMemberRole(
        organizationId: string,
        targetMemberId: string,
        newRole: MembershipRole,
        requestingUserId: string,
    ) {
        const requester = await Membership.findOne({ userId: requestingUserId, organizationId });
        const targetMembership = await Membership.findOne({ _id: targetMemberId, organizationId });

        if (!targetMembership) throw new Error("Member not found");

        if (requestingUserId === targetMembership.userId.toString()) {
            throw new Error("Users cannot modify their own roles");
        }

        // Admins cannot modify owners or grant owner status
        if (requester?.role === "admin") {
            if (targetMembership.role === "owner") {
                throw new Error("Admins cannot modify owner roles");
            }
            if (newRole === "owner") {
                throw new Error("Admins cannot grant owner role");
            }
        }

        const membership = await Membership.findOneAndUpdate(
            { _id: targetMemberId, organizationId },
            { role: newRole },
            { new: true },
        );

        return membership;
    }

    /**
     * Suspend or Reactivate a member.
     */
    static async updateMemberStatus(
        organizationId: string,
        targetMemberId: string,
        newStatus: "active" | "inactive",
        requestingUserId: string,
    ) {
        const requester = await Membership.findOne({ userId: requestingUserId, organizationId });
        const targetMembership = await Membership.findOne({ _id: targetMemberId, organizationId });

        if (!targetMembership) throw new Error("Member not found");

        if (requestingUserId === targetMembership.userId.toString()) {
            throw new Error("Users cannot suspend or reactivate themselves");
        }

        if (targetMembership.role === "owner" && requestingUserId !== targetMembership.userId.toString()) {
            const ownerCount = await Membership.countDocuments({ organizationId, role: "owner", inviteStatus: "active" });
            // Let them suspend if they are an owner and there's another active owner
            if (ownerCount <= 1) {
                throw new Error("Cannot suspend the last active owner of an organization");
            }
        }

        if (requester?.role === "admin" && targetMembership.role === "owner") {
            throw new Error("Admins cannot modify owner status");
        }

        const membership = await Membership.findOneAndUpdate(
            { _id: targetMemberId, organizationId },
            { inviteStatus: newStatus },
            { new: true },
        );

        return membership;
    }

    /**
     * Remove a member from an organization.
     */
    static async removeMember(organizationId: string, targetMemberId: string, requestingUserId: string) {
        const requester = await Membership.findOne({ userId: requestingUserId, organizationId });
        const targetMembership = await Membership.findOne({ _id: targetMemberId, organizationId });

        if (!targetMembership) throw new Error("Member not found");

        if (requestingUserId === targetMembership.userId.toString()) {
            throw new Error("Users cannot remove themselves from the organization");
        }

        if (requester?.role === "admin" && (targetMembership.role === "admin" || targetMembership.role === "owner")) {
            throw new Error("Admins cannot remove other Admins or Owners");
        }

        // Cannot remove the last owner of an organization
        if (targetMembership.role === "owner") {
            const ownerCount = await Membership.countDocuments({ organizationId, role: "owner" });
            if (ownerCount <= 1) {
                throw new Error("Cannot remove the last owner of an organization");
            }
        }

        await Membership.findByIdAndDelete(targetMembership._id);
    }

    // ─── Helpers ───

    private static defaultPermissionsForRole(role: MembershipRole): string[] {
        if (role === "owner") {
            return ["manage_teams", "manage_agents", "view_analytics", "manage_settings", "manage_members"];
        }
        if (role === "admin") {
            return ["manage_teams", "manage_agents", "view_analytics", "manage_members"];
        }
        return [];
    }
}

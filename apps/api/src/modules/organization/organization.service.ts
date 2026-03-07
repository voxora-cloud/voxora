import { Organization, Membership, MembershipRole, IOrganization } from "@shared/models";
import { Types } from "mongoose";
import { generateTokens } from "@shared/utils/auth";

export class OrganizationService {
    /**
     * Create a new organization and assign the creator as owner.
     */
    static async createOrganization(
        userId: string,
        data: { name: string; slug?: string },
    ): Promise<{
        organization: IOrganization;
        accessToken: string;
        refreshToken: string;
    }> {
        const slug = data.slug ?? this.generateSlug(data.name);

        // Check slug uniqueness
        const existing = await Organization.findOne({ slug });
        if (existing) {
            throw new Error(`Organization slug "${slug}" is already taken`);
        }

        const organization = new Organization({ name: data.name, slug });
        await organization.save();

        // Create owner membership
        await Membership.create({
            userId: new Types.ObjectId(userId),
            organizationId: organization._id,
            role: "owner" as MembershipRole,
            inviteStatus: "active",
            activatedAt: new Date(),
            permissions: [
                "manage_teams",
                "manage_agents",
                "view_analytics",
                "manage_settings",
                "manage_members",
            ],
        });

        // Issue tokens scoped to new org
        const { accessToken, refreshToken } = generateTokens({
            userId,
            email: "", // filled by caller or re-fetched
            activeOrganizationId: organization._id.toString(),
        });

        return { organization, accessToken, refreshToken };
    }

    /**
     * List all organizations a user belongs to (with role info).
     */
    static async getUserOrganizations(userId: string) {
        const memberships = await Membership.find({ userId, inviteStatus: "active" }).populate<{
            organizationId: IOrganization;
        }>("organizationId");

        return memberships
            .filter((m) => m.organizationId && (m.organizationId as any).isActive)
            .map((m) => ({
                organization: m.organizationId as IOrganization,
                role: m.role,
                membershipId: m._id,
            }));
    }

    /**
     * Get a single organization (validates membership).
     */
    static async getOrganization(userId: string, orgId: string) {
        const membership = await Membership.findOne({
            userId,
            organizationId: orgId,
            inviteStatus: "active",
        });
        if (!membership) throw new Error("Organization not found or access denied");

        const org = await Organization.findById(orgId);
        if (!org || !org.isActive) throw new Error("Organization not found");

        return { organization: org, role: membership.role };
    }

    /**
     * Update organization settings (owner/admin only – enforced at route level).
     */
    static async updateOrganization(
        orgId: string,
        data: { name?: string; slug?: string; logoUrl?: string },
    ) {
        if (data.slug) {
            const existing = await Organization.findOne({ slug: data.slug, _id: { $ne: orgId } });
            if (existing) throw new Error(`Slug "${data.slug}" is already taken`);
        }

        const org = await Organization.findByIdAndUpdate(orgId, { $set: data }, { new: true });
        if (!org) throw new Error("Organization not found");
        return org;
    }

    /**
     * Delete an organization (owner only). Cascades are handled by the caller or hooks.
     */
    static async deleteOrganization(orgId: string) {
        await Organization.findByIdAndUpdate(orgId, { isActive: false });
        await Membership.updateMany({ organizationId: orgId }, { inviteStatus: "inactive" });
    }

    /**
     * Switch the active organization — returns new tokens.
     */
    static async switchOrganization(
        userId: string,
        email: string,
        targetOrgId: string,
    ): Promise<{ accessToken: string; refreshToken: string; organization: IOrganization; role: MembershipRole }> {
        const membership = await Membership.findOne({
            userId,
            organizationId: targetOrgId,
            inviteStatus: "active",
        });

        if (!membership) {
            throw new Error("You are not a member of the requested organization");
        }

        const org = await Organization.findById(targetOrgId);
        if (!org || !org.isActive) throw new Error("Organization not found or inactive");

        const tokens = generateTokens({ userId, email, activeOrganizationId: targetOrgId });

        return { ...tokens, organization: org, role: membership.role };
    }

    // ─── Helpers ───

    static generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 50);
    }
}

import { Organization, Membership, MembershipRole, IOrganization, Widget } from "@shared/models";
import { Types } from "mongoose";
import { generateTokens } from "@shared/utils/auth";
import crypto from "crypto";

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

        // Auto-create a default widget for the new organization
        await Widget.create({
            organizationId: organization._id,
            displayName: "Voxora AI",
            backgroundColor: "#10b981",
            appearance: {
                primaryColor: "#10b981",
                textColor: "#ffffff",
                position: "bottom-right",
                launcherText: "Chat with us",
                welcomeMessage: "Hi there! How can we help you today?",
                logoUrl: "",
            },
            behavior: { autoOpen: false, showOnMobile: true, showOnDesktop: true },
            ai: { enabled: true, model: "gpt-4o-mini", fallbackToAgent: true, autoAssign: true, assignmentStrategy: "least-loaded" },
            conversation: { collectUserInfo: { name: true, email: true, phone: false } },
            features: { acceptMediaFiles: true, endUserDomAccess: true },
            suggestions: [
                { text: "What can you help me with?", showOutside: true },
                { text: "I need help with my order", showOutside: false },
                { text: "Talk to a human agent", showOutside: true },
                { text: "What are your business hours?", showOutside: false },
            ],
            publicKey: crypto.randomBytes(16).toString("hex"),
        });

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
        data: {
            name?: string;
            slug?: string;
            logoUrl?: string;
            emailSender?: {
                fromEmail?: string;
                fromName?: string;
                domain?: string;
                verified?: boolean;
            };
        },
    ) {
        if (data.slug) {
            const existing = await Organization.findOne({ slug: data.slug, _id: { $ne: orgId } });
            if (existing) throw new Error(`Slug "${data.slug}" is already taken`);
        }

        const existingOrg = await Organization.findById(orgId);
        if (!existingOrg) throw new Error("Organization not found");

        const updateFields: Record<string, unknown> = {};
        if (typeof data.name !== "undefined") updateFields.name = data.name;
        if (typeof data.slug !== "undefined") updateFields.slug = data.slug;
        if (typeof data.logoUrl !== "undefined") updateFields.logoUrl = data.logoUrl;

        if (data.emailSender) {
            const current = existingOrg.emailSender || { verified: false };

            const nextFromEmail =
                typeof data.emailSender.fromEmail !== "undefined"
                    ? data.emailSender.fromEmail?.trim().toLowerCase()
                    : current.fromEmail;

            const nextFromName =
                typeof data.emailSender.fromName !== "undefined"
                    ? data.emailSender.fromName?.trim()
                    : current.fromName;

            const nextDomain =
                typeof data.emailSender.domain !== "undefined"
                    ? data.emailSender.domain?.trim().toLowerCase()
                    : current.domain;

            const identityChanged =
                (current.fromEmail || "") !== (nextFromEmail || "")
                || (current.fromName || "") !== (nextFromName || "")
                || (current.domain || "") !== (nextDomain || "");

            // Never allow clients to self-verify sender. Verification can only
            // remain true when identity is unchanged and already verified.
            const verified = !!current.verified && !identityChanged;

            updateFields.emailSender = {
                fromEmail: nextFromEmail,
                fromName: nextFromName,
                domain: nextDomain,
                verified,
            };
        }

        const org = await Organization.findByIdAndUpdate(orgId, { $set: updateFields }, { new: true });
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

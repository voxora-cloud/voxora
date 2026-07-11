import {
  Organization,
  Membership,
  MembershipRole,
  IOrganization,
  Widget,
  Knowledge,
} from "@shared/models";
import { ClientSession, Types } from "mongoose";
import { generateTokens } from "@shared/security/auth/jwt";
import crypto from "crypto";
import { buildDefaultWidgetConfig } from "@shared/core/widget-default-config";
import { loadEeModule } from "@shared/ee";
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "./organization.types";
import { ingestionQueue } from "@shared/infra/queue";
import { TemplatesService } from "@modules/templates/templates.service";

export class OrganizationService {
  /**
   * Create a new organization and assign the creator as owner.
   */
  static async createOrganization(
    userId: string,
    data: CreateOrganizationInput,
    options?: { session?: ClientSession },
  ): Promise<{
    organization: IOrganization;
    accessToken: string;
    refreshToken: string;
  }> {
    const session = options?.session;
    let slug = data.slug ?? (await this.generateAvailableSlug(data.name));

    const organization = new Organization({ name: data.name, slug });
    await organization.save({ session });

    if (!organization) {
      throw new Error("Failed to create organization");
    }

    await TemplatesService.seedDefaultTemplates(
      organization._id.toString(),
      userId,
      { session },
    );

    // Create 3 default FAQs that apply to any organization.
    const defaultFaqs = [
      {
        title: "What information can I ask for?",
        content:
          "You can ask about our services, policies, departments, eligibility requirements, timelines, procedures, and general organization-related information.",
      },
      {
        title: "How can I find the right information?",
        content:
          "Share your goal or question clearly. The system can help guide you toward the relevant service, department, process, or next step.",
      },
      {
        title: "Where can I get official updates?",
        content:
          "Official updates are usually shared through the organization’s website, announcements, notices, or verified communication channels.",
      },
    ];

    const createdFaqs = [];
    for (const faq of defaultFaqs) {
      try {
        const doc = await Knowledge.create(
          [
            {
              organizationId: organization._id,
              title: faq.title,
              description: "Default generic FAQ",
              catalog: "default",
              source: "faq",
              status: "queued",
              content: faq.content,
              uploadedBy: userId,
            },
          ],
          { session },
        );

        const createdDoc = doc[0];
        createdFaqs.push(createdDoc);

        await ingestionQueue
          .add("ingest", {
            documentId: String(createdDoc._id),
            organizationId: organization._id.toString(),
            source: "faq",
            fileKey: "",
            mimeType: "text/plain",
            fileName: faq.title,
            title: faq.title,
            catalog: "default",
            content: faq.content,
          })
          .catch((err) => {
            console.error(
              "[OrganizationService] Failed to enqueue default FAQ ingestion:",
              err,
            );
          });
      } catch (err) {
        console.error(
          `[OrganizationService] Failed to create default FAQ: ${faq.title}`,
          err,
        );
      }
    }

    // Auto-create a default widget for the new organization
    const defaultWidgetConfig = buildDefaultWidgetConfig();
    await Widget.create(
      [
        {
          organizationId: organization._id,
          displayName: organization.name,
          ...defaultWidgetConfig,
          suggestions: createdFaqs.map((faq) => ({
            text: faq.title,
            showOutside: true,
            faqId: faq._id.toString(),
          })),
          publicKey: crypto.randomBytes(16).toString("hex"),
          verifiedDomain: "localhost",
          domainVerificationStatus: "verified",
        },
      ],
      { session },
    );

    // Create owner membership
    await Membership.create(
      [
        {
          userId: new Types.ObjectId(userId),
          organizationId: organization._id,
          role: "owner" as MembershipRole,
          inviteStatus: "accepted",
          activatedAt: new Date(),
          permissions: [
            "manage_teams",
            "manage_agents",
            "view_analytics",
            "manage_settings",
            "manage_members",
          ],
        },
      ],
      { session },
    );

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
    const memberships = await Membership.find({
      userId,
      inviteStatus: "accepted",
    }).populate<{
      organizationId: IOrganization;
    }>("organizationId", "name slug logoUrl plan whiteLabelEnabled isActive");

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
      inviteStatus: "accepted",
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
    data: UpdateOrganizationInput,
  ) {
    if (data.slug) {
      const existing = await Organization.findOne({
        slug: data.slug,
        _id: { $ne: orgId },
      });
      if (existing) throw new Error(`Slug "${data.slug}" is already taken`);
    }

    const existingOrg = await Organization.findById(orgId);
    if (!existingOrg) throw new Error("Organization not found");

    const updateFields: Record<string, unknown> = {};
    if (typeof data.name !== "undefined") updateFields.name = data.name;
    if (typeof data.slug !== "undefined") updateFields.slug = data.slug;
    if (typeof data.logoUrl !== "undefined")
      updateFields.logoUrl = data.logoUrl;

    const org = await Organization.findByIdAndUpdate(
      orgId,
      { $set: updateFields },
      { new: true },
    );
    if (!org) throw new Error("Organization not found");
    return org;
  }

  /**
   * Delete an organization (owner only). Cascades are handled by the caller or hooks.
   */
  static async deleteOrganization(orgId: string) {
    await Organization.findByIdAndUpdate(orgId, { isActive: false });
    await Membership.deleteMany({ organizationId: orgId });
  }

  /**
   * Switch the active organization — returns new tokens.
   */
  static async switchOrganization(
    userId: string,
    email: string,
    targetOrgId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    organization: IOrganization;
    role: MembershipRole;
  }> {
    const membership = await Membership.findOne({
      userId,
      organizationId: targetOrgId,
      inviteStatus: "accepted",
    });

    if (!membership) {
      throw new Error("You are not a member of the requested organization");
    }

    const org = await Organization.findById(targetOrgId);
    if (!org || !org.isActive)
      throw new Error("Organization not found or inactive");

    const tokens = generateTokens({
      userId,
      email,
      activeOrganizationId: targetOrgId,
    });

    return { ...tokens, organization: org, role: membership.role };
  }

  // ─── Helpers ───

  static generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    return slug || "organization";
  }

  static async generateAvailableSlug(name: string): Promise<string> {
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let suffix = 1;

    while (await Organization.exists({ slug })) {
      suffix += 1;
      const suffixText = `-${suffix}`;
      slug = `${baseSlug.substring(0, 50 - suffixText.length)}${suffixText}`;
    }

    return slug;
  }
}

import { User, Organization, Membership, MembershipRole } from "@shared/models";
import { generateTokens } from "@shared/utils/auth";
import { redisClient } from "@shared/config/redis";
import { isEmailEnabled } from "@shared/utils/email";
import { enqueuePasswordResetEmail } from "@shared/queues/email.queue";
import { OrganizationService } from "@modules/organization/organization.service";
import crypto from "crypto";

export class AuthService {
  // ─────────────────────────────────────────────────────────────────
  //  BOOTSTRAP  (first time setup — no organizations exist yet)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Called on first-ever setup. Creates the first user, first organization,
   * and the owner membership. After this, registration is invite-only.
   */
  async adminSignup(data: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
  }) {
    // Guard: only allowed when no organizations exist
    const orgCount = await Organization.countDocuments();
    if (orgCount > 0) {
      return {
        success: false,
        message: "Setup already completed. Use invite flow to add new users.",
        statusCode: 400,
      };
    }

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      return { success: false, message: "Email already registered", statusCode: 400 };
    }

    // Create the user
    const user = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      isActive: true,
      emailVerified: true,
    });
    await user.save();

    // Create the organization + owner membership
    const slug = OrganizationService.generateSlug(data.organizationName);
    const organization = new Organization({ name: data.organizationName, slug });
    await organization.save();

    await Membership.create({
      userId: user._id,
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

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      activeOrganizationId: organization._id.toString(),
    });

    await this._storeRefreshToken(user._id.toString(), organization._id.toString(), tokens.refreshToken);

    return {
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email },
        organization: { id: organization._id, name: organization.name, slug: organization.slug },
        role: "owner",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  LOGIN  (unified — returns memberships for org selector if needed)
  // ─────────────────────────────────────────────────────────────────

  async login(loginData: { email: string; password: string }) {
    const { email, password } = loginData;

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return { success: false, message: "Invalid email or password", statusCode: 401 };
    }

    // Load all active memberships
    const memberships = await Membership.find({
      userId: user._id,
      inviteStatus: "active",
    }).populate("organizationId", "name slug logoUrl");

    if (memberships.length === 0) {
      return {
        success: false,
        message: "You do not belong to any organization. Please contact your administrator.",
        statusCode: 403,
      };
    }

    user.status = "online";
    user.lastSeen = new Date();
    await User.findByIdAndUpdate(user._id, { status: "online", lastSeen: new Date() });

    // Single org — auto-select and return tokens
    if (memberships.length === 1) {
      const membership = memberships[0];
      const orgId = (membership.organizationId as any)._id.toString();

      const tokens = generateTokens({
        userId: user._id.toString(),
        email: user.email,
        activeOrganizationId: orgId,
      });

      await this._storeRefreshToken(user._id.toString(), orgId, tokens.refreshToken);

      return {
        success: true,
        data: {
          requiresOrgSelection: false,
          user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
          role: membership.role,
          organization: membership.organizationId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    }

    // Multiple orgs — return memberships list for org selector UI
    return {
      success: true,
      data: {
        requiresOrgSelection: true,
        user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
        memberships: memberships.map((m) => ({
          organization: m.organizationId,
          role: m.role,
        })),
        // Provide a short-lived selection token to complete login
        selectionToken: generateTokens({
          userId: user._id.toString(),
          email: user.email,
          activeOrganizationId: "pending",
        }).accessToken,
      },
    };
  }


  // ─────────────────────────────────────────────────────────────────
  //  LOGOUT
  // ─────────────────────────────────────────────────────────────────

  async logout(userId: string, activeOrganizationId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { status: "offline", lastSeen: new Date() });
    await redisClient.del(`org:${activeOrganizationId}:refresh_token:${userId}`);
  }

  // ─────────────────────────────────────────────────────────────────
  //  PASSWORD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    if (!isEmailEnabled()) {
      return {
        success: false,
        message: "Password reset is unavailable — no email provider is configured. Contact your administrator.",
      };
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const activeMembership = await Membership.findOne({
        userId: user._id,
        inviteStatus: "active",
      })
        .select("organizationId")
        .lean();

      await enqueuePasswordResetEmail(
        email,
        user.name,
        resetToken,
        activeMembership?.organizationId?.toString(),
      );
    }

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return { success: false, message: "Invalid or expired reset token", statusCode: 400 };
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select("+password");
    if (!user) return { success: false, message: "User not found", statusCode: 404 };

    if (!(await user.comparePassword(currentPassword))) {
      return { success: false, message: "Current password is incorrect", statusCode: 400 };
    }

    user.password = newPassword;
    await user.save();
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────
  //  BOOTSTRAP CHECK  (frontend uses this to decide setup vs login page)
  // ─────────────────────────────────────────────────────────────────

  static async isBootstrapRequired(): Promise<boolean> {
    const count = await Organization.countDocuments();
    return count === 0;
  }

  // ─────────────────────────────────────────────────────────────────
  //  INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────

  private async _storeRefreshToken(userId: string, orgId: string, refreshToken: string) {
    await redisClient.setEx(
      `org:${orgId}:refresh_token:${userId}`,
      30 * 24 * 60 * 60,
      refreshToken,
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //  STATIC SHORTHAND (used in places that don't instantiate the class)
  // ─────────────────────────────────────────────────────────────────

  static async register(userData: { name: string; email: string; password: string }) {
    throw new Error(
      "Open registration is disabled. Use the invite flow or bootstrap setup.",
    );
  }
}

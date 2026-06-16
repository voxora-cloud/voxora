import { User, Membership, IUser } from "@shared/models";
import { generateTokens } from "@shared/security/auth/jwt";
import { redisClient } from "@shared/infra/redis";
import { isEmailEnabled } from "@shared/utils/email";
import {
  enqueueWelcomeEmail,
  enqueueEmailVerificationOTPEmail,
  enqueueForgotPasswordOTPEmail
} from "@shared/queues/email.queue";
import { generateOTP, hashOTP, verifyOTP as checkOTP } from "@shared/security/auth/otp";
import crypto from "crypto";
import { OrganizationService } from "@modules/organization/organization.service";
import { SignupContext } from "./auth.types";

export class AuthService {

  async initiateSignup(data: { name: string; email: string }) {
    const normalizedEmail = data.email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.isActive && user.emailVerified) {
        return { success: false, message: "Email already registered", statusCode: 400 };
      }
      // If user exists but is pending/unverified, we can reuse and resend OTP
      user.name = data.name;
      await user.save();
    } else {
      // Create a pending user
      user = await User.create({
        name: data.name,
        email: normalizedEmail,
        isActive: false, // Not active until signup completion
        emailVerified: false,
      });
    }

    return this._issueOtp({
      user,
      type: "email_verification",
      checkAlreadyVerified: true,
    });
  }


  async completeSignup(data: {
    email: string;
    organizationName: string;
    password: string;
  }) {


    const normalizedEmail = data.email.toLowerCase();
    let signupContext: SignupContext | undefined;

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      if (user.isActive) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }

      user.password = data.password;
      user.isActive = true;
      await user.save();

      const { organization } = await OrganizationService.createOrganization(
        user._id.toString(),
        { name: data.organizationName }
      );

      signupContext = {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        organizationId: organization._id.toString(),
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationPlan: organization.plan,
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";
      if (code === "USER_NOT_FOUND") {
        return { success: false, message: "User not found", statusCode: 404 };
      }
      if (code === "EMAIL_NOT_VERIFIED") {
        return { success: false, message: "Email not verified", statusCode: 403 };
      }
      if (code === "EMAIL_ALREADY_REGISTERED") {
        return { success: false, message: "Email already registered", statusCode: 400 };
      }
      throw error;
    }

    if (!signupContext) {
      return { success: false, message: "Signup failed", statusCode: 500 };
    }

    const ctx = signupContext;

    const tokens = await this._issueOrgSession(
      ctx.userId,
      ctx.userEmail,
      ctx.organizationId,
    );

    return {
      success: true,
      data: {
        user: { id: ctx.userId, name: ctx.userName, email: ctx.userEmail },
        organization: {
          id: ctx.organizationId,
          name: ctx.organizationName,
          slug: ctx.organizationSlug,
          plan: ctx.organizationPlan,
        },
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

    if (!user.emailVerified) {
      return {
        success: false,
        message: "Please verify your email before logging in",
        statusCode: 403,
        requiresVerification: true
      };
    }

    // Load all active memberships
    const memberships = await Membership.find({
      userId: user._id,
      inviteStatus: "active",
    }).populate("organizationId", "name slug logoUrl plan whiteLabelEnabled");

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

      const tokens = await this._issueOrgSession(
        user._id.toString(),
        user.email,
        orgId,
      );

      return {
        success: true,
        data: {
          requiresOrgSelection: false,
          user: { id: user._id, name: user.name, email: user.email},
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
        user: { id: user._id, name: user.name, email: user.email },
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
        statusCode: 503,
      };
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

    if (!user) {
      return { success: true }; // Silent failure for security
    }

    await this.generateAndSendOTP(user.email, "password_reset");
    return { success: true };
  }

  async sendEmailVerification(email: string) {
    return this._issueOtp({
      email,
      type: "email_verification",
      checkAlreadyVerified: true,
    });
  }

  async generateAndSendOTP(email: string, type: "email_verification" | "password_reset") {
    return this._issueOtp({ email, type });
  }
  private async _issueOtp(params: {
    type: "email_verification" | "password_reset";
    email?: string;
    user?: IUser;
    checkAlreadyVerified?: boolean;
  }) {
    const { type, email, user: providedUser, checkAlreadyVerified = false } = params;

    let user: IUser | null | undefined = providedUser;
    if (!user) {
      if (!email) {
        return { success: false, message: "User not found", statusCode: 404 };
      }
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return { success: false, message: "User not found", statusCode: 404 };
    }

    if (checkAlreadyVerified && user.emailVerified) {
      return { success: true, message: "Email is already verified" };
    }

    // Cooldown check (2 minutes)
    if (user.otp && user.otp.lastSentAt && Date.now() - user.otp.lastSentAt.getTime() < 2 * 60 * 1000) {
      return {
        success: false,
        message: "Please wait before requesting another OTP",
        statusCode: 429
      };
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);

    user.otp = {
      code: hashedOtp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      attempts: 0,
      lastSentAt: new Date(),
      type,
    };
    await user.save();

    if (type === "email_verification") {
      await enqueueEmailVerificationOTPEmail(user.email, user.name, otp);
    } else {
      await enqueueForgotPasswordOTPEmail(user.email, user.name, otp);
    }

    return { 
      success: true, 
      message: type === "password_reset" 
        ? "Password reset code sent" 
        : "OTP sent to your email" 
    };
  }

  async verifyOTP(email: string, code: string, type: "email_verification" | "password_reset") {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp || user.otp.type !== type) {
      return { success: false, message: "Invalid request", statusCode: 400 };
    }

    if (user.otp.expiresAt < new Date()) {
      return { success: false, message: "OTP has expired", statusCode: 400 };
    }

    if (user.otp.attempts >= 5) {
      return { success: false, message: "Too many attempts. Please request a new OTP.", statusCode: 429 };
    }

    const isValid = await checkOTP(code, user.otp.code);
    if (!isValid) {
      user.otp.attempts += 1;
      await user.save();
      return { success: false, message: "Invalid OTP", statusCode: 400 };
    }

    // Success - specific handling based on type
    if (type === "email_verification") {
      user.emailVerified = true;
      // Send welcome email after verification
      const memberships = await Membership.find({ userId: user._id });
      const role = memberships.length > 0 ? memberships[0].role : "user";
      await enqueueWelcomeEmail(user.email, user.name, role);
    }

    // Email verification is complete here. Password reset OTPs are consumed
    // only after the new password is saved.
    if (type === "email_verification") {
      user.otp = undefined;
    }
    await user.save();

    return { success: true };
  }

  async resendOTP(email: string, type: "email_verification" | "password_reset") {
    return this.generateAndSendOTP(email, type);
  }

  async resetPasswordWithOTP(email: string, code: string, newPassword: string) {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("+password");
    if (!user) return { success: false, message: "User not found", statusCode: 404 };

    // Prevent password reuse
    if (await user.comparePassword(newPassword)) {
      return { success: false, message: "New password cannot be the same as current password", statusCode: 400 };
    }

    const result = await this.verifyOTP(email, code, "password_reset");
    if (!result.success) return result;

    await this._finalizePasswordUpdate(user, newPassword);

    return { success: true };
  }

  async validatePasswordResetToken(token: string) {
    if (!token) {
      return { success: false, message: "Reset link is missing or invalid", statusCode: 400 };
    }

    const user = await this._findUserByValidResetToken(token);

    if (!user) {
      return { success: false, message: "Reset link is invalid or has expired", statusCode: 400 };
    }

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) {
      return { success: false, message: "Reset link is missing or invalid", statusCode: 400 };
    }

    const user = await this._findUserByValidResetToken(token, true);

    if (!user) {
      return { success: false, message: "Reset link is invalid or has expired", statusCode: 400 };
    }

    if (await user.comparePassword(newPassword)) {
      return { success: false, message: "New password cannot be the same as current password", statusCode: 400 };
    }

    await this._finalizePasswordUpdate(user, newPassword, true);

    return { success: true };
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

  private async _issueOrgSession(userId: string, email: string, orgId: string) {
    const tokens = generateTokens({
      userId,
      email,
      activeOrganizationId: orgId,
    });

    await this._storeRefreshToken(userId, orgId, tokens.refreshToken);
    return tokens;
  }

  private async _findUserByValidResetToken(token: string, withPassword = false) {
    const query = User.findOne({
      passwordResetToken: this._hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    return withPassword ? query.select("+password") : query;
  }

  private async _finalizePasswordUpdate(user: IUser, newPassword: string, clearResetToken = false) {
    user.password = newPassword;
    user.otp = undefined;

    if (clearResetToken) {
      user.passwordResetToken = undefined;
      user.passwordResetExpiresAt = undefined;
    }

    await user.save();
    await this._revokeAllUserSessions(user._id.toString());
  }

  private async _revokeAllUserSessions(userId: string): Promise<void> {
    try {
      const pattern = `org:*:refresh_token:${userId}`;
      const keys: string[] = [];
      
      // Use SCAN to find all matching keys
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }
      
      // Delete all found keys
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      // Log error but don't fail the password reset
      console.error("Failed to revoke user sessions:", error);
    }
  }

  private _hashResetToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

}

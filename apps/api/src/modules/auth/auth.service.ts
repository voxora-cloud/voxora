import { User, IUser } from "@shared/models";
import { generateTokens } from "@shared/utils/auth";
import { redisClient } from "@shared/config/redis";
import emailService from "@shared/utils/email";
import crypto from "crypto";

export class AuthService {
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<{
    user: IUser;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    const user = new User(userData);
    await user.save();

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await redisClient.setEx(
      `refresh_token:${user._id}`,
      30 * 24 * 60 * 60,
      tokens.refreshToken,
    );

    return { user, tokens };
  }

  static async login(
    email: string,
    password: string,
  ): Promise<{
    user: IUser;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const user = await User.findOne({ email, isActive: true }).select("+password");
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await redisClient.setEx(
      `refresh_token:${user._id}`,
      30 * 24 * 60 * 60,
      tokens.refreshToken,
    );

    return { user, tokens };
  }

  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      status: "offline",
      lastSeen: new Date(),
    });

    await redisClient.del(`refresh_token:${userId}`);
  }

  static async refreshToken(_refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    throw new Error("Refresh token functionality not implemented yet");
  }

  // =================
  // INSTANCE METHODS
  // =================

  async adminSignup(userData: any) {
    const { name, email, password, companyName } = userData;

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return {
        success: false,
        message: "Admin account already exists. Only one admin per organization.",
        statusCode: 400,
      };
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { success: false, message: "Email already registered", statusCode: 400 };
    }

    const admin = new User({
      name,
      email,
      password,
      role: "admin",
      isActive: true,
      emailVerified: true,
      companyName,
      permissions: ["manage_teams", "manage_agents", "view_analytics", "manage_settings"],
    });

    await admin.save();

    const tokens = generateTokens({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          companyName: admin.companyName,
        },
        token: tokens.accessToken,
      },
    };
  }

  async adminLogin(loginData: any) {
    const { email, password } = loginData;

    const admin = await User.findOne({
      email,
      role: { $in: ["admin", "founder"] },
      isActive: true,
    }).select("+password");

    if (!admin || !(await admin.comparePassword(password))) {
      return { success: false, message: "Invalid email or password", statusCode: 401 };
    }

    admin.lastSeen = new Date();
    await admin.save();

    const tokens = generateTokens({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          companyName: admin.companyName,
          permissions: admin.permissions,
        },
        token: tokens.accessToken,
      },
    };
  }

  async agentLogin(loginData: any) {
    const { email, password } = loginData;

    const agent = await User.findOne({
      email,
      role: { $in: ["agent", "admin"] },
      isActive: true,
    })
      .select("+password")
      .populate("teams", "name color");

    if (!agent || !(await agent.comparePassword(password))) {
      return { success: false, message: "Invalid email or password", statusCode: 401 };
    }

    if (agent.inviteStatus === "pending") {
      return { success: false, message: "Please accept your invitation first", statusCode: 403 };
    }

    agent.lastSeen = new Date();
    agent.status = "online";
    await agent.save();

    const tokens = generateTokens({
      userId: agent._id.toString(),
      email: agent.email,
      role: agent.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          teams: agent.teams,
          permissions: agent.permissions,
          status: agent.status,
        },
        token: tokens.accessToken,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await User.findOne({ email, isActive: true });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await emailService.sendPasswordResetEmail(email, user.name, resetToken);
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

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        token: tokens.accessToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return { success: false, message: "User not found", statusCode: 404 };
    }

    if (!(await user.comparePassword(currentPassword))) {
      return { success: false, message: "Current password is incorrect", statusCode: 400 };
    }

    user.password = newPassword;
    await user.save();

    return { success: true };
  }

  async acceptInvite(token: string) {
    const alreadyAccepted = await User.findOne({
      emailVerificationToken: token,
      inviteStatus: "active",
    });

    if (alreadyAccepted) {
      return {
        success: false,
        message: "This invitation has already been accepted. You can log in to your account.",
        statusCode: 409,
      };
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      inviteStatus: "pending",
    });

    if (!user) {
      return { success: false, message: "Invalid or expired invitation token", statusCode: 400 };
    }

    if (user.inviteExpiresAt && new Date() > user.inviteExpiresAt) {
      return {
        success: false,
        message: "This invitation has expired. Please contact your administrator for a new invitation.",
        statusCode: 410,
      };
    }

    user.inviteStatus = "active";
    user.status = "online";
    user.activatedAt = new Date();
    await user.save();

    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          teams: user.teams,
          status: user.status,
        },
        token: tokens.accessToken,
      },
    };
  }
}

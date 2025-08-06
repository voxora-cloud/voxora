import { User, IUser } from '../models';
import { generateTokens } from '../utils/auth';
import { redisClient } from '../config/redis';

export class AuthService {
  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in Redis
    await redisClient.setEx(
      `refresh_token:${user._id}`,
      30 * 24 * 60 * 60, // 30 days
      tokens.refreshToken
    );

    return { user, tokens };
  }

  static async login(email: string, password: string): Promise<{
    user: IUser;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    // Find user by email
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update user status and last seen
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in Redis
    await redisClient.setEx(
      `refresh_token:${user._id}`,
      30 * 24 * 60 * 60, // 30 days
      tokens.refreshToken
    );

    return { user, tokens };
  }

  static async logout(userId: string): Promise<void> {
    // Update user status
    await User.findByIdAndUpdate(userId, {
      status: 'offline',
      lastSeen: new Date(),
    });

    // Remove refresh token from Redis
    await redisClient.del(`refresh_token:${userId}`);
  }

  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // This would typically involve verifying the refresh token
    // and generating new tokens
    throw new Error('Refresh token functionality not implemented yet');
  }

  // =================
  // NEW AUTH METHODS
  // =================

  async adminSignup(userData: any) {
    const { name, email, password, companyName } = userData;

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ 
      role: 'admin' 
    });

    if (existingAdmin) {
      return { 
        success: false, 
        message: 'Admin account already exists. Only one admin per organization.', 
        statusCode: 400 
      };
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { 
        success: false, 
        message: 'Email already registered', 
        statusCode: 400 
      };
    }

    // Create admin user
    const admin = new User({
      name,
      email,
      password,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      companyName,
      permissions: ['manage_teams', 'manage_agents', 'view_analytics', 'manage_settings']
    });

    await admin.save();

    // Generate JWT token
    const tokens = generateTokens({
      userId: admin._id,
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
          companyName: admin.companyName
        },
        token: tokens.accessToken
      }
    };
  }

  async adminLogin(loginData: any) {
    const { email, password } = loginData;

    // Find admin user
    const admin = await User.findOne({
      email,
      role: { $in: ['admin', 'founder'] },
      isActive: true
    }).select('+password');

    if (!admin || !(await admin.comparePassword(password))) {
      return { 
        success: false, 
        message: 'Invalid email or password', 
        statusCode: 401 
      };
    }

    // Update last login
    admin.lastSeen = new Date();
    await admin.save();

    // Generate JWT token
    const tokens = generateTokens({
      userId: admin._id,
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
          permissions: admin.permissions
        },
        token: tokens.accessToken
      }
    };
  }

  async agentLogin(loginData: any) {
    const { email, password } = loginData;

    // Find agent user
    const agent = await User.findOne({
      email,
      role: { $in: ['agent', 'admin'] },
      isActive: true
    }).select('+password').populate('teams', 'name color');

    if (!agent || !(await agent.comparePassword(password))) {
      return { 
        success: false, 
        message: 'Invalid email or password', 
        statusCode: 401 
      };
    }

    // Check if agent invitation is still pending
    if (agent.inviteStatus === 'pending') {
      return { 
        success: false, 
        message: 'Please accept your invitation first', 
        statusCode: 403 
      };
    }

    // Update last login and status
    agent.lastSeen = new Date();
    agent.status = 'online';
    await agent.save();

    // Generate JWT token
    const tokens = generateTokens({
      userId: agent._id,
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
          status: agent.status
        },
        token: tokens.accessToken
      }
    };
  }

  async forgotPassword(email: string) {
    const user = await User.findOne({ email, isActive: true });
    
    if (user) {
      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Send password reset email
      const emailService = require('./EmailService').default;
      await emailService.sendPasswordResetEmail(email, user.name, resetToken);
    }

    // Always return success for security reasons
    return { success: true };
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await User.findById(userId);
    
    if (!user) {
      return { 
        success: false, 
        message: 'User not found', 
        statusCode: 404 
      };
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Generate new JWT token
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        token: tokens.accessToken
      }
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return { 
        success: false, 
        message: 'User not found', 
        statusCode: 404 
      };
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return { 
        success: false, 
        message: 'Current password is incorrect', 
        statusCode: 400 
      };
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { success: true };
  }

  async acceptInvite(token: string) {
    // Find user by invite token
    const user = await User.findOne({ emailVerificationToken: token, inviteStatus: 'pending' });
    console.log('User found for invite:', user);
    if (!user) {
      return { 
        success: false, 
        message: 'Invalid or expired invitation token', 
        statusCode: 400 
      };
    }

    // Update user status and clear invite token
    user.inviteStatus = 'active';
    user.emailVerificationToken = undefined;
    user.status = 'online';
    await user.save();

    // Generate JWT token
    const tokens = generateTokens({
      userId: user._id,
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
          status: user.status
        },
        token: tokens.accessToken
      }
    };
  }
}

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
}

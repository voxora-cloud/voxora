import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisClient, redisPublisher, redisSubscriber } from "@shared/config/redis";
import { verifyToken } from "@shared/utils/auth";
import { User, Membership } from "@shared/models";
import logger from "@shared/utils/logger";
import config from "@shared/config";
import { handleMessage } from "./handlers/handlerMessage";

let socketManagerInstance: SocketManager | null = null;

export class SocketManager {
  private io: Server;
  // userId -> { socketId, orgId }
  private connectedUsers = new Map<string, { socketId: string; orgId: string }>();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupRedisAdapter();
    this.setupMiddleware();
    this.setupEventHandlers();

    socketManagerInstance = this;
  }

  public get ioInstance() {
    return this.io;
  }

  private async setupRedisAdapter(): Promise<void> {
    try {
      const adapter = createAdapter(redisPublisher, redisSubscriber);
      this.io.adapter(adapter);
      logger.info("Socket.IO Redis adapter configured");
    } catch (error) {
      logger.error("Failed to setup Redis adapter:", error);
    }
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error: No token provided"));

        const decoded = verifyToken(token, "access");
        const user = await User.findById(decoded.userId).select("-password");
        if (!user || !user.isActive) return next(new Error("Authentication error: Invalid user"));

        const orgId = decoded.activeOrganizationId;

        // Verify that the user has an active membership in the claimed org
        if (!orgId) return next(new Error("Authentication error: No active organization"));

        const membership = await Membership.findOne({
          userId: decoded.userId,
          organizationId: orgId,
          inviteStatus: "active",
        });
        if (!membership) return next(new Error("Authentication error: Not a member of this organization"));

        socket.data.user = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          orgId,
          orgRole: membership.role,
        };

        // Update lastSeen
        await User.findByIdAndUpdate(user._id, { lastSeen: new Date() }, { timestamps: false });
        next();
      } catch {
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      const { userId, orgId } = socket.data.user;
      logger.info(`User connected: ${userId} (org: ${orgId})`);

      // Store connection in memory + Redis (org-scoped key)
      this.connectedUsers.set(userId, { socketId: socket.id, orgId });
      redisClient.set(`org:${orgId}:socket:user:${userId}`, socket.id, { EX: 86400 }).catch(() => { });

      // Join the org room so we can broadcast org-wide events
      socket.join(`org:${orgId}`);

      this.updateUserStatus(userId, "online");
      handleMessage({ socket, io: this.io });

      socket.on("disconnect", () => {
        logger.info(`User disconnected: ${userId}`);
        this.connectedUsers.delete(userId);
        redisClient.del(`org:${orgId}:socket:user:${userId}`).catch(() => { });
        this.updateUserStatus(userId, "offline");
      });

      // Join an org-scoped conversation room
      socket.on("join_conversation", (conversationId: string) => {
        socket.join(`org:${orgId}:conv:${conversationId}`);
        logger.debug(`User ${userId} joined org:${orgId}:conv:${conversationId}`);
      });

      socket.on("leave_conversation", (conversationId: string) => {
        socket.leave(`org:${orgId}:conv:${conversationId}`);
        logger.debug(`User ${userId} left org:${orgId}:conv:${conversationId}`);
      });

      socket.on("update_status", async (status: string) => {
        await this.updateUserStatus(userId, status);
        // Broadcast status update only within the same org
        this.io.to(`org:${orgId}`).emit("user_status_update", { userId, status, timestamp: new Date() });
      });
    });
  }

  private async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, { status, lastSeen: new Date() });
    } catch (error) {
      logger.error("Error updating user status:", error);
    }
  }

  public getUserSocket(userId: string): string | undefined {
    return this.connectedUsers.get(userId)?.socketId;
  }

  public getConnectedUsers(): Map<string, { socketId: string; orgId: string }> {
    return this.connectedUsers;
  }

  public getIO(): Server {
    return this.io;
  }

  // ─── Emit helpers ──────────────────────────────────────────────────────────────

  /**
   * Emit to all sockets in a specific org-scoped conversation room.
   */
  public emitToConversation(conversationId: string, event: string, data: any): void {
    // Try to resolve orgId from the connected user map — fall back to unscoped key for backward compat
    this.io.to(`org:*:conv:${conversationId}`).emit(event, data);
    // Also emit to legacy un-namespaced room (during transition)
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Emit to all sockets in an org (org-wide broadcast).
   */
  public emitToOrg(orgId: string, event: string, data: any): void {
    this.io.to(`org:${orgId}`).emit(event, data);
  }

  /**
   * Emit to a specific user. Uses in-memory map first, then Redis cross-instance lookup.
   */
  public async emitToUser(userId: string, event: string, data: any): Promise<void> {
    const local = this.connectedUsers.get(userId);
    if (local) {
      this.io.to(local.socketId).emit(event, data);
      return;
    }
    // Cross-instance: try all org:*:socket:user:<userId> patterns (scan)
    try {
      const keys = await redisClient.keys(`org:*:socket:user:${userId}`);
      if (keys.length > 0) {
        const remoteSocketId = await redisClient.get(keys[0]);
        if (remoteSocketId) this.io.to(remoteSocketId).emit(event, data);
      }
    } catch {
      logger.warn(`[SocketManager] Redis lookup failed for emitToUser(${userId})`);
    }
  }

  public emitToAllUsers(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

export const getSocketManager = () => socketManagerInstance;
export default SocketManager;

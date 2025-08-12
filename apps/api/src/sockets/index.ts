import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPublisher, redisSubscriber } from '../config/redis';
import { verifyToken } from '../utils/auth';
import { User } from '../models';
import logger from '../utils/logger';
import config from '../config';
import { handleMessage } from './handlers/handlerMessage';

// import { handleConnection } from './handlers/connectionHandler';
// import { handleMessage } from './handlers/messageHandler';
// import { handleConversation } from './handlers/conversationHandler';
// import { handleTyping } from './handlers/typingHandler';

let socketManagerInstance: SocketManager | null = null;

export class SocketManager {
  private io: Server;
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupRedisAdapter();
    this.setupMiddleware();
    this.setupEventHandlers();
    
    // Set global instance
    socketManagerInstance = this;
  }

  // Public getter for the io instance
  public get ioInstance() {
    return this.io;
  }

  private async setupRedisAdapter(): Promise<void> {
    try {
      const adapter = createAdapter(redisPublisher, redisSubscriber);
      this.io.adapter(adapter);
      logger.info('Socket.IO Redis adapter configured');
    } catch (error) {
      logger.error('Failed to setup Redis adapter:', error);
    }
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = verifyToken(token, 'access');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.data.user = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.name,
          avatar: user.avatar,
        };

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.data.user.userId}`);
      
      // Store user connection
      this.connectedUsers.set(socket.data.user.userId, socket.id);
      
      // Update user status to online
      this.updateUserStatus(socket.data.user.userId, 'online');

      // Setup event handlers
      // handleConnection(socket, this.io);
      handleMessage({socket, io: this.io});
      // handleConversation(socket, this.io);
      // handleTyping(socket, this.io);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.data.user.userId}`);
        
        // Remove user connection
        this.connectedUsers.delete(socket.data.user.userId);
        
        // Update user status to offline
        this.updateUserStatus(socket.data.user.userId, 'offline');
      });

      // Handle custom events
      socket.on('join_conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
      });

      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        logger.debug(`User ${socket.data.user.userId} left conversation ${conversationId}`);
      });

      socket.on('update_status', async (status: string) => {
        await this.updateUserStatus(socket.data.user.userId, status);
        
        // Broadcast status update to relevant conversations
        this.broadcastUserStatusUpdate(socket.data.user.userId, status);
      });
    });
  }

  private async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        status,
        lastSeen: new Date(),
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
    }
  }

  private broadcastUserStatusUpdate(userId: string, status: string): void {
    this.io.emit('user_status_update', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  public getUserSocket(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  public getConnectedUsers(): Map<string, string> {
    return this.connectedUsers;
  }

  public getIO(): Server {
    return this.io;
  }

  // Utility methods for broadcasting
  public emitToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToAllUsers(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

// Export the singleton instance getter
export const getSocketManager = () => socketManagerInstance;

export default SocketManager;
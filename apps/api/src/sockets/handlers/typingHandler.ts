import { Socket, Server } from 'socket.io';
import logger from '../../utils/logger';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: Date;
}

// Store typing users per conversation
const typingUsers = new Map<string, Map<string, TypingUser>>();

export const handleTyping = (socket: Socket, io: Server): void => {
  // Handle user started typing
  socket.on('typing_start', (data: {
    conversationId: string;
  }) => {
    const { conversationId } = data;
    const userId = socket.data.user.userId;
    const userName = socket.data.user.name;

    // Initialize conversation typing map if not exists
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Map());
    }

    const conversationTyping = typingUsers.get(conversationId)!;
    
    // Add user to typing list
    conversationTyping.set(userId, {
      userId,
      userName,
      timestamp: new Date(),
    });

    // Broadcast to other users in conversation (except sender)
    socket.to(`conversation:${conversationId}`).emit('user_typing_start', {
      conversationId,
      userId,
      userName,
      timestamp: new Date(),
    });

    logger.debug(`User ${userId} started typing in conversation ${conversationId}`);
  });

  // Handle user stopped typing
  socket.on('typing_stop', (data: {
    conversationId: string;
  }) => {
    const { conversationId } = data;
    const userId = socket.data.user.userId;
    const userName = socket.data.user.name;

    // Remove user from typing list
    const conversationTyping = typingUsers.get(conversationId);
    if (conversationTyping) {
      conversationTyping.delete(userId);
      
      // Clean up empty conversation maps
      if (conversationTyping.size === 0) {
        typingUsers.delete(conversationId);
      }
    }

    // Broadcast to other users in conversation (except sender)
    socket.to(`conversation:${conversationId}`).emit('user_typing_stop', {
      conversationId,
      userId,
      userName,
      timestamp: new Date(),
    });

    logger.debug(`User ${userId} stopped typing in conversation ${conversationId}`);
  });

  // Handle getting current typing users
  socket.on('get_typing_users', (data: {
    conversationId: string;
  }) => {
    const { conversationId } = data;
    const conversationTyping = typingUsers.get(conversationId);
    
    const currentTypingUsers = conversationTyping 
      ? Array.from(conversationTyping.values()) 
      : [];

    socket.emit('typing_users_list', {
      conversationId,
      typingUsers: currentTypingUsers,
    });
  });

  // Clean up typing status on disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.user.userId;
    
    // Remove user from all typing lists
    for (const [conversationId, conversationTyping] of typingUsers.entries()) {
      if (conversationTyping.has(userId)) {
        conversationTyping.delete(userId);
        
        // Broadcast typing stop to conversation
        socket.to(`conversation:${conversationId}`).emit('user_typing_stop', {
          conversationId,
          userId,
          userName: socket.data.user.name,
          timestamp: new Date(),
        });
        
        // Clean up empty conversation maps
        if (conversationTyping.size === 0) {
          typingUsers.delete(conversationId);
        }
      }
    }
  });
};

// Utility function to clean up old typing indicators
export const cleanupTypingIndicators = (): void => {
  const now = new Date();
  const timeout = 30000; // 30 seconds timeout

  for (const [conversationId, conversationTyping] of typingUsers.entries()) {
    for (const [userId, typingUser] of conversationTyping.entries()) {
      if (now.getTime() - typingUser.timestamp.getTime() > timeout) {
        conversationTyping.delete(userId);
        
        // Note: We can't emit here as we don't have socket context
        // This is mainly for cleanup of stale data
      }
    }
    
    // Clean up empty conversation maps
    if (conversationTyping.size === 0) {
      typingUsers.delete(conversationId);
    }
  }
};

// Start cleanup interval
setInterval(cleanupTypingIndicators, 60000); // Run every minute

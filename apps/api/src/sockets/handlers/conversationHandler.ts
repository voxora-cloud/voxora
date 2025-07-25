import { Socket, Server } from 'socket.io';
import { ConversationService } from '../../services';
import logger from '../../utils/logger';

export const handleConversation = (socket: Socket, io: Server): void => {
  // Handle creating conversations
  socket.on('create_conversation', async (data: {
    participantId: string;
    subject?: string;
    priority?: string;
    tags?: string[];
  }) => {
    try {
      const conversation = await ConversationService.createConversation({
        createdBy: socket.data.user.userId,
        participantId: data.participantId,
        subject: data.subject,
        priority: data.priority,
        tags: data.tags,
      });

      // Join conversation room
      socket.join(`conversation:${conversation._id}`);

      // Notify participant
      const participantSocket = io.sockets.sockets.get(data.participantId);
      if (participantSocket) {
        participantSocket.join(`conversation:${conversation._id}`);
        participantSocket.emit('conversation_created', {
          conversation,
          createdBy: socket.data.user,
        });
      }

      // Send confirmation to creator
      socket.emit('conversation_created', {
        conversation,
        createdBy: socket.data.user,
      });

      logger.debug(`Conversation created by ${socket.data.user.userId}: ${conversation._id}`);
    } catch (error) {
      logger.error('Error creating conversation:', error);
      socket.emit('conversation_error', {
        error: 'Failed to create conversation',
      });
    }
  });

  // Handle getting conversations
  socket.on('get_conversations', async (data: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    try {
      const result = await ConversationService.getConversations(
        socket.data.user.userId,
        data
      );

      socket.emit('conversations_loaded', {
        conversations: result.conversations,
        pagination: {
          page: data.page || 1,
          limit: data.limit || 20,
          total: result.total,
          pages: result.pages,
        },
      });
    } catch (error) {
      logger.error('Error loading conversations:', error);
      socket.emit('conversation_error', {
        error: 'Failed to load conversations',
      });
    }
  });

  // Handle updating conversation
  socket.on('update_conversation', async (data: {
    conversationId: string;
    updates: {
      status?: string;
      assignedTo?: string;
      priority?: string;
      tags?: string[];
    };
  }) => {
    try {
      const conversation = await ConversationService.updateConversation(
        data.conversationId,
        socket.data.user.userId,
        data.updates
      );

      if (conversation) {
        // Notify all participants
        io.to(`conversation:${data.conversationId}`).emit('conversation_updated', {
          conversationId: data.conversationId,
          updates: data.updates,
          updatedBy: socket.data.user,
          timestamp: new Date(),
        });
      }

      logger.debug(`Conversation updated by ${socket.data.user.userId}: ${data.conversationId}`);
    } catch (error) {
      logger.error('Error updating conversation:', error);
      socket.emit('conversation_error', {
        error: 'Failed to update conversation',
        conversationId: data.conversationId,
      });
    }
  });

  // Handle assigning conversation
  socket.on('assign_conversation', async (data: {
    conversationId: string;
    agentId: string;
  }) => {
    try {
      // Check if user has permission (admin or agent role)
      if (!['admin', 'agent'].includes(socket.data.user.role)) {
        socket.emit('conversation_error', {
          error: 'Insufficient permissions',
          conversationId: data.conversationId,
        });
        return;
      }

      const conversation = await ConversationService.assignConversation(
        data.conversationId,
        data.agentId
      );

      if (conversation) {
        // Notify all participants and assigned agent
        io.to(`conversation:${data.conversationId}`).emit('conversation_assigned', {
          conversationId: data.conversationId,
          assignedTo: data.agentId,
          assignedBy: socket.data.user,
          timestamp: new Date(),
        });
      }

      logger.debug(`Conversation assigned by ${socket.data.user.userId}: ${data.conversationId} to ${data.agentId}`);
    } catch (error) {
      logger.error('Error assigning conversation:', error);
      socket.emit('conversation_error', {
        error: 'Failed to assign conversation',
        conversationId: data.conversationId,
      });
    }
  });

  // Handle closing conversation
  socket.on('close_conversation', async (data: {
    conversationId: string;
  }) => {
    try {
      const conversation = await ConversationService.closeConversation(
        data.conversationId,
        socket.data.user.userId
      );

      if (conversation) {
        // Notify all participants
        io.to(`conversation:${data.conversationId}`).emit('conversation_closed', {
          conversationId: data.conversationId,
          closedBy: socket.data.user,
          timestamp: new Date(),
        });
      }

      logger.debug(`Conversation closed by ${socket.data.user.userId}: ${data.conversationId}`);
    } catch (error) {
      logger.error('Error closing conversation:', error);
      socket.emit('conversation_error', {
        error: 'Failed to close conversation',
        conversationId: data.conversationId,
      });
    }
  });

  // Handle joining conversation room
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User ${socket.data.user.userId} joined conversation room: ${conversationId}`);
  });

  // Handle leaving conversation room
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug(`User ${socket.data.user.userId} left conversation room: ${conversationId}`);
  });
};

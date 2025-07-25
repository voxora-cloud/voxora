import { Socket, Server } from 'socket.io';
import { MessageService } from '../../services';
import logger from '../../utils/logger';

export const handleMessage = (socket: Socket, io: Server): void => {
  // Handle sending messages
  socket.on('send_message', async (data: {
    conversationId: string;
    content: string;
    type?: string;
    metadata?: any;
  }) => {
    try {
      const message = await MessageService.sendMessage({
        conversationId: data.conversationId,
        senderId: socket.data.user.userId,
        content: data.content,
        type: data.type,
        metadata: data.metadata,
      });

      // Emit to conversation participants
      io.to(`conversation:${data.conversationId}`).emit('new_message', {
        message,
        conversationId: data.conversationId,
      });

      // Send acknowledgment to sender
      socket.emit('message_sent', {
        messageId: message._id,
        conversationId: data.conversationId,
        timestamp: message.createdAt,
      });

      logger.debug(`Message sent by ${socket.data.user.userId} in conversation ${data.conversationId}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('message_error', {
        error: 'Failed to send message',
        conversationId: data.conversationId,
      });
    }
  });

  // Handle message editing
  socket.on('edit_message', async (data: {
    messageId: string;
    content: string;
  }) => {
    try {
      const message = await MessageService.editMessage(
        data.messageId,
        socket.data.user.userId,
        data.content
      );

      if (message) {
        // Emit to conversation participants
        io.to(`conversation:${message.conversationId}`).emit('message_edited', {
          messageId: message._id,
          content: message.content,
          editedAt: message.metadata.editedAt,
          conversationId: message.conversationId,
        });
      }

      logger.debug(`Message edited by ${socket.data.user.userId}: ${data.messageId}`);
    } catch (error) {
      logger.error('Error editing message:', error);
      socket.emit('message_error', {
        error: 'Failed to edit message',
        messageId: data.messageId,
      });
    }
  });

  // Handle message deletion
  socket.on('delete_message', async (data: {
    messageId: string;
  }) => {
    try {
      await MessageService.deleteMessage(
        data.messageId,
        socket.data.user.userId
      );

      // Get message details first to find conversation
      const message = await MessageService.getMessages(data.messageId, socket.data.user.userId);
      
      // Emit to conversation participants
      if (message) {
        socket.broadcast.emit('message_deleted', {
          messageId: data.messageId,
          deletedBy: socket.data.user.userId,
          timestamp: new Date(),
        });
      }

      logger.debug(`Message deleted by ${socket.data.user.userId}: ${data.messageId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      socket.emit('message_error', {
        error: 'Failed to delete message',
        messageId: data.messageId,
      });
    }
  });

  // Handle marking messages as read
  socket.on('mark_as_read', async (data: {
    messageId: string;
  }) => {
    try {
      await MessageService.markMessageAsRead(
        data.messageId,
        socket.data.user.userId
      );

      // Emit read receipt to sender
      socket.broadcast.emit('message_read', {
        messageId: data.messageId,
        readBy: socket.data.user.userId,
        readAt: new Date(),
      });

      logger.debug(`Message marked as read by ${socket.data.user.userId}: ${data.messageId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  });

  // Handle getting conversation messages
  socket.on('get_messages', async (data: {
    conversationId: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const result = await MessageService.getMessages(
        data.conversationId,
        socket.data.user.userId,
        {
          page: data.page,
          limit: data.limit,
        }
      );

      socket.emit('messages_loaded', {
        conversationId: data.conversationId,
        messages: result.messages,
        pagination: {
          page: data.page || 1,
          limit: data.limit || 50,
          total: result.total,
          pages: result.pages,
        },
      });
    } catch (error) {
      logger.error('Error loading messages:', error);
      socket.emit('message_error', {
        error: 'Failed to load messages',
        conversationId: data.conversationId,
      });
    }
  });
};

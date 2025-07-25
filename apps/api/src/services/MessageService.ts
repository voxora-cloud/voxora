import { Message, IMessage, Conversation } from '../models';

export class MessageService {
  static async sendMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: string;
    metadata?: any;
  }): Promise<IMessage> {
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findOne({
      _id: data.conversationId,
      $or: [
        { participants: data.senderId },
        { assignedTo: data.senderId },
      ],
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Create message
    const message = new Message({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      type: data.type || 'text',
      metadata: data.metadata || {},
    });

    await message.save();
    await message.populate('senderId', 'name email avatar role');

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      status: conversation.status === 'closed' ? 'open' : conversation.status,
    });

    return message;
  }

  static async getMessages(
    conversationId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      before?: Date;
    } = {}
  ): Promise<{ messages: IMessage[]; total: number; pages: number }> {
    // Verify user has access to conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [
        { participants: userId },
        { assignedTo: userId },
      ],
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {
      conversationId,
      isDeleted: false,
    };

    if (options.before) {
      query.createdAt = { $lt: options.before };
    }

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('senderId', 'name email avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query),
    ]);

    // Reverse to get chronological order
    messages.reverse();

    return {
      messages,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  static async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<IMessage | null> {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user already marked as read
    const alreadyRead = message.metadata.readBy?.find(
      (read) => read.userId?.toString() === userId
    );

    if (!alreadyRead) {
      if (!message.metadata.readBy) {
        message.metadata.readBy = [];
      }
      
      message.metadata.readBy.push({
        userId,
        readAt: new Date(),
      });

      await message.save();
    }

    return message;
  }

  static async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<IMessage | null> {
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false,
    });

    if (!message) {
      throw new Error('Message not found or access denied');
    }

    message.content = newContent;
    message.metadata.isEdited = true;
    message.metadata.editedAt = new Date();

    await message.save();
    await message.populate('senderId', 'name email avatar role');

    return message;
  }

  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isDeleted: false,
    });

    if (!message) {
      throw new Error('Message not found or access denied');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return true;
  }

  static async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    const count = await Message.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      isDeleted: false,
      'metadata.readBy.userId': { $ne: userId },
    });

    return count;
  }
}

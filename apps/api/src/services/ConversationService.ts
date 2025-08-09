import { Conversation, IConversation, Message, IMessage, User } from '../models';
import { Types } from 'mongoose';

export class ConversationService {
  static async createConversation(data: {
    createdBy: string;
    participantId: string;
    subject?: string;
    priority?: string;
    tags?: string[];
  }): Promise<IConversation> {
    // Check if conversation already exists between these participants
    const existingConversation = await Conversation.findOne({
      participants: {
        $all: [data.createdBy, data.participantId],
        $size: 2,
      },
      status: { $in: ['open', 'pending'] },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: [data.createdBy, data.participantId],
      subject: data.subject,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      createdBy: data.createdBy,
    });

    await conversation.save();
    await conversation.populate('participants', 'name email avatar role status');
    
    return conversation;
  }

  static async getConversations(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      assignedTo?: string;
    } = {}
  ): Promise<{ conversations: IConversation[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { participants: userId },
        { assignedTo: userId },
        { createdBy: userId },
      ],
    };

    if (options.status) {
      query.status = options.status;
    }

    if (options.assignedTo) {
      query.assignedTo = options.assignedTo;
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('participants', 'name email avatar role status')
        .populate('assignedTo', 'name email avatar')
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(query),
    ]);

    return {
      conversations,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  static async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<IConversation | null> {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [
        { participants: userId },
        { assignedTo: userId },
        { createdBy: userId },
      ],
    })
      .populate('participants', 'name email avatar role status')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return conversation;
  }

  static async updateConversation(
    conversationId: string,
    userId: string,
    updates: {
      status?: string;
      assignedTo?: string;
      priority?: string;
      tags?: string[];
    }
  ): Promise<IConversation | null> {
    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        $or: [
          { participants: userId },
          { assignedTo: userId },
          { createdBy: userId },
        ],
      },
      updates,
      { new: true }
    )
      .populate('participants', 'name email avatar role status')
      .populate('assignedTo', 'name email avatar');

    return conversation;
  }

  static async assignConversation(
    conversationId: string,
    agentId: string
  ): Promise<IConversation | null> {
    // Verify agent exists and has the right role
    const agent = await User.findOne({
      _id: agentId,
      role: { $in: ['agent', 'admin'] },
      isActive: true,
    });

    if (!agent) {
      throw new Error('Invalid agent or agent not found');
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        assignedTo: agentId,
        status: 'pending',
      },
      { new: true }
    )
      .populate('participants', 'name email avatar role status')
      .populate('assignedTo', 'name email avatar');

    return conversation;
  }

  static async closeConversation(
    conversationId: string,
    closedBy: string
  ): Promise<IConversation | null> {
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        status: 'closed',
        closedAt: new Date(),
        closedBy,
      },
      { new: true }
    )
      .populate('participants', 'name email avatar role status')
      .populate('assignedTo', 'name email avatar');

    return conversation;
  }

  // Widget-specific methods
  static async createWidgetConversation(data: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    subject: string;
    initialMessage: string;
    widgetSessionId?: string;
    origin?: string;
  }): Promise<IConversation> {
    // Create a temporary customer user for widget conversations
    let customer = await User.findOne({ email: data.customerEmail });
    
    if (!customer) {
      customer = new User({
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        role: 'customer',
        isEmailVerified: false,
        // Widget customers don't need passwords as they're not authenticated users
        password: 'widget-customer-' + Date.now(),
      });
      await customer.save();
    }

    // Create conversation
    const conversation = new Conversation({
      participants: [customer._id],
      subject: data.subject,
      priority: 'medium',
      status: 'open',
      tags: ['widget'],
      metadata: {
        source: 'widget',
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        widgetSessionId: data.widgetSessionId,
        origin: data.origin,
      },
    });

    await conversation.save();

    // Create initial message
    if (data.initialMessage) {
      const message = new Message({
        conversationId: conversation._id,
        senderId: customer._id,
        content: data.initialMessage,
        type: 'text',
        metadata: {
          source: 'widget',
          senderName: data.customerName,
          senderEmail: data.customerEmail,
          widgetSessionId: data.widgetSessionId,
        },
      });
      await message.save();
    }

    await conversation.populate('participants', 'name email avatar role status');
    return conversation;
  }
}

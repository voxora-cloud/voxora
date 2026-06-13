import { Channel, IChannel, ChannelType } from "@shared/models/Channel";
import { Conversation, Message } from "@shared/models";
import { aiQueue } from "@shared/infra/queue";
import { ChannelStrategyFactory } from "./core/ChannelStrategyFactory";
import { SendMessageInput } from "./core/IChannelStrategy";
import logger from "@shared/core/logger";
import {
  CreateEmailChannelInput,
  CreateWhatsAppChannelInput,
  CreateTelegramChannelInput,
} from "./channels.types";

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * ChannelService is the "context" in the Strategy pattern.
 * It delegates all provider-specific logic to the strategy returned by
 * ChannelStrategyFactory, keeping this class channel-type agnostic.
 */
export class ChannelService {
  // ─── Create ─────────────────────────────────────────────────────────────────

  /**
   * Create an email channel for an organization.
   * One channel per org per type — enforced by model index + explicit check.
   */
  static async createEmailChannel(
    organizationId: string,
    input: CreateEmailChannelInput,
  ): Promise<IChannel> {
    // One channel per org per type
    const existing = await Channel.findOne({ organizationId, type: "email" });
    if (existing) {
      throw new Error(
        "An email channel already exists for this organization. Delete it first to create a new one.",
      );
    }

    // Build the initial channel config (pre-provision)
    const channel = await Channel.create({
      organizationId,
      type: "email" as ChannelType,
      name: input.name,
      isActive: true,
      config: {
        email: {
          address: input.email.trim().toLowerCase(),
          domain: input.domain.trim().toLowerCase(),
          verificationStatus: "pending",
          dnsRecords: [],
        },
      },
    });

    // Provision with SES — adds domain and fetches DNS records
    const strategy = ChannelStrategyFactory.create("email");
    const provisionResult = await strategy.provision(channel._id.toString(), channel.config);

    if (!provisionResult.success) {
      // Clean up the orphaned channel doc
      await Channel.findByIdAndDelete(channel._id);
      throw new Error(provisionResult.error || "Failed to provision email channel");
    }

    // Persist the updated config (domainId + dnsRecords)
    channel.config = provisionResult.updatedConfig;
    await channel.save();

    logger.info("[ChannelService] Email channel created and provisioned", {
      channelId: channel._id.toString(),
      organizationId,
      domain: input.domain,
    });

    return channel;
  }

  /**
   * Create a WhatsApp channel for an organization.
   * One channel per org per type — enforced by model index + explicit check.
   */
  static async createWhatsAppChannel(
    organizationId: string,
    input: CreateWhatsAppChannelInput,
  ): Promise<IChannel> {
    // One channel per org per type
    const existing = await Channel.findOne({ organizationId, type: "whatsapp" });
    if (existing) {
      throw new Error(
        "A WhatsApp channel already exists for this organization. Delete it first to create a new one.",
      );
    }

    // Build the initial channel config (pre-provision)
    const channel = await Channel.create({
      organizationId,
      type: "whatsapp" as ChannelType,
      name: input.name,
      isActive: true,
      config: {
        whatsapp: {
          phoneNumber: input.phoneNumber.trim(),
          accountSid: input.accountSid.trim(),
          authToken: input.authToken.trim(),
          messagingServiceSid: input.messagingServiceSid?.trim() || undefined,
          verificationStatus: "pending",
        },
      },
    });

    // Provision with WhatsApp strategy — validates Twilio credentials
    const strategy = ChannelStrategyFactory.create("whatsapp");
    const provisionResult = await strategy.provision(channel._id.toString(), channel.config);

    if (!provisionResult.success) {
      // Clean up the orphaned channel doc
      await Channel.findByIdAndDelete(channel._id);
      throw new Error(provisionResult.error || "Failed to provision WhatsApp channel");
    }

    // Persist the updated config (marked as verified)
    channel.config = provisionResult.updatedConfig;
    await channel.save();

    logger.info("[ChannelService] WhatsApp channel created and provisioned", {
      channelId: channel._id.toString(),
      organizationId,
      phoneNumber: input.phoneNumber,
    });

    return channel;
  }

  /**
   * Create a Telegram channel for an organization.
   * One channel per org per type — enforced by model index + explicit check.
   */
  static async createTelegramChannel(
    organizationId: string,
    input: CreateTelegramChannelInput,
  ): Promise<IChannel> {
    // One channel per org per type
    const existing = await Channel.findOne({ organizationId, type: "telegram" });
    if (existing) {
      throw new Error(
        "A Telegram channel already exists for this organization. Delete it first to create a new one.",
      );
    }

    // Build the initial channel config (pre-provision)
    const channel = await Channel.create({
      organizationId,
      type: "telegram" as ChannelType,
      name: input.name,
      isActive: true,
      config: {
        telegram: {
          botToken: input.botToken.trim(),
          verificationStatus: "pending",
        },
      },
    });

    // Provision with Telegram strategy — validates token and sets up webhook
    const strategy = ChannelStrategyFactory.create("telegram");
    const provisionResult = await strategy.provision(channel._id.toString(), channel.config);

    if (!provisionResult.success) {
      // Clean up the orphaned channel doc
      await Channel.findByIdAndDelete(channel._id);
      throw new Error(provisionResult.error || "Failed to provision Telegram channel");
    }

    // Persist the updated config (marked as verified + username)
    channel.config = provisionResult.updatedConfig;
    await channel.save();

    logger.info("[ChannelService] Telegram channel created and provisioned", {
      channelId: channel._id.toString(),
      organizationId,
      botUsername: channel.config.telegram?.botUsername,
    });

    return channel;
  }



  // ─── Read ────────────────────────────────────────────────────────────────────

  static async getChannel(organizationId: string): Promise<IChannel | null> {
    return Channel.findOne({ organizationId, type: "email" }).lean() as unknown as Promise<IChannel | null>;
  }

  static async getWhatsAppChannel(organizationId: string): Promise<IChannel | null> {
    return Channel.findOne({ organizationId, type: "whatsapp" }).lean() as unknown as Promise<IChannel | null>;
  }

  static async getTelegramChannel(organizationId: string): Promise<IChannel | null> {
    return Channel.findOne({ organizationId, type: "telegram" }).lean() as unknown as Promise<IChannel | null>;
  }



  static async getAllChannels(organizationId: string): Promise<IChannel[]> {
    return Channel.find({ organizationId }).lean() as unknown as Promise<IChannel[]>;
  }

  // ─── Verify ──────────────────────────────────────────────────────────────────

  /**
   * Trigger SES domain verification and update the channel's DNS records +
   * verification status in the database.
   */
  static async verifyChannel(
    organizationId: string,
    channelId: string,
  ): Promise<{ status: string; dnsRecords: unknown }> {
    const channel = await Channel.findOne({ _id: channelId, organizationId });
    if (!channel) {
      throw new Error("Channel not found");
    }

    const strategy = ChannelStrategyFactory.create(channel.type);
    const result = await strategy.checkVerification(channelId, channel.config);

    if (result.updatedConfig) {
      // Merge updated fields back (deep merge email config)
      if (result.updatedConfig.email) {
        channel.config.email = {
          ...channel.config.email!,
          ...result.updatedConfig.email,
        };
      }
      channel.markModified("config");
      await channel.save();
    }

    return {
      status: result.status,
      dnsRecords: channel.config.email?.dnsRecords ?? [],
    };
  }

  // ─── Send ────────────────────────────────────────────────────────────────────

  static async sendViaChannel(
    organizationId: string,
    channelId: string,
    input: Omit<SendMessageInput, "channelConfig">,
  ): Promise<{ messageId?: string }> {
    const channel = await Channel.findOne({ _id: channelId, organizationId });
    if (!channel) {
      throw new Error("Channel not found");
    }

    const strategy = ChannelStrategyFactory.create(channel.type);
    const result = await strategy.send({ ...input, channelConfig: channel.config });

    if (!result.success) {
      throw new Error(result.error || "Failed to send message via channel");
    }

    return { messageId: result.messageId };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  static async deleteChannel(
    organizationId: string,
    channelId: string,
  ): Promise<void> {
    const channel = await Channel.findOne({ _id: channelId, organizationId });
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Deprovision from provider first
    const strategy = ChannelStrategyFactory.create(channel.type);
    await strategy.deprovision(channelId, channel.config);

    await Channel.findByIdAndDelete(channelId);

    logger.info("[ChannelService] Channel deleted", {
      channelId,
      organizationId,
      type: channel.type,
    });
  }

  // ─── Inbound ─────────────────────────────────────────────────────────────────

  static async handleInbound(
    channelId: string,
    payload: unknown,
  ): Promise<{ conversationId?: string; messageId?: string }> {
    const channel = await Channel.findById(channelId);
    if (!channel || !channel.isActive) {
      throw new Error("Channel not found or inactive");
    }

    const strategy = ChannelStrategyFactory.create(channel.type);
    const result = await strategy.handleInbound({ raw: payload, channelId });

    if (!result.success) {
      throw new Error(result.error || "Failed to process inbound message");
    }

    // Enqueue message to aiQueue for AI processing if conversation is not assigned to a human
    if (result.conversationId && result.messageId) {
      try {
        const conversation = await Conversation.findById(result.conversationId);
        if (
          conversation &&
          !conversation.assignedTo &&
          !(conversation.metadata as any)?.escalatedAt &&
          !(conversation.metadata as any)?.humanJoinedAt &&
          !["active", "resolved", "closed"].includes(conversation.status)
        ) {
          const message = await Message.findById(result.messageId);
          if (message && message.content) {
            await aiQueue.add("process", {
              organizationId: channel.organizationId.toString(),
              conversationId: result.conversationId,
              content: message.content,
              messageId: result.messageId,
              channel: channel.type,
            });
            logger.info("[ChannelService] Inbound message enqueued for AI processing", {
              conversationId: result.conversationId,
              messageId: result.messageId,
              channel: channel.type,
            });
          }
        }
      } catch (err: any) {
        logger.error("[ChannelService] Failed to enqueue inbound message to aiQueue", {
          conversationId: result.conversationId,
          messageId: result.messageId,
          error: err.message,
        });
      }
    }

    return {
      conversationId: result.conversationId,
      messageId: result.messageId,
    };
  }
}

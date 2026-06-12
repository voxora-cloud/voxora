import {
  IChannelStrategy,
  ProvisionResult,
  VerificationResult,
  SendMessageInput,
  SendResult,
  InboundPayload,
  InboundResult,
} from "../core/IChannelStrategy";
import { IChannelConfig, Channel } from "@shared/models/Channel";
import { Conversation, Message } from "@shared/models";
import logger from "@shared/core/logger";
import { Types } from "mongoose";

/**
 * Concrete Strategy for the Instagram DM channel.
 */
export class InstagramChannelStrategy implements IChannelStrategy {
  readonly type = "instagram" as const;

  // ─── Provision ─────────────────────────────────────────────────────────────

  async provision(channelId: string, channelConfig: IChannelConfig): Promise<ProvisionResult> {
    const igCfg = channelConfig.instagram;
    if (!igCfg?.pageAccessToken) {
      return { success: false, updatedConfig: channelConfig, error: "Missing Instagram pageAccessToken" };
    }

    try {
      // Confirm the token is valid by querying Meta's Graph API
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${igCfg.pageAccessToken}`
      );

      if (!meRes.ok) {
        throw new Error(`Meta Graph API returned status ${meRes.status}`);
      }

      const meData = await meRes.json() as any;
      if (meData.error) {
        throw new Error(meData.error.message || "Failed to verify Page Access Token");
      }

      const updatedConfig: IChannelConfig = {
        ...channelConfig,
        instagram: {
          ...igCfg,
          verificationStatus: "verified",
        },
      };

      return { success: true, updatedConfig };
    } catch (err: any) {
      logger.error("[InstagramChannelStrategy] Provision failed", {
        channelId,
        error: err?.message,
      });
      return {
        success: false,
        updatedConfig: channelConfig,
        error: err?.message || "Failed to verify Meta Page Access Token.",
      };
    }
  }

  // ─── Verify ────────────────────────────────────────────────────────────────

  async checkVerification(
    _channelId: string,
    channelConfig: IChannelConfig,
  ): Promise<VerificationResult> {
    const igCfg = channelConfig.instagram;
    if (!igCfg?.pageAccessToken) {
      return {
        success: false,
        status: "failed",
        error: "Instagram not configured. Please complete OAuth connection first.",
      };
    }

    try {
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${igCfg.pageAccessToken}`
      );

      if (!meRes.ok) {
        throw new Error("Invalid Meta Page Access Token response");
      }

      const meData = await meRes.json() as any;
      if (meData.error) {
        throw new Error(meData.error.message || "Invalid Token");
      }

      const updatedInstagramConfig = {
        ...igCfg,
        verificationStatus: "verified" as const,
      };

      return {
        success: true,
        status: "verified",
        updatedConfig: { instagram: updatedInstagramConfig },
      };
    } catch (err: any) {
      logger.error("[InstagramChannelStrategy] Verification check failed", {
        error: err?.message,
      });
      return {
        success: false,
        status: "failed",
        error: err?.message || "Failed to verify Meta credentials",
      };
    }
  }

  // ─── Send ──────────────────────────────────────────────────────────────────

  async send(input: SendMessageInput): Promise<SendResult> {
    const igCfg = input.channelConfig.instagram;
    if (!igCfg?.pageAccessToken) {
      return { success: false, error: "No Instagram configuration found on channel" };
    }

    try {
      // recipient is the customer's Meta/Instagram-scoped user ID
      const recipientId = input.to;
      const res = await fetch(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${igCfg.pageAccessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: input.body },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Meta Graph API send failed: status ${res.status}`);
      }

      const data = await res.json() as any;
      if (data.error) {
        throw new Error(data.error.message || "Failed to deliver message via Instagram");
      }

      return { success: true, messageId: data.message_id || "" };
    } catch (err: any) {
      logger.error("[InstagramChannelStrategy] Send failed", { error: err?.message });
      return { success: false, error: err?.message || "Failed to send Instagram DM" };
    }
  }

  // ─── Inbound ───────────────────────────────────────────────────────────────

  async handleInbound(payload: InboundPayload): Promise<InboundResult> {
    try {
      const data = payload.raw as any;

      // Extract entry details
      if (data.object !== "instagram" || !Array.isArray(data.entry)) {
        return { success: false, error: "Invalid Instagram webhook object" };
      }

      const entry = data.entry[0];
      const messagingObj = entry?.messaging?.[0];
      if (!messagingObj || !messagingObj.message) {
        return { success: false, error: "No message payload in update" };
      }

      const senderId = messagingObj.sender?.id;
      const recipientId = messagingObj.recipient?.id;
      const bodyText = messagingObj.message.text || "";
      const messageMid = messagingObj.message.mid || "";

      if (!senderId || !bodyText) {
        return { success: false, error: "Missing sender ID or message text" };
      }

      // Look up the channel based on payload.channelId
      const channel = await Channel.findById(payload.channelId).lean();
      if (!channel) {
        logger.warn("[InstagramChannelStrategy] Inbound: channel not found", {
          channelId: payload.channelId,
        });
        return { success: false, error: "Channel not found" };
      }

      const organizationId = channel.organizationId;
      const senderName = `Instagram User ${senderId}`;

      // Find or create a Conversation for this Instagram chat thread
      // sessionId is "instagram-<senderId>"
      let conversation = await Conversation.findOne({
        organizationId,
        "visitor.sessionId": `instagram-${senderId}`,
        status: { $in: ["open", "pending"] },
        "metadata.channel": "instagram_channel",
        "metadata.channelId": payload.channelId,
      });

      if (!conversation) {
        const systemId = new Types.ObjectId("000000000000000000000000");

        conversation = await Conversation.create({
          organizationId,
          participants: [],
          subject: `Instagram DM Chat`,
          status: "open",
          priority: "medium",
          createdBy: systemId,
          tags: ["instagram"],
          metadata: {
            channel: "instagram_channel",
            channelId: payload.channelId,
            instagramAccountId: recipientId,
            customerId: senderId,
          },
          visitor: {
            sessionId: `instagram-${senderId}`,
            name: senderName,
            email: `${senderId}@instagram.local`,
            isAnonymous: false,
          },
        });

        logger.info("[InstagramChannelStrategy] Created new conversation for inbound Instagram DM", {
          conversationId: conversation._id.toString(),
          senderId,
          channelId: payload.channelId,
        });
      }

      // Add the message to the conversation
      const message = await Message.create({
        conversationId: conversation._id,
        organizationId,
        senderId: senderId.toString(),
        type: "text" as const,
        content: bodyText,
        metadata: {
          senderName,
          source: "instagram_channel",
          channelId: payload.channelId,
          messageMid,
        },
      });

      return {
        success: true,
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
      };
    } catch (err: any) {
      logger.error("[InstagramChannelStrategy] handleInbound failed", {
        channelId: payload.channelId,
        error: err?.message,
      });
      return { success: false, error: err?.message || "Failed to process inbound Instagram message" };
    }
  }

  // ─── Deprovision ───────────────────────────────────────────────────────────

  async deprovision(channelId: string, _channelConfig: IChannelConfig): Promise<void> {
    logger.info("[InstagramChannelStrategy] Instagram channel deprovisioned", { channelId });
  }
}

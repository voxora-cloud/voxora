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
import twilio from "twilio";
import { parseWhatsAppMarkdown } from "@shared/utils/markdown";

/**
 * Concrete Strategy for the WhatsApp channel using Twilio.
 */
export class WhatsAppChannelStrategy implements IChannelStrategy {
  readonly type = "whatsapp" as const;

  // ─── Provision ─────────────────────────────────────────────────────────────

  async provision(channelId: string, config: IChannelConfig): Promise<ProvisionResult> {
    const waCfg = config.whatsapp;
    if (!waCfg) {
      return { success: false, updatedConfig: config, error: "Missing WhatsApp config" };
    }

    try {
      // For Twilio BYOK, the organization enters their Account SID and Auth Token.
      // We do a quick dry-run check by instantiating the client.
      const client = twilio(waCfg.accountSid, waCfg.authToken);
      
      // Attempt to retrieve account details to verify the credentials work.
      await client.api.v2010.accounts(waCfg.accountSid).fetch();

      const updatedConfig: IChannelConfig = {
        ...config,
        whatsapp: {
          ...waCfg,
          verificationStatus: "verified",
        },
      };

      return { success: true, updatedConfig };
    } catch (err: any) {
      logger.error("[WhatsAppChannelStrategy] Provision failed", {
        channelId,
        error: err?.message,
      });
      return {
        success: false,
        updatedConfig: config,
        error: err?.message || "Failed to verify Twilio credentials. Check your Account SID and Auth Token.",
      };
    }
  }

  // ─── Verify ────────────────────────────────────────────────────────────────

  async checkVerification(
    _channelId: string,
    config: IChannelConfig,
  ): Promise<VerificationResult> {
    const waCfg = config.whatsapp;
    if (!waCfg?.accountSid || !waCfg?.authToken) {
      return {
        success: false,
        status: "failed",
        error: "WhatsApp not configured. Please fill in Twilio credentials first.",
      };
    }

    try {
      const client = twilio(waCfg.accountSid, waCfg.authToken);
      await client.api.v2010.accounts(waCfg.accountSid).fetch();

      const updatedWhatsappConfig = {
        ...waCfg,
        verificationStatus: "verified" as const,
      };

      return {
        success: true,
        status: "verified",
        updatedConfig: { whatsapp: updatedWhatsappConfig },
      };
    } catch (err: any) {
      logger.error("[WhatsAppChannelStrategy] Verification check failed", {
        error: err?.message,
      });
      return {
        success: false,
        status: "failed",
        error: err?.message || "Failed to verify Twilio credentials",
      };
    }
  }

  // ─── Send ──────────────────────────────────────────────────────────────────

  async send(input: SendMessageInput): Promise<SendResult> {
    const waCfg = input.channelConfig.whatsapp;
    if (!waCfg) {
      return { success: false, error: "No WhatsApp configuration found on channel" };
    }

    try {
      const client = twilio(waCfg.accountSid, waCfg.authToken);

      // In Twilio, WhatsApp senders/recipients must be prefixed with "whatsapp:"
      const from = waCfg.messagingServiceSid
        ? waCfg.messagingServiceSid
        : (waCfg.phoneNumber.startsWith("whatsapp:") ? waCfg.phoneNumber : `whatsapp:${waCfg.phoneNumber}`);
      
      const to = input.to.startsWith("whatsapp:") ? input.to : `whatsapp:${input.to}`;

      const formattedBody = parseWhatsAppMarkdown(input.body);
      const message = await client.messages.create({
        from,
        to,
        body: formattedBody,
      });

      return { success: true, messageId: message.sid };
    } catch (err: any) {
      logger.error("[WhatsAppChannelStrategy] Send failed", { error: err?.message });
      return { success: false, error: err?.message || "Failed to send WhatsApp message via Twilio" };
    }
  }

  // ─── Inbound ───────────────────────────────────────────────────────────────

  async handleInbound(payload: InboundPayload): Promise<InboundResult> {
    try {
      const data = payload.raw as any;

      // Extract Twilio webhook fields
      const fromPhoneRaw: string = data.From || "";
      const toPhoneRaw: string = data.To || "";
      const bodyText: string = data.Body || "";
      const messageSid: string = data.MessageSid || "";

      // Clean the customer number by removing the "whatsapp:" prefix
      const fromPhone = fromPhoneRaw.replace("whatsapp:", "").trim();

      if (!fromPhone || !bodyText) {
        return { success: false, error: "Missing sender phone or message body" };
      }

      // Look up the channel to get organization details
      const channel = await Channel.findById(payload.channelId).lean();
      if (!channel) {
        logger.warn("[WhatsAppChannelStrategy] Inbound: channel not found", {
          channelId: payload.channelId,
        });
        return { success: false, error: "Channel not found" };
      }

      const organizationId = channel.organizationId;

      // Find or create a Conversation for this WhatsApp thread.
      // We key on visitor sessionId e.g. "whatsapp-<fromPhone>" so threads are grouped.
      let conversation = await Conversation.findOne({
        organizationId,
        sessionId: `whatsapp-${fromPhone}`,
        status: { $in: ["open", "pending"] },
        $or: [
          { channel: "whatsapp_channel", channelId: payload.channelId },
          { "metadata.channel": "whatsapp_channel", "metadata.channelId": payload.channelId }
        ],
      });

      if (!conversation) {
        const systemId = new Types.ObjectId("000000000000000000000000");

        conversation = await Conversation.create({
          organizationId,
          participants: [],
          subject: `WhatsApp Chat with ${fromPhone}`,
          status: "open",
          priority: "medium",
          createdBy: systemId,
          tags: ["whatsapp"],
          channel: "whatsapp_channel",
          channelId: payload.channelId,
          metadata: {
            phone: fromPhone,
          },
          sessionId: `whatsapp-${fromPhone}`,
        });

        logger.info("[WhatsAppChannelStrategy] Created new conversation for inbound WhatsApp", {
          conversationId: conversation._id.toString(),
          from: fromPhone,
          channelId: payload.channelId,
        });
      }

      // Add the message to the conversation
      const message = await Message.create({
        conversationId: conversation._id,
        organizationId,
        senderId: fromPhone,
        type: "text" as const,
        content: bodyText,
        metadata: {
          senderName: fromPhone,
          source: "whatsapp_channel",
          channelId: payload.channelId,
          messageSid,
        },
      });

      return {
        success: true,
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
      };
    } catch (err: any) {
      logger.error("[WhatsAppChannelStrategy] handleInbound failed", {
        channelId: payload.channelId,
        error: err?.message,
      });
      return { success: false, error: err?.message || "Failed to process inbound WhatsApp message" };
    }
  }

  // ─── Deprovision ───────────────────────────────────────────────────────────

  async deprovision(channelId: string, _config: IChannelConfig): Promise<void> {
    logger.info("[WhatsAppChannelStrategy] WhatsApp channel deprovisioned", { channelId });
  }
}


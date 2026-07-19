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
import config from "@shared/infra/config";
import { parseTelegramHtml } from "@shared/utils/markdown";

/**
 * Concrete Strategy for the Telegram channel.
 */
export class TelegramChannelStrategy implements IChannelStrategy {
  readonly type = "telegram" as const;

  // ─── Provision ─────────────────────────────────────────────────────────────

  async provision(channelId: string, channelConfig: IChannelConfig): Promise<ProvisionResult> {
    const tgCfg = channelConfig.telegram;
    if (!tgCfg?.botToken) {
      return { success: false, updatedConfig: channelConfig, error: "Missing Telegram botToken" };
    }

    try {
      // 1. Verify Bot Token validity using Telegram getMe API
      const getMeRes = await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/getMe`);
      if (!getMeRes.ok) {
        throw new Error(`Telegram returned status ${getMeRes.status}`);
      }

      const getMeData = await getMeRes.json() as any;
      if (!getMeData.ok || !getMeData.result?.username) {
        throw new Error(getMeData.description || "Failed to fetch bot username");
      }

      const botUsername = getMeData.result.username;

      // 2. Register Webhook URL with Telegram programmatically
      // Webhook Endpoint URL: /api/v1/channels/telegram/inbound/:channelId
      const webhookUrl = `${config.app.apiUrl}/api/v1/channels/telegram/inbound/${channelId}`;
      logger.info(`[TelegramChannelStrategy] Registering webhook...`, { webhookUrl });

      const setWebhookRes = await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });

      if (!setWebhookRes.ok) {
        throw new Error(`Failed to set Telegram webhook: status ${setWebhookRes.status}`);
      }

      const setWebhookData = await setWebhookRes.json() as any;
      if (!setWebhookData.ok) {
        throw new Error(setWebhookData.description || "Failed to set webhook on Telegram");
      }

      const updatedConfig: IChannelConfig = {
        ...channelConfig,
        telegram: {
          ...tgCfg,
          botUsername,
          verificationStatus: "verified",
        },
      };

      return { success: true, updatedConfig };
    } catch (err: any) {
      logger.error("[TelegramChannelStrategy] Provision failed", {
        channelId,
        error: err?.message,
      });
      return {
        success: false,
        updatedConfig: channelConfig,
        error: err?.message || "Failed to verify Telegram bot token. Check your token.",
      };
    }
  }

  // ─── Verify ────────────────────────────────────────────────────────────────

  async checkVerification(
    _channelId: string,
    channelConfig: IChannelConfig,
  ): Promise<VerificationResult> {
    const tgCfg = channelConfig.telegram;
    if (!tgCfg?.botToken) {
      return {
        success: false,
        status: "failed",
        error: "Telegram not configured. Please fill in Bot Token first.",
      };
    }

    try {
      const getMeRes = await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/getMe`);
      if (!getMeRes.ok) {
        throw new Error("Invalid bot token status response");
      }

      const getMeData = await getMeRes.json() as any;
      if (!getMeData.ok) {
        throw new Error("Invalid bot token");
      }

      const updatedTelegramConfig = {
        ...tgCfg,
        botUsername: getMeData.result.username,
        verificationStatus: "verified" as const,
      };

      return {
        success: true,
        status: "verified",
        updatedConfig: { telegram: updatedTelegramConfig },
      };
    } catch (err: any) {
      logger.error("[TelegramChannelStrategy] Verification check failed", {
        error: err?.message,
      });
      return {
        success: false,
        status: "failed",
        error: err?.message || "Failed to verify Telegram credentials",
      };
    }
  }

  // ─── Send ──────────────────────────────────────────────────────────────────

  async send(input: SendMessageInput): Promise<SendResult> {
    const tgCfg = input.channelConfig.telegram;
    if (!tgCfg?.botToken) {
      return { success: false, error: "No Telegram configuration found on channel" };
    }

    try {
      const chatId = input.to;

      // Parse suggestion buttons from the message body
      const keyboardRows: any[] = [];
      const buttonRegex = /<interaone-button\s+action="([^"]+)">([^<]+)<\/interaone-button>/gi;
      let match;
      const buttons: { text: string }[] = [];
      while ((match = buttonRegex.exec(input.body)) !== null) {
        buttons.push({
          text: match[1], // Use the action string as the button text so it gets natively posted in the chat when clicked
        });
      }

      if (buttons.length > 0) {
        for (let i = 0; i < buttons.length; i += 2) {
          keyboardRows.push(buttons.slice(i, i + 2));
        }
      }

      // Clean HTML custom tags from body text
      const cleanedBody = input.body
        .replace(/<interaone-button\s+action="([^"]+)">([^<]+)<\/interaone-button>/gi, '')
        .replace(/<interaone-radio\s+name="[^"]+"\s+options="([^"]+)"\s*\/?>/gi, '')
        .replace(/<interaone-input\s+name="([^"]+)"\s+placeholder="([^"]+)"\s*\/?>/gi, '')
        .replace(/<\/?interaone-form[^>]*>/gi, '')
        .trim();

      const formattedText = parseTelegramHtml(cleanedBody);
      const payload: any = {
        chat_id: chatId,
        text: formattedText,
        parse_mode: "HTML",
      };

      if (keyboardRows.length > 0) {
        payload.reply_markup = {
          keyboard: keyboardRows,
          one_time_keyboard: true,
          resize_keyboard: true,
        };
      }

      const res = await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Telegram API send failed: status ${res.status}`);
      }

      const data = await res.json() as any;
      if (!data.ok) {
        throw new Error(data.description || "Failed to send message via Telegram");
      }

      return { success: true, messageId: data.result.message_id.toString() };
    } catch (err: any) {
      logger.error("[TelegramChannelStrategy] Send failed", { error: err?.message });
      return { success: false, error: err?.message || "Failed to send Telegram message" };
    }
  }

  // ─── Inbound ───────────────────────────────────────────────────────────────

  async handleInbound(payload: InboundPayload): Promise<InboundResult> {
    try {
      const data = payload.raw as any;

      // Extract update fields
      let messageObj = data.message;
      let bodyText = "";
      let isCallback = false;
      let callbackQueryId = "";

      if (data.callback_query) {
        isCallback = true;
        callbackQueryId = data.callback_query.id;
        messageObj = data.callback_query.message;
        bodyText = data.callback_query.data || "";
      }

      if (!messageObj) {
        return { success: false, error: "Missing message object in update payload" };
      }

      const chatId = messageObj.chat?.id;
      const fromUser = isCallback && data.callback_query ? data.callback_query.from : messageObj.from;
      const finalBodyText = bodyText || messageObj.text || "";
      const messageId = messageObj.message_id?.toString() || "";

      if (!chatId || !finalBodyText) {
        return { success: false, error: "Missing chat ID or message text" };
      }

      const tgCfg = (await Channel.findById(payload.channelId).lean())?.config.telegram;
      if (isCallback && tgCfg?.botToken) {
        fetch(`https://api.telegram.org/bot${tgCfg.botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callbackQueryId }),
        }).catch((err) => logger.error("[TelegramChannelStrategy] Failed to answer callback query", err));
      }

      const senderName = fromUser
        ? `${fromUser.first_name || ""} ${fromUser.last_name || ""}`.trim() || fromUser.username || chatId.toString()
        : chatId.toString();

      // Look up the channel to get organization details
      const channel = await Channel.findById(payload.channelId).lean();
      if (!channel) {
        logger.warn("[TelegramChannelStrategy] Inbound: channel not found", {
          channelId: payload.channelId,
        });
        return { success: false, error: "Channel not found" };
      }

      const organizationId = channel.organizationId;

      // Find or create a Conversation for this Telegram chat.
      // visitor sessionId is "telegram-<chatId>"
      let conversation = await Conversation.findOne({
        organizationId,
        sessionId: `telegram-${chatId}`,
        status: { $in: ["open", "pending"] },
        $or: [
          { channel: "telegram_channel", channelId: payload.channelId },
          { "metadata.channel": "telegram_channel", "metadata.channelId": payload.channelId }
        ],
      });

      if (!conversation) {
        const systemId = new Types.ObjectId("000000000000000000000000");

        conversation = await Conversation.create({
          organizationId,
          participants: [],
          subject: `Telegram Chat with ${senderName}`,
          status: "open",
          priority: "medium",
          createdBy: systemId,
          tags: ["telegram"],
          channel: "telegram_channel",
          channelId: payload.channelId,
          metadata: {
            chatId: chatId.toString(),
          },
          sessionId: `telegram-${chatId}`,
        });

        logger.info("[TelegramChannelStrategy] Created new conversation for inbound Telegram", {
          conversationId: conversation._id.toString(),
          chatId,
          channelId: payload.channelId,
        });
      }

      // Add the message to the conversation
      const message = await Message.create({
        conversationId: conversation._id,
        organizationId,
        senderId: chatId.toString(),
        type: "text" as const,
        content: finalBodyText,
        metadata: {
          source: "telegram_channel",
          channelId: payload.channelId,
          messageId,
        },
      });

      return {
        success: true,
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
      };
    } catch (err: any) {
      logger.error("[TelegramChannelStrategy] handleInbound failed", {
        channelId: payload.channelId,
        error: err?.message,
      });
      return { success: false, error: err?.message || "Failed to process inbound Telegram message" };
    }
  }

  // ─── Deprovision ───────────────────────────────────────────────────────────

  async deprovision(channelId: string, channelConfig: IChannelConfig): Promise<void> {
    const tgCfg = channelConfig.telegram;
    if (!tgCfg?.botToken) return;

    try {
      logger.info("[TelegramChannelStrategy] Deleting webhook...", { channelId });
      await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/deleteWebhook`);
    } catch (err: any) {
      logger.warn("[TelegramChannelStrategy] Failed to delete Telegram webhook", {
        channelId,
        error: err?.message,
      });
    }
  }
}

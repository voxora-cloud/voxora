import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";
import { ChannelService } from "./channels.service";
import { Channel } from "@shared/models/Channel";
import config from "@shared/infra/config";

import MessageValidator from "sns-validator";
import logger from "@shared/core/logger";
import twilio from "twilio";

const snsValidator = new MessageValidator();

const validateSnsMessage = (payload: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    snsValidator.validate(payload, (err, msg) => {
      if (err) {
        reject(err);
      } else {
        resolve(msg);
      }
    });
  });
};

const sanitizeChannel = (channel: any): any => {
  if (!channel) return channel;
  const obj = typeof channel.toObject === "function" ? channel.toObject() : JSON.parse(JSON.stringify(channel));
  if (obj.config?.whatsapp?.authToken) {
    obj.config.whatsapp.authToken = "********";
  }
  if (obj.config?.telegram?.botToken) {
    obj.config.telegram.botToken = "********";
  }
  return obj;
};

const sanitizeChannels = (channels: any[]): any[] => {
  return (channels || []).map(sanitizeChannel);
};

export class ChannelsController {
  /**
   * GET /channels
   * List all channels for the active organization.
   */
  static listChannels = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channels = await ChannelService.getAllChannels(activeOrganizationId);
    sendResponse(res, 200, true, "Channels fetched", { channels: sanitizeChannels(channels) });
  });

  /**
   * GET /channels/email
   * Get the organization's email channel (single channel per org).
   */
  static getEmailChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channel = await ChannelService.getChannel(activeOrganizationId);
    if (!channel) {
      return sendError(res, 404, "No email channel configured for this organization");
    }
    sendResponse(res, 200, true, "Email channel fetched", { channel: sanitizeChannel(channel) });
  });

  /**
   * POST /channels/email
   * Create and provision the organization's email channel.
   */
  static createEmailChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const { name, email, domain } = req.body;

    const channel = await ChannelService.createEmailChannel(activeOrganizationId, {
      name,
      email,
      domain,
    });

    sendResponse(res, 201, true, "Email channel created. Configure your DNS records to complete setup.", {
      channel: sanitizeChannel(channel),
    });
  });

  /**
   * GET /channels/whatsapp
   * Get the organization's WhatsApp channel (single channel per org).
   */
  static getWhatsAppChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channel = await ChannelService.getWhatsAppChannel(activeOrganizationId);
    if (!channel) {
      return sendError(res, 404, "No WhatsApp channel configured for this organization");
    }
    sendResponse(res, 200, true, "WhatsApp channel fetched", { channel: sanitizeChannel(channel) });
  });

  /**
   * POST /channels/whatsapp
   * Create and provision the organization's WhatsApp channel (BYOK).
   */
  static createWhatsAppChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const { name, phoneNumber, accountSid, authToken, messagingServiceSid } = req.body;

    const channel = await ChannelService.createWhatsAppChannel(activeOrganizationId, {
      name,
      phoneNumber,
      accountSid,
      authToken,
      messagingServiceSid,
    });

    sendResponse(res, 201, true, "WhatsApp channel connected and verified successfully.", {
      channel: sanitizeChannel(channel),
    });
  });

  /**
   * GET /channels/telegram
   * Get the organization's Telegram channel (single channel per org).
   */
  static getTelegramChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channel = await ChannelService.getTelegramChannel(activeOrganizationId);
    if (!channel) {
      return sendError(res, 404, "No Telegram channel configured for this organization");
    }
    sendResponse(res, 200, true, "Telegram channel fetched", { channel: sanitizeChannel(channel) });
  });

  /**
   * POST /channels/telegram
   * Create and provision the organization's Telegram channel (bot token).
   */
  static createTelegramChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const { name, botToken } = req.body;

    const channel = await ChannelService.createTelegramChannel(activeOrganizationId, {
      name,
      botToken,
    });

    sendResponse(res, 201, true, "Telegram channel connected and verified successfully.", {
      channel: sanitizeChannel(channel),
    });
  });



  /**
   * POST /channels/:channelId/verify
   * Re-trigger SES domain verification check.
   */
  static verifyChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channelId = String(req.params.channelId);

    const result = await ChannelService.verifyChannel(activeOrganizationId, channelId);
    sendResponse(res, 200, true, `Domain verification status: ${result.status}`, result);
  });


  /**
   * DELETE /channels/:channelId
   * Remove the channel + deprovision from SES.
   */
  static deleteChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channelId = String(req.params.channelId);

    await ChannelService.deleteChannel(activeOrganizationId, channelId);
    sendResponse(res, 200, true, "Channel deleted successfully", {});
  });

  /**
   * PATCH /channels/:channelId/email/addresses
   * Update the email addresses of an email channel.
   */
  static updateEmailChannelAddresses = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channelId = String(req.params.channelId);
    const { emails } = req.body;

    const channel = await ChannelService.updateEmailChannelAddresses(
      activeOrganizationId,
      channelId,
      emails,
    );

    sendResponse(res, 200, true, "Email channel addresses updated successfully", { channel: sanitizeChannel(channel) });
  });

   /**
   * POST /channels/inbound
   * Public endpoint — SES/SNS inbound email webhook.
   */
  static handleInbound = asyncHandler(async (req: Request, res: Response) => {
    let channelId = "";

    // 1. Ensure body is parsed (AWS SNS sends text/plain)
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        logger.error("[ChannelsController] Failed to parse inbound raw body as JSON", {
          channelId,
          error: (err as Error).message,
        });
        return sendError(res, 400, "Invalid JSON payload");
      }
    }

    if (!payload || typeof payload !== "object") {
      return sendError(res, 400, "Missing payload");
    }

    // 2. Validate SNS Message Signature
    try {
      await validateSnsMessage(payload);
    } catch (err: any) {
      logger.error("[ChannelsController] SNS signature verification failed", {
        channelId,
        error: err.message,
      });
      return sendError(res, 400, "SNS signature verification failed");
    }

    // 3. Handle SNS message types
    const snsType = payload.Type || payload.type;

    if (snsType === "SubscriptionConfirmation") {
      const subscribeUrl = payload.SubscribeURL || payload.subscribeUrl;
      if (!subscribeUrl) {
        logger.warn("[ChannelsController] SubscriptionConfirmation missing SubscribeURL", { channelId });
        return sendError(res, 400, "Missing SubscribeURL");
      }

      logger.info("[ChannelsController] Received SNS SubscriptionConfirmation request. Confirming...", {
        channelId: channelId || "global",
        subscribeUrl,
      });

      try {
        const confirmRes = await fetch(subscribeUrl);
        if (!confirmRes.ok) {
          throw new Error(`AWS returned status: ${confirmRes.status}`);
        }
        logger.info("[ChannelsController] SNS Subscription confirmed successfully", { channelId: channelId || "global" });
        return sendResponse(res, 200, true, "Subscription confirmed");
      } catch (err: any) {
        logger.error("[ChannelsController] Failed to confirm SNS subscription", {
          channelId: channelId || "global",
          error: err.message,
        });
        return sendError(res, 500, `Failed to confirm subscription: ${err.message}`);
      }
    }

    if (snsType === "UnsubscribeConfirmation") {
      logger.info("[ChannelsController] Received SNS UnsubscribeConfirmation notification", { channelId: channelId || "global" });
      return sendResponse(res, 200, true, "Unsubscribe acknowledged");
    }

    if (snsType === "Notification") {
      // The actual email payload is a JSON string in payload.Message
      let emailMessage: any;
      try {
        emailMessage = typeof payload.Message === "string" ? JSON.parse(payload.Message) : payload.Message;
      } catch (err: any) {
        logger.error("[ChannelsController] Failed to parse SNS message content", {
          channelId,
          error: err.message,
        });
        return sendError(res, 400, "Invalid SNS Message content");
      }

      // Check if it's a Received notification type from Amazon SES
      if (emailMessage?.notificationType !== "Received") {
        logger.info("[ChannelsController] Ignored non-Received SNS notification", {
          channelId,
          notificationType: emailMessage?.notificationType,
        });
        return sendResponse(res, 200, true, "Notification ignored (not a received email)");
      }

      // Resolve channelId dynamically if not provided in URL
      let resolvedChannelId = channelId;
      if (!resolvedChannelId) {
        const recipient = emailMessage?.mail?.destination?.[0]?.toLowerCase()?.trim();
        if (recipient) {
          const channel = await Channel.findOne({
            $or: [
              { "config.email.address": recipient },
              { "config.email.addresses": recipient },
            ],
          });
          if (channel) {
            resolvedChannelId = channel._id.toString();
          } else {
            logger.warn("[ChannelsController] No channel found matching recipient email", { recipient });
            return sendResponse(res, 200, true, "No channel matched recipient");
          }
        } else {
          logger.warn("[ChannelsController] Notification missing mail destination");
          return sendError(res, 400, "Missing mail destination in notification");
        }
      }

      // Respond immediately to AWS SNS to acknowledge receipt
      sendResponse(res, 200, true, "Notification received");

      // Process raw email asynchronously
      ChannelService.handleInbound(resolvedChannelId, emailMessage).catch((err) => {
        logger.error("[ChannelsController] handleInbound async processing failed", {
          channelId: resolvedChannelId,
          error: err?.message,
        });
      });
      return;
    }

    // Default/fallback for mock local test payloads
    let resolvedChannelId = channelId;
    if (!resolvedChannelId) {
      const recipient = (payload.to || payload.mail?.destination?.[0] || "").toLowerCase().trim();
      if (recipient) {
        const channel = await Channel.findOne({
          $or: [
            { "config.email.address": recipient },
            { "config.email.addresses": recipient },
          ],
        });
        if (channel) {
          resolvedChannelId = channel._id.toString();
        }
      }
    }

    if (!resolvedChannelId) {
      logger.warn("[ChannelsController] Could not resolve channelId for fallback payload");
      return sendError(res, 400, "Could not resolve channelId");
    }

    sendResponse(res, 200, true, "Payload received");
    ChannelService.handleInbound(resolvedChannelId, payload).catch((err) => {
      logger.error("[ChannelsController] handleInbound fallback processing failed", {
        channelId: resolvedChannelId,
        error: err?.message,
      });
    });
  });

  /**
   * POST /channels/whatsapp/inbound/:channelId
   * Public endpoint — Twilio inbound WhatsApp webhook.
   */
  static handleWhatsAppInbound = asyncHandler(async (req: Request, res: Response) => {
    const channelId = String(req.params.channelId);

    // 1. Fetch channel config to get Twilio Auth Token for signature verification
    const channel = await Channel.findById(channelId);
    if (!channel || !channel.isActive || channel.type !== "whatsapp") {
      logger.warn("[ChannelsController] WhatsApp Inbound: channel not found or inactive", { channelId });
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send("<Response></Response>");
    }

    const waCfg = channel.config.whatsapp;
    if (!waCfg) {
      logger.warn("[ChannelsController] WhatsApp Inbound: missing whatsapp config", { channelId });
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send("<Response></Response>");
    }

    // 2. Validate Twilio Signature
    const signature = req.headers["x-twilio-signature"] as string;
    if (!signature) {
      logger.error("[ChannelsController] Twilio inbound: missing x-twilio-signature header");
      res.setHeader("Content-Type", "text/xml");
      return res.status(400).send("<Response><Message>Missing signature</Message></Response>");
    }

    // Reconstruct the full request URL Twilio called
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.path}`;

    const verified = twilio.validateRequest(
      waCfg.authToken,
      signature,
      fullUrl,
      req.body
    );

    if (!verified) {
      logger.error("[ChannelsController] Twilio signature validation failed", {
        channelId,
        fullUrl,
      });
      res.setHeader("Content-Type", "text/xml");
      return res.status(400).send("<Response><Message>Invalid signature</Message></Response>");
    }

    // 3. Process Inbound Message asynchronously
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send("<Response></Response>");

    ChannelService.handleInbound(channelId, req.body).catch((err) => {
      logger.error("[ChannelsController] handleWhatsAppInbound async processing failed", {
        channelId,
        error: err?.message,
      });
    });
  });



  /**
   * POST /channels/telegram/inbound/:channelId
   * Public endpoint — Telegram inbound webhook.
   */
  static handleTelegramInbound = asyncHandler(async (req: Request, res: Response) => {
    const channelId = String(req.params.channelId);

    // 1. Fetch channel config
    const channel = await Channel.findById(channelId);
    if (!channel || !channel.isActive || channel.type !== "telegram") {
      logger.warn("[ChannelsController] Telegram Inbound: channel not found or inactive", { channelId });
      return res.status(200).send("OK");
    }

    // 2. Process Inbound Message asynchronously
    res.status(200).send("OK");

    ChannelService.handleInbound(channelId, req.body).catch((err) => {
      logger.error("[ChannelsController] handleTelegramInbound async processing failed", {
        channelId,
        error: err?.message,
      });
    });
  });
}

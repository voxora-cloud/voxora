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

export class ChannelsController {
  /**
   * GET /channels
   * List all channels for the active organization.
   */
  static listChannels = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channels = await ChannelService.getAllChannels(activeOrganizationId);
    sendResponse(res, 200, true, "Channels fetched", { channels });
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
    sendResponse(res, 200, true, "Email channel fetched", { channel });
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
      channel,
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
    sendResponse(res, 200, true, "WhatsApp channel fetched", { channel });
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
      channel,
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
    sendResponse(res, 200, true, "Telegram channel fetched", { channel });
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
      channel,
    });
  });

  /**
   * GET /channels/instagram
   * Get the organization's Instagram channel (single channel per org).
   */
  static getInstagramChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channel = await Channel.findOne({ organizationId: activeOrganizationId, type: "instagram" }).lean();
    if (!channel) {
      return sendError(res, 404, "No Instagram channel configured for this organization");
    }
    sendResponse(res, 200, true, "Instagram channel fetched", { channel });
  });

  /**
   * GET /channels/instagram/oauth/connect
   * Redirects users to Meta OAuth dialog.
   */
  static connectInstagramOauth = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const appId = config.meta.appId;
    const redirectUri = encodeURIComponent(config.meta.redirectUri);
    const scope = "instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list,instagram_basic";
    
    // Pass activeOrganizationId in the state parameter
    const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${activeOrganizationId}&response_type=code`;
    
    res.redirect(oauthUrl);
  });

  /**
   * GET /channels/instagram/oauth/callback
   * Processes the auth code, requests tokens, and configures the channel.
   */
  static handleInstagramOauthCallback = asyncHandler(async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const organizationId = req.query.state as string;

    if (!code) {
      logger.error("[Meta OAuth Callback] Missing authorization code");
      return res.redirect(`${config.app.clientUrl}/dashboard/channels?error=Missing+Auth+Code`);
    }

    if (!organizationId) {
      logger.error("[Meta OAuth Callback] Missing state/organizationId parameter");
      return res.redirect(`${config.app.clientUrl}/dashboard/channels?error=Invalid+State`);
    }

    try {
      const appId = config.meta.appId;
      const appSecret = config.meta.appSecret;
      const redirectUri = config.meta.redirectUri;

      // 1. Swap Code for User Access Token
      const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json() as any;
        throw new Error(errJson.error?.message || "Token exchange failed");
      }
      const tokenData = await tokenRes.json() as any;
      const userAccessToken = tokenData.access_token;

      // 2. Fetch User's Facebook Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${userAccessToken}`
      );
      if (!pagesRes.ok) {
        throw new Error("Failed to fetch user pages");
      }
      const pagesData = await pagesRes.json() as any;
      const pages = pagesData.data || [];
      if (pages.length === 0) {
        throw new Error("No Facebook Pages linked to this account");
      }

      // 3. Find Page connected to Instagram Business account
      let pageAccessToken = "";
      let instagramAccountId = "";
      let pageId = "";

      for (const page of pages) {
        const pageIdCheck = page.id;
        const pageTokenCheck = page.access_token;

        const igAcctRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageIdCheck}?fields=instagram_business_account&access_token=${pageTokenCheck}`
        );
        if (igAcctRes.ok) {
          const igAcctData = await igAcctRes.json() as any;
          if (igAcctData.instagram_business_account?.id) {
            pageAccessToken = pageTokenCheck;
            instagramAccountId = igAcctData.instagram_business_account.id;
            pageId = pageIdCheck;
            break;
          }
        }
      }

      if (!instagramAccountId) {
        throw new Error("No Instagram Business Account linked to your Facebook Pages. Check connection settings in Facebook Page.");
      }

      // 4. Trade for Long-Lived Page Access Token
      const llTokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${pageAccessToken}`;
      const llTokenRes = await fetch(llTokenUrl);
      if (!llTokenRes.ok) {
        throw new Error("Failed to trade long-lived Page Token");
      }
      const llTokenData = await llTokenRes.json() as any;
      const longLivedPageToken = llTokenData.access_token || pageAccessToken;

      // 5. Get Instagram Username
      const igProfileRes = await fetch(
        `https://graph.facebook.com/v20.0/${instagramAccountId}?fields=username&access_token=${longLivedPageToken}`
      );
      let instagramUsername = "Instagram Bot";
      if (igProfileRes.ok) {
        const igProfileData = await igProfileRes.json() as any;
        instagramUsername = igProfileData.username || instagramUsername;
      }

      // 6. Connect / Create the channel
      await ChannelService.createInstagramChannel(organizationId, {
        name: `${instagramUsername} Instagram`,
        pageAccessToken: longLivedPageToken,
        instagramAccountId,
        instagramUsername,
        pageId,
      });

      // Redirect back to frontend dashboard
      res.redirect(`${config.app.clientUrl}/dashboard/channels?connected=instagram`);
    } catch (err: any) {
      logger.error("[Meta OAuth Callback] Flow failed", { error: err.message });
      res.redirect(
        `${config.app.clientUrl}/dashboard/channels?error=${encodeURIComponent(
          err.message || "Failed to configure Instagram channel"
        )}`
      );
    }
  });

  /**
   * POST /channels/:channelId/verify
   * Re-trigger Resend domain verification check.
   */
  static verifyChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channelId = String(req.params.channelId);

    const result = await ChannelService.verifyChannel(activeOrganizationId, channelId);
    sendResponse(res, 200, true, `Domain verification status: ${result.status}`, result);
  });

  /**
   * POST /channels/:channelId/send
   * AI-agent initiated send through a channel (protected by AI secret).
   */
  static sendViaChannel = asyncHandler(async (req: Request, res: Response) => {
    const channelId = String(req.params.channelId);
    const { to, subject, body, html, replyTo } = req.body;

    // Resolve org from the channel itself — AI secret routes have no user context
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      return sendError(res, 404, "Channel not found");
    }

    const result = await ChannelService.sendViaChannel(
      channel.organizationId.toString(),
      channelId,
      { to, subject, body, html, replyTo },
    );

    sendResponse(res, 200, true, "Message sent via channel", result);
  });

  /**
   * DELETE /channels/:channelId
   * Remove the channel + deprovision from Resend.
   */
  static deleteChannel = asyncHandler(async (req: Request, res: Response) => {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const channelId = String(req.params.channelId);

    await ChannelService.deleteChannel(activeOrganizationId, channelId);
    sendResponse(res, 200, true, "Channel deleted successfully", {});
  });

  /**
   * POST /channels/inbound/:channelId
   * Public endpoint — SES/SNS inbound email webhook.
   */
  static handleInbound = asyncHandler(async (req: Request, res: Response) => {
    let channelId = req.params.channelId ? String(req.params.channelId) : "";

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

    // 2. Validate SNS Message Signature (optional skip for testing)
    const skipValidation = process.env.SKIP_SNS_VALIDATION === "true";
    if (!skipValidation) {
      try {
        await validateSnsMessage(payload);
      } catch (err: any) {
        logger.error("[ChannelsController] SNS signature verification failed", {
          channelId,
          error: err.message,
        });
        return sendError(res, 400, "SNS signature verification failed");
      }
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
          const channel = await Channel.findOne({ "config.email.address": recipient });
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
        const channel = await Channel.findOne({ "config.email.address": recipient });
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

    // 2. Validate Twilio Signature (optional skip for testing)
    const skipValidation = process.env.SKIP_TWILIO_VALIDATION === "true";
    if (!skipValidation) {
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
   * GET /channels/instagram/inbound
   * Handles webhook verification challenge from Meta.
   */
  static handleInstagramWebhookValidation = asyncHandler(async (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    logger.info("[Meta Webhook Verification] Received request", { mode, token });

    if (mode === "subscribe" && token === config.meta.verifyToken) {
      logger.info("[Meta Webhook Verification] Subscription verified successfully");
      res.status(200).send(challenge);
      return;
    }

    logger.warn("[Meta Webhook Verification] Verification failed. Token mismatch");
    res.sendStatus(403);
  });

  /**
   * POST /channels/instagram/inbound
   * Handles inbound Instagram DM webhook events from Meta.
   */
  static handleInstagramInbound = asyncHandler(async (req: Request, res: Response) => {
    const entry = req.body.entry?.[0];
    const messagingObj = entry?.messaging?.[0];
    const recipientId = messagingObj?.recipient?.id;

    if (!recipientId) {
      logger.debug("[Instagram Inbound Webhook] Received empty or non-messaging webhook event");
      return res.status(200).send("OK");
    }

    // 1. Resolve the Instagram channel config matching the receiving Instagram Scoped ID (recipientId)
    const channel = await Channel.findOne({
      type: "instagram",
      $or: [
        { "config.instagram.instagramAccountId": recipientId },
        { "config.instagram.pageId": recipientId }
      ]
    });

    if (!channel || !channel.isActive) {
      logger.warn("[Instagram Inbound Webhook] Ignored message: No active channel found matching recipient", { recipientId });
      return res.status(200).send("OK");
    }

    // 2. Respond Meta 200 OK immediately
    res.status(200).send("OK");

    // 3. Process the Inbound Message payload asynchronously
    ChannelService.handleInbound(channel._id.toString(), req.body).catch((err) => {
      logger.error("[ChannelsController] handleInstagramInbound async processing failed", {
        channelId: channel._id.toString(),
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

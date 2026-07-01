import { Router } from "express";
import {
  authenticate,
  resolveOrganization,
  requireRole,
  validateAiSecret,
  validateRequest,
} from "@shared/security/middleware";
import { ChannelsController } from "./channels.controller";
import { channelsSchema } from "./channels.schema";

export const channelsRouter = Router();

import express from "express";

// ── Public: SES/SNS inbound webhook (no auth — SNS posts to this) ─────────────

/**
 * @openapi
 * /channels/inbound:
 *   post:
 *     summary: Handle inbound SES/SNS email webhook events
 *     tags:
 *       - Channels
 *     responses:
 *       200:
 *         description: Event received successfully
 */
channelsRouter.post(
  "/inbound",
  express.text({ type: "*/*" }),
  ChannelsController.handleInbound,
);



// ── Public: Twilio WhatsApp inbound webhook (no auth — Twilio posts to this) ───

/**
 * @openapi
 * /channels/whatsapp/inbound/{channelId}:
 *   post:
 *     summary: Handle inbound Twilio WhatsApp message webhooks
 *     tags:
 *       - Channels
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook event processed successfully
 */
channelsRouter.post(
  "/whatsapp/inbound/:channelId",
  express.urlencoded({ extended: true }),
  ChannelsController.handleWhatsAppInbound,
);

// ── Public: Telegram inbound webhook (no auth — Telegram posts to this) ────────

/**
 * @openapi
 * /channels/telegram/inbound/{channelId}:
 *   post:
 *     summary: Handle inbound Telegram bot message webhooks
 *     tags:
 *       - Channels
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook event processed successfully
 */
channelsRouter.post(
  "/telegram/inbound/:channelId",
  express.json(),
  ChannelsController.handleTelegramInbound,
);

// ── AI tool: send via channel (AI secret protected) ───────────────────────────

/**
 * @openapi
 * /channels/{channelId}/send:
 *   post:
 *     summary: Send a reply or message through a channel from AI context
 *     tags:
 *       - Channels
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully through the channel
 *       401:
 *         description: Invalid AI secret
 */
channelsRouter.post(
  "/:channelId/send",
  validateAiSecret,
  validateRequest(channelsSchema.sendViaChannel),
  ChannelsController.sendViaChannel,
);

// ── All other routes require authenticated user ───────────────────────────────
channelsRouter.use(authenticate, resolveOrganization);

/**
 * @openapi
 * /channels:
 *   get:
 *     summary: List all active channels for the organization
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved channels list
 *       401:
 *         description: Unauthorized
 */
channelsRouter.get(
  "/",
  ChannelsController.listChannels,
);

/**
 * @openapi
 * /channels/email:
 *   get:
 *     summary: Get organization's Email channel details
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Email channel config details retrieved
 *       404:
 *         description: No active Email channel configured
 */
channelsRouter.get(
  "/email",
  ChannelsController.getEmailChannel,
);

/**
 * @openapi
 * /channels/email:
 *   post:
 *     summary: Configure and provision a new Email channel
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *             properties:
 *               name:
 *                 type: string
 *               domain:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email channel configured successfully
 *       400:
 *         description: Invalid input payload
 */
channelsRouter.post(
  "/email",
  requireRole("admin"),
  validateRequest(channelsSchema.createEmailChannel),
  ChannelsController.createEmailChannel,
);

/**
 * @openapi
 * /channels/whatsapp:
 *   get:
 *     summary: Get organization's WhatsApp channel details
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: WhatsApp channel config details retrieved
 *       404:
 *         description: No active WhatsApp channel configured
 */
channelsRouter.get(
  "/whatsapp",
  ChannelsController.getWhatsAppChannel,
);

/**
 * @openapi
 * /channels/whatsapp:
 *   post:
 *     summary: Configure and provision a new WhatsApp channel
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumberId
 *               - wabaId
 *               - accessToken
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumberId:
 *                 type: string
 *               wabaId:
 *                 type: string
 *               accessToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: WhatsApp channel configured successfully
 */
channelsRouter.post(
  "/whatsapp",
  requireRole("admin"),
  validateRequest(channelsSchema.createWhatsAppChannel),
  ChannelsController.createWhatsAppChannel,
);

/**
 * @openapi
 * /channels/telegram:
 *   get:
 *     summary: Get organization's Telegram channel details
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram channel config details retrieved
 *       404:
 *         description: No active Telegram channel configured
 */
channelsRouter.get(
  "/telegram",
  ChannelsController.getTelegramChannel,
);

/**
 * @openapi
 * /channels/telegram:
 *   post:
 *     summary: Configure and provision a new Telegram bot channel
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - botToken
 *             properties:
 *               name:
 *                 type: string
 *               botToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Telegram channel configured successfully
 */
channelsRouter.post(
  "/telegram",
  requireRole("admin"),
  validateRequest(channelsSchema.createTelegramChannel),
  ChannelsController.createTelegramChannel,
);

/**
 * @openapi
 * /channels/{channelId}/verify:
 *   post:
 *     summary: Trigger manual verification for a channel (e.g. DNS domain status)
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel verification triggered successfully
 */
channelsRouter.post(
  "/:channelId/verify",
  requireRole("admin"),
  validateRequest(channelsSchema.channelParams, "params"),
  ChannelsController.verifyChannel,
);

/**
 * @openapi
 * /channels/{channelId}:
 *   delete:
 *     summary: Delete a channel configuration
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 */
channelsRouter.delete(
  "/:channelId",
  requireRole("admin"),
  validateRequest(channelsSchema.channelParams, "params"),
  ChannelsController.deleteChannel,
);

/**
 * @openapi
 * /channels/{channelId}/email/addresses:
 *   patch:
 *     summary: Update email addresses for an Email channel
 *     tags:
 *       - Channels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emails
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Email channel addresses updated successfully
 */
channelsRouter.patch(
  "/:channelId/email/addresses",
  requireRole("admin"),
  validateRequest(channelsSchema.channelParams, "params"),
  validateRequest(channelsSchema.updateEmailChannelAddresses),
  ChannelsController.updateEmailChannelAddresses,
);
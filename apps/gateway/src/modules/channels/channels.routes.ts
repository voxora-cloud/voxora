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
channelsRouter.post(
  "/inbound",
  express.text({ type: "*/*" }),
  ChannelsController.handleInbound,
);
channelsRouter.post(
  "/inbound/:channelId",
  express.text({ type: "*/*" }),
  ChannelsController.handleInbound,
);

// ── Public: Twilio WhatsApp inbound webhook (no auth — Twilio posts to this) ───
channelsRouter.post(
  "/whatsapp/inbound/:channelId",
  express.urlencoded({ extended: true }),
  ChannelsController.handleWhatsAppInbound,
);

// ── Public: Telegram inbound webhook (no auth — Telegram posts to this) ────────
channelsRouter.post(
  "/telegram/inbound/:channelId",
  express.json(),
  ChannelsController.handleTelegramInbound,
);



// ── AI tool: send via channel (AI secret protected) ───────────────────────────
channelsRouter.post(
  "/:channelId/send",
  validateAiSecret,
  validateRequest(channelsSchema.sendViaChannel),
  ChannelsController.sendViaChannel,
);

// ── All other routes require authenticated user ───────────────────────────────
channelsRouter.use(authenticate, resolveOrganization);

// List all channels for the org
channelsRouter.get(
  "/",
  ChannelsController.listChannels,
);

// Get the email channel (one per org)
channelsRouter.get(
  "/email",
  ChannelsController.getEmailChannel,
);

// Create the email channel (admin+)
channelsRouter.post(
  "/email",
  requireRole("admin"),
  validateRequest(channelsSchema.createEmailChannel),
  ChannelsController.createEmailChannel,
);

// Get the WhatsApp channel (one per org)
channelsRouter.get(
  "/whatsapp",
  ChannelsController.getWhatsAppChannel,
);

// Create the WhatsApp channel (admin+)
channelsRouter.post(
  "/whatsapp",
  requireRole("admin"),
  validateRequest(channelsSchema.createWhatsAppChannel),
  ChannelsController.createWhatsAppChannel,
);

// Get the Telegram channel (one per org)
channelsRouter.get(
  "/telegram",
  ChannelsController.getTelegramChannel,
);

// Create the Telegram channel (admin+)
channelsRouter.post(
  "/telegram",
  requireRole("admin"),
  validateRequest(channelsSchema.createTelegramChannel),
  ChannelsController.createTelegramChannel,
);



// Trigger domain re-verification (admin+)
channelsRouter.post(
  "/:channelId/verify",
  requireRole("admin"),
  validateRequest(channelsSchema.channelParams, "params"),
  ChannelsController.verifyChannel,
);

// Delete a channel (admin+)
channelsRouter.delete(
  "/:channelId",
  requireRole("admin"),
  validateRequest(channelsSchema.channelParams, "params"),
  ChannelsController.deleteChannel,
);
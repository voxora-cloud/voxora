import { redisClient } from "@shared/infra/redis";
import { Conversation, Message, Contact, Ticket, Channel } from "@shared/models";
import { ChannelService } from "@modules/channels/channels.service";
import { incrementMessageUsage } from "@shared/security/middleware";
import { tracker } from "@shared/utils/tracker";
import logger from "@shared/core/logger";
import type SocketManager from "@sockets/index";
import { buildTicketLifecycleEmail } from "@shared/utils/email";

const PUBSUB_CHANNEL = "ai:response";

// ── Consumer startup ───────────────────────────────────────────────────────────

export async function startAIResponseConsumer(
  socketManager: SocketManager,
): Promise<void> {
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  // ── AI response channel ──────────────────────────────────────────────────────
  await subscriber.subscribe(PUBSUB_CHANNEL, async (message) => {
    try {
      const { conversationId, messageId, content, usage, nonce } = JSON.parse(
        message,
      ) as {
        conversationId: string;
        messageId?: string;
        content: string;
        usage?: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
          estimatedCostUsd?: number;
        };
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", {
          NX: true,
          EX: 30,
        });
        if (!claimed) return;
      }

      // Resolve org and channel details from conversation record
      const conv = await Conversation.findById(conversationId)
        .select(
          "organizationId status channel channelId metadata assignedTo sessionId subject",
        )
        .lean();

      if (!conv) return;

      // Fetch contact matching the conversation's sessionId
      let contact = null;
      if (conv.sessionId) {
        contact = await Contact.findOne({
          organizationId: conv.organizationId,
          sessionId: conv.sessionId,
        }).lean();
      }

      if (
        (conv as any).metadata?.escalatedAt ||
        (conv as any).metadata?.humanJoinedAt ||
        (conv as any).assignedTo ||
        ["resolved", "closed"].includes((conv as any).status)
      ) {
        logger.info(
          `[AI Response] Skipping ${conversationId} because conversation is escalated or closed`,
        );
        return;
      }

      const organizationId = conv?.organizationId?.toString() || "";

      // ── Message usage tracking ──────────────────────────────────────────────
      const usageResult = await incrementMessageUsage(organizationId);
      if (usageResult.blocked) {
        logger.warn(
          `[AI Response] Message limit reached for org=${organizationId} (used=${usageResult.used} limit=${usageResult.limit}) — dropping AI response`,
        );
        socketManager.emitToConversation(conversationId, "limit_reached", {
          limitType: "messages",
          currentUsage: usageResult.used,
          limit: usageResult.limit,
          upgradeRequired: true,
        });
        return;
      }

      const msg = new Message({
        conversationId,
        organizationId,
        senderId: "ai-bot",
        content,
        type: "text",
        metadata: {
          senderName: "AI Assistant",
          senderEmail: "ai@interaone.internal",
          source: "ai",
        },
      });
      await msg.save();

      // Forward AI response to external channels if applicable
      let channelType =
        (conv as any).channel || (conv as any).metadata?.channel;
      let channelId =
        (conv as any).channelId || (conv as any).metadata?.channelId;

      // Check if there is an associated ticket for this conversation
      const ticket = await Ticket.findOne({
        organizationId: conv.organizationId,
        conversationId: conv._id,
      }).lean();

      if (ticket) {
        let ticketChannelType: string;
        if (ticket.source === "whatsapp") {
          ticketChannelType = "whatsapp";
        } else if (ticket.source === "telegram") {
          ticketChannelType = "telegram";
        } else {
          ticketChannelType = "email"; // All other sources (email, widget, ai, agent, api) reply via Email
        }

        let activeChannel = await Channel.findOne({
          organizationId: conv.organizationId,
          type: ticketChannelType,
          isActive: true,
        }).lean();

        if (activeChannel) {
          channelType =
            ticketChannelType === "email"
              ? "email_channel"
              : `${ticketChannelType}_channel`;
          channelId = activeChannel._id;
        }
      }

      if (channelType && channelId) {
        const channelIdStr = channelId.toString();
        let to: string | undefined;
        const convMeta = (conv.metadata as any) || {};

        if (channelType === "email_channel") {
          to = contact?.email || convMeta.senderEmail;
          if (!to && conv.sessionId?.startsWith("email-")) {
            to = conv.sessionId.replace("email-", "");
          }
          if (!to && ticket?.contactId) {
            const contact = await Contact.findById(ticket.contactId).lean();
            if (contact?.email) {
              to = contact.email;
            }
          }
          if (!to && conv.sessionId) {
            const fallbackContact = await Contact.findOne({
              organizationId: conv.organizationId,
              sessionId: conv.sessionId,
            }).lean();
            if (fallbackContact?.email) {
              to = fallbackContact.email;
            }
          }
        } else if (channelType === "whatsapp_channel") {
          to = convMeta.phone || contact?.phone;
          if (!to && conv.sessionId?.startsWith("whatsapp-")) {
            to = conv.sessionId.replace("whatsapp-", "");
          }
          if (!to && ticket?.contactId) {
            const contact = await Contact.findById(ticket.contactId).lean();
            if (contact?.phone) {
              to = contact.phone;
            }
          }
        } else if (channelType === "telegram_channel") {
          to = convMeta.chatId;
          if (!to && conv.sessionId?.startsWith("telegram-")) {
            to = conv.sessionId.replace("telegram-", "");
          }
          if (!to && ticket?.contactId) {
            const contact = await Contact.findById(ticket.contactId).lean();
            if (contact?.sessionId?.startsWith("telegram-")) {
              to = contact.sessionId.replace("telegram-", "");
            }
          }
        }

        if (to) {
          let emailHtml: string | undefined;
          let emailSubject: string | undefined;

          if (channelType === "email_channel" && ticket) {
            try {
              const emailObj = await buildTicketLifecycleEmail("updated", {
                name: contact?.name || "there",
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                status: String(ticket.status).replace(/_/g, " "),
                priority: ticket.priority,
                updateSummary: content,
              });
              emailHtml = emailObj.html;
              emailSubject = emailObj.subject;
            } catch (err) {
              logger.error(
                `[AI Response Consumer] Failed to build ticket lifecycle email template:`,
                err,
              );
            }
          }

          ChannelService.sendViaChannel(organizationId, channelIdStr, {
            to,
            subject: emailSubject || (conv as any).subject || "Reply from Support",
            body: content,
            html: emailHtml,
            from: (conv as any).metadata?.supportEmail,
          }).catch((err: any) => {
            logger.error(
              `[AI Response Consumer] Failed to forward AI response to channel ${channelType}:`,
              err,
            );
          });
        }
      }
      tracker.trackMessage(
        organizationId,
        "ai",
        { messageLength: content.length },
        { conversationId, channel: "widget" },
      );

      tracker.trackEvent(
        organizationId,
        "ai_response",
        "ai",
        { messageLength: content.length },
        { conversationId, channel: "widget" },
      );

      const hasTokenUsage = Boolean(
        usage &&
        ((usage.totalTokens && usage.totalTokens > 0) ||
          (usage.promptTokens && usage.promptTokens > 0) ||
          (usage.completionTokens && usage.completionTokens > 0)),
      );

      if (hasTokenUsage) {
        tracker.trackEvent(
          organizationId,
          "ai_token_usage",
          "ai",
          {
            promptTokens: usage?.promptTokens || 0,
            completionTokens: usage?.completionTokens || 0,
            totalTokens: usage?.totalTokens || 0,
            estimatedCostUsd: usage?.estimatedCostUsd || 0,
          },
          { conversationId, channel: "widget" },
        );
      }

      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
        streamMessageId: messageId,
        message: {
          _id: msg._id,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        },
      });

      logger.info(`AI response delivered to conversation ${conversationId}`);
    } catch (err) {
      logger.error("Failed to handle AI response:", err);
    }
  });

  // ── AI stream channel ──────────────────────────────────────────────────────
  await subscriber.subscribe("ai:stream", async (raw) => {
    try {
      const { conversationId, chunk, isThought, seq, messageId, toolEvent } =
        JSON.parse(raw) as {
          conversationId: string;
          chunk: string;
          isThought: boolean;
          seq?: number;
          messageId?: string;
          toolEvent?: {
            type: "start" | "complete";
            toolName: string;
            label: string;
            detail?: string;
          };
        };

      // Do not forward stream chunks once a human has taken over
      const conv = await Conversation.findById(conversationId)
        .select("status metadata assignedTo")
        .lean();
      if (
        (conv as any)?.metadata?.escalatedAt ||
        (conv as any)?.metadata?.humanJoinedAt ||
        (conv as any)?.assignedTo ||
        ["resolved", "closed"].includes((conv as any)?.status)
      ) {
        return;
      }

      // Emit chunk directly to active clients without DB persistence
      socketManager.emitToConversation(conversationId, "ai_stream_chunk", {
        conversationId,
        chunk,
        isThought,
        seq,
        messageId,
        toolEvent,
      });
    } catch (err) {
      logger.error("Failed to handle AI stream chunk:", err);
    }
  });

  logger.info("AI response subscriber ready");
}

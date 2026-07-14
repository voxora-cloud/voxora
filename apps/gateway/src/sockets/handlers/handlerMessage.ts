import {
  Message,
  Conversation,
  Widget,
  Organization,
  Ticket,
  Channel,
  Contact,
} from "@shared/models";
import logger from "@shared/core/logger";
import config from "@shared/infra/config";
import { aiQueue } from "@shared/infra/queue";
import { getSocketManager } from "@sockets/index";
import { ConversationService } from "@modules/conversation/conversation.service";
import { ChannelService } from "@modules/channels/channels.service";
import { tracker } from "@shared/utils/tracker";
import { buildTicketLifecycleEmail } from "@shared/utils/email";

const conversationService = new ConversationService();

export const handleMessage = ({ socket, io }: { socket: any; io: any }) => {
  socket.on(
    "send_message",
    async (data: {
      conversationId: string;
      content: string;
      type: string;
      metadata?: {
        senderName?: string;
        senderEmail?: string;
        source: string;
        interactionSource?: string;
      };
    }) => {
      const { conversationId, content, type, metadata } = data;

      try {
        // Fetch conversation to get sessionId and widget config
        const conversation = await Conversation.findById(conversationId)
          .select(
            "organizationId sessionId channel channelId metadata assignedTo status subject",
          )
          .lean();

        if (!conversation) {
          logger.error(`Conversation ${conversationId} not found`);
          return;
        }

        // Fetch contact matching the conversation's sessionId
        let contact = null;
        if (conversation.sessionId) {
          contact = await Contact.findOne({
            organizationId: conversation.organizationId,
            sessionId: conversation.sessionId,
          }).lean();
        }

        // Determine sender metadata
        let messageMetadata = metadata || { source: "widget" };

        if (metadata?.source === "widget") {
          messageMetadata = {
            senderName:
              metadata?.senderName || contact?.name || "Anonymous User",
            senderEmail:
              metadata?.senderEmail || contact?.email || "anonymous@temp.local",
            source: "widget",
            interactionSource:
              metadata?.interactionSource ||
              (conversation.metadata as any)?.interactionSource ||
              (conversation.metadata as any)?.source ||
              "widget",
          };
        }

        const message = new Message({
          organizationId: conversation.organizationId,
          conversationId,
          senderId: socket.id,
          content,
          type,
          metadata: messageMetadata,
        });

        await message.save();

        // Update conversation's last activity
        await Conversation.updateOne(
          { _id: conversationId },
          { $currentDate: { updatedAt: true } },
        );

        // Emit message to other members of the conversation (avoid echo to sender)
        socket.to(`conversation:${conversationId}`).emit("new_message", {
          conversationId,
          message: {
            _id: message._id,
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            metadata: message.metadata,
            createdAt: message.createdAt,
          },
        });

        // Only process widget messages through the AI/routing pipeline
        if (messageMetadata.source !== "widget") {
          const organizationId = conversation.organizationId.toString();
          const agentId = socket.data?.user?.userId;
          const startedAt = (conversation as any).metadata?.customer?.startedAt;

          tracker.trackMessage(
            organizationId,
            "agent",
            { messageLength: content.length },
            { conversationId, agentId, channel: "web" },
          );

          if (agentId) {
            await Conversation.updateOne(
              { _id: conversationId },
              {
                $set: {
                  assignedTo: agentId,
                  "metadata.humanJoinedAt":
                    (conversation as any).metadata?.humanJoinedAt || new Date(),
                  "metadata.escalatedAt":
                    (conversation as any).metadata?.escalatedAt || new Date(),
                  "metadata.pendingEscalation": false,
                  "metadata.pendingOfflineEscalation": false,
                },
                $addToSet: { participants: agentId },
              },
            );

            const sm = getSocketManager();
            if (sm) {
              sm.emitToConversation(conversationId, "conversation_assigned", {
                conversationId,
                agentId,
                agentName: socket.data?.user?.name,
              });
            }
          }

          // Forward agent reply to channels if applicable
          let channelType =
            (conversation as any).channel ||
            (conversation as any).metadata?.channel;
          let channelId =
            (conversation as any).channelId ||
            (conversation as any).metadata?.channelId;

          // Check if there is an associated ticket for this conversation
          const ticket = await Ticket.findOne({
            organizationId: conversation.organizationId,
            conversationId: conversation._id,
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

            logger.info("[handleMessage] Resolved ticket channel type", {
              ticketId: ticket._id,
              ticketSource: ticket.source,
              resolvedChannelType: ticketChannelType,
            });

            let activeChannel = await Channel.findOne({
              organizationId: conversation.organizationId,
              type: ticketChannelType,
              isActive: true,
            }).lean();

            if (
              !activeChannel &&
              ticketChannelType === "email" &&
              config.email.provider === "mailhog"
            ) {
              // Auto-create a mock email channel for this organization in dev/mailhog mode
              logger.info(
                "[handleMessage] No active email channel found for organization in Mailhog mode. Auto-creating a mock email channel.",
                {
                  organizationId: conversation.organizationId,
                },
              );
              activeChannel = (await Channel.create({
                organizationId: conversation.organizationId,
                type: "email",
                name: "Local Dev Email Channel",
                isActive: true,
                config: {
                  email: {
                    address: "support@localhost.local",
                    addresses: ["support@localhost.local"],
                    domain: "localhost.local",
                    verificationStatus: "verified",
                    dnsRecords: [],
                  },
                },
              })) as any;
            }

            if (activeChannel) {
              channelType =
                ticketChannelType === "email"
                  ? "email_channel"
                  : `${ticketChannelType}_channel`;
              channelId = activeChannel._id;
            }
          }

          logger.info("[handleMessage] Outbound message dispatch decision", {
            conversationId,
            channelType,
            channelId: channelId?.toString(),
            hasTicket: !!ticket,
          });

          if (channelType && channelId) {
            const channelIdStr = channelId.toString();
            let to: string | undefined;
            const convMeta = (conversation.metadata as any) || {};

            if (channelType === "email_channel") {
              to = contact?.email || convMeta.senderEmail;
              if (!to && conversation.sessionId?.startsWith("email-")) {
                to = conversation.sessionId.replace("email-", "");
              }
              if (!to && ticket?.contactId) {
                const contact = await Contact.findById(ticket.contactId).lean();
                if (contact?.email) {
                  to = contact.email;
                }
              }
              if (!to && conversation.sessionId) {
                const fallbackContact = await Contact.findOne({
                  organizationId: conversation.organizationId,
                  sessionId: conversation.sessionId,
                }).lean();
                if (fallbackContact?.email) {
                  to = fallbackContact.email;
                }
              }
            } else if (channelType === "whatsapp_channel") {
              to = convMeta.phone || contact?.phone;
              if (!to && conversation.sessionId?.startsWith("whatsapp-")) {
                to = conversation.sessionId.replace("whatsapp-", "");
              }
              if (!to && ticket?.contactId) {
                const contact = await Contact.findById(ticket.contactId).lean();
                if (contact?.phone) {
                  to = contact.phone;
                }
              }
            } else if (channelType === "telegram_channel") {
              to = convMeta.chatId;
              if (!to && conversation.sessionId?.startsWith("telegram-")) {
                to = conversation.sessionId.replace("telegram-", "");
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
                  logger.error("[handleMessage] Failed to build ticket lifecycle email template:", err);
                }
              }

              ChannelService.sendViaChannel(organizationId, channelIdStr, {
                to,
                subject: emailSubject || conversation.subject || "Reply from Support",
                body: content,
                html: emailHtml,
                from: conversation.metadata?.supportEmail,
              }).catch((err: any) => {
                logger.error(
                  `[handleMessage] Failed to forward agent reply to channel ${channelType}:`,
                  err,
                );
              });
            }
          }

          if (startedAt) {
            const responseTimeMs = Date.now() - new Date(startedAt).getTime();
            const updateResult = await Conversation.updateOne(
              {
                _id: conversationId,
                "metadata.firstAgentReplyAt": { $exists: false },
              },
              {
                $set: {
                  "metadata.firstAgentReplyAt": new Date(),
                  "metadata.firstAgentReplyBy": agentId || undefined,
                },
              },
            );

            if (updateResult.modifiedCount > 0) {
              tracker.trackEvent(
                organizationId,
                "agent_first_response",
                "agent",
                { responseTimeMs },
                { conversationId, agentId, channel: "web" },
              );
            }
          }

          return;
        }

        // Once escalated to a human OR already resolved, stop feeding into AI pipeline.
        if (
          (conversation as any).metadata?.escalatedAt ||
          (conversation as any).metadata?.humanJoinedAt ||
          conversation.assignedTo ||
          ["resolved", "closed"].includes((conversation as any).status)
        ) {
          return; // message was saved & broadcast above; just don't run AI
        }

        // â”€â”€ Resolve widget config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const widgetKey: string | undefined =
          (conversation.metadata as any)?.widgetKey ?? undefined;

        let companyName: string | undefined;
        let aiEnabled = true;
        let fallbackToAgent = true;
        let collectUserInfo: {
          name?: boolean;
          email?: boolean;
          phone?: boolean;
        } = {};

        if (widgetKey) {
          try {
            const widget = await Widget.findById(widgetKey)
              .select("displayName ai conversation features")
              .lean();

            if (widget) {
              companyName = (widget as any).displayName || undefined;
              aiEnabled = (widget as any).ai?.enabled !== false; // default true
              fallbackToAgent = (widget as any).ai?.fallbackToAgent !== false; // default true
              collectUserInfo =
                (widget as any).conversation?.collectUserInfo || {};
            }
          } catch {
            // Non-fatal — fall back to defaults
            logger.warn(
              `[handleMessage] Could not fetch widget config for key ${widgetKey}`,
            );
          }
        }

        const org = await Organization.findById(conversation.organizationId)
          .select("subscriptionStatus")
          .lean();
        const subscriptionExpired = org
          ? org.subscriptionStatus !== null &&
          org.subscriptionStatus !== undefined &&
          org.subscriptionStatus !== "active"
          : false;

        // ── Route: enqueue AI job with full config ─────────────────
        aiQueue
          .add("process", {
            organizationId: conversation.organizationId!.toString(),
            conversationId,
            content,
            messageId: message._id.toString(),
            companyName,
            fallbackToAgent,
            collectUserInfo,
            channel: "widget",
            aiEnabled,
            subscriptionExpired,
          })
          .catch((err) => logger.error("Failed to enqueue AI job:", err));
      } catch (error) {
        logger.error("Error handling send_message:", error);
      }
    },
  );

  // Handler for joining conversation rooms
  socket.on("join_conversation", async (conversationId: string) => {
    try {
      const orgId = socket.data?.user?.orgId;
      const isWidget = socket.data?.user?.isWidget;
      const userId = socket.data?.user?.userId;

      if (!orgId) {
        logger.error(
          `Unauthorized join_conversation attempt by socket ${socket.id}: No organization ID`,
        );
        return;
      }

      // Fetch the conversation to verify organization/tenant ownership
      const conversation = await Conversation.findById(conversationId)
        .select("organizationId")
        .lean();
      if (!conversation || conversation.organizationId.toString() !== orgId) {
        logger.warn(
          `Unauthorized join_conversation attempt by ${isWidget ? "Widget" : "User"} ${userId} (org: ${orgId}) for conversation ${conversationId}`,
        );
        return;
      }

      const roomName = `conversation:${conversationId}`;
      const orgScopedRoom = `org:${orgId}:conv:${conversationId}`;

      socket.join(roomName);
      socket.join(orgScopedRoom);

      logger.debug(
        `${isWidget ? "Widget" : "User"} ${userId} joined org:${orgId}:conv:${conversationId}`,
      );

      if (
        socket.data?.user?.orgRole === "agent" ||
        socket.data?.user?.orgRole === "admin" ||
        socket.data?.user?.orgRole === "owner"
      ) {
        logger.info(
          `Agent ${socket.data.user.name} (${socket.data.user.userId}) joined conversation room ${conversationId}`,
        );
      } else {
        logger.info(
          `Widget user ${socket.id} joined conversation room ${conversationId}`,
        );
      }
    } catch (error) {
      logger.error("Error joining conversation:", error);
    }
  });

  // Handler for leaving conversation rooms
  socket.on("leave_conversation", (conversationId: string) => {
    const orgId = socket.data?.user?.orgId;
    const roomName = `conversation:${conversationId}`;
    socket.leave(roomName);
    if (orgId) {
      socket.leave(`org:${orgId}:conv:${conversationId}`);
    }
    logger.info(`User left conversation ${conversationId}`);
  });

  // Handler for typing indicators
  socket.on("typing_start", (data: { conversationId: string }) => {
    const { conversationId } = data;
    const roomName = `conversation:${conversationId}`;

    if (
      socket.data?.user?.orgRole === "agent" ||
      socket.data?.user?.orgRole === "admin" ||
      socket.data?.user?.orgRole === "owner"
    ) {
      socket.to(roomName).emit("agent_typing", {
        conversationId,
        agentName: socket.data.user.name,
      });
    } else {
      socket.to(roomName).emit("customer_typing", { conversationId });
    }
  });

  socket.on("typing_stop", (data: { conversationId: string }) => {
    const { conversationId } = data;
    const roomName = `conversation:${conversationId}`;

    if (
      socket.data?.user?.orgRole === "agent" ||
      socket.data?.user?.orgRole === "admin" ||
      socket.data?.user?.orgRole === "owner"
    ) {
      socket.to(roomName).emit("agent_stopped_typing", { conversationId });
    } else {
      socket.to(roomName).emit("customer_stopped_typing", { conversationId });
    }
  });
};

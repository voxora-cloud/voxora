import { Message, Conversation, Widget } from "@shared/models";
import logger from "@shared/core/logger";
import { aiQueue } from "@shared/infra/queue";
import { getSocketManager } from "@sockets/index";
import { ConversationService } from "@modules/conversation/conversation.service";
import { ChannelService } from "@modules/channels/channels.service";
import { tracker } from "@shared/utils/tracker";

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
        // Fetch conversation to get visitor info and widget config
        const conversation = await Conversation.findById(conversationId)
          .select("organizationId visitor metadata assignedTo status subject")
          .lean();

        if (!conversation) {
          logger.error(`Conversation ${conversationId} not found`);
          return;
        }

        // Determine sender metadata
        let messageMetadata = metadata || { source: "widget" };

        if (metadata?.source === "widget") {
          messageMetadata = {
            senderName: metadata?.senderName || conversation.visitor?.name || "Anonymous User",
            senderEmail: metadata?.senderEmail || conversation.visitor?.email || "anonymous@temp.local",
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

          // Forward agent reply to channels if applicable
          if (conversation.metadata) {
            const convMeta = conversation.metadata as any;
            if (convMeta.channel && convMeta.channelId) {
              const channelId = convMeta.channelId;
              let to: string | undefined;

              if (convMeta.channel === "email_channel") {
                to = conversation.visitor?.email;
              } else if (convMeta.channel === "whatsapp_channel") {
                to = convMeta.phone || conversation.visitor?.name;
              } else if (convMeta.channel === "telegram_channel") {
                to = convMeta.chatId || conversation.visitor?.sessionId?.replace("telegram-", "");
              } else if (convMeta.channel === "instagram_channel") {
                to = convMeta.customerId || conversation.visitor?.sessionId?.replace("instagram-", "");
              }

              if (to) {
                ChannelService.sendViaChannel(
                  organizationId,
                  channelId.toString(),
                  {
                    to,
                    subject: conversation.subject || "Reply from Support",
                    body: content,
                  }
                ).catch((err: any) => {
                  logger.error(`[handleMessage] Failed to forward agent reply to channel ${convMeta.channel}:`, err);
                });
              }
            }
          }

          if (startedAt) {
            const responseTimeMs = Date.now() - new Date(startedAt).getTime();
            const updateResult = await Conversation.updateOne(
              { _id: conversationId, "metadata.firstAgentReplyAt": { $exists: false } },
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
          ["active", "resolved", "closed"].includes((conversation as any).status)
        ) {
          return; // message was saved & broadcast above; just don't run AI
        }

        // â”€â”€ Resolve widget config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const widgetKey: string | undefined = (conversation.metadata as any)?.widgetKey ?? undefined;

        let companyName: string | undefined;
        let aiEnabled = true;
        let fallbackToAgent = true;
        let collectUserInfo: { name?: boolean; email?: boolean; phone?: boolean } = {};

        if (widgetKey) {
          try {
            const widget = await Widget.findById(widgetKey)
              .select("displayName ai conversation features")
              .lean();

            if (widget) {
              companyName = (widget as any).displayName || undefined;
              aiEnabled = (widget as any).ai?.enabled !== false; // default true
              fallbackToAgent = (widget as any).ai?.fallbackToAgent !== false; // default true
              collectUserInfo = (widget as any).conversation?.collectUserInfo || {};
            }
          } catch {
            // Non-fatal â€” fall back to defaults
            logger.warn(`[handleMessage] Could not fetch widget config for key ${widgetKey}`);
          }
        }

        // Keep conversation unassigned when AI is disabled.
        // Human routing should happen only through escalation/manual pickup.
        if (!aiEnabled) {
          logger.info(`[handleMessage] AI disabled for widget ${widgetKey} — attempting auto-escalation`);

          const { agentId } = await conversationService.autoAssignConversation(conversation.organizationId.toString());

          if (agentId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                status: "open",
                assignedTo: agentId,
                "metadata.escalatedAt": new Date(),
                "metadata.routeReason": "AI disabled — auto-assigned to available agent",
              },
              $addToSet: { participants: agentId },
            });

            tracker.trackEvent(
              conversation.organizationId.toString(),
              "agent_assigned",
              "system",
              { reason: "ai_disabled_auto_assign" },
              { conversationId, agentId, channel: "widget" },
            );

            const sm = getSocketManager();
            if (sm) {
              sm.emitToUser(agentId, "new_widget_conversation", {
                conversationId,
                subject: conversation.subject,
                message: content,
                timestamp: new Date(),
                routeReason: "AI disabled — auto-assigned to you",
              });
            }
          } else {
            // No one online - mark as pending escalation so it's hidden until someone picks it up
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                status: "pending",
                "metadata.pendingEscalation": true,
                "metadata.routeReason": "AI disabled — awaiting human (no one online)",
              },
            });
          }

          return; // Do not enqueue AI job
        }

        // â”€â”€ Route: AI enabled â†’ enqueue AI job with full config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        aiQueue
          .add("process", {
            organizationId: conversation.organizationId!.toString(),
            conversationId,
            content,
            messageId: message._id.toString(),
            companyName,
            fallbackToAgent,
            collectUserInfo,
          })
          .catch((err) =>
            logger.error("Failed to enqueue AI job:", err),
          );
      } catch (error) {
        logger.error("Error handling send_message:", error);
      }
    },
  );

  // Handler for joining conversation rooms
  socket.on("join_conversation", async (conversationId: string) => {
    try {
      const roomName = `conversation:${conversationId}`;
      socket.join(roomName);

      if (
        socket.data?.user?.orgRole === "agent" ||
        socket.data?.user?.orgRole === "admin" ||
        socket.data?.user?.orgRole === "owner"
      ) {
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            assignedTo: socket.data.user.userId,
            status: "active",
            "metadata.humanJoinedAt": new Date(),
            "metadata.escalatedAt": new Date(),
            "metadata.pendingEscalation": false,
            "metadata.routeReason": "Human agent joined conversation",
          },
          $addToSet: { participants: socket.data.user.userId },
        });

        io.to(roomName).emit("conversation_assigned", {
          conversationId,
          agentId: socket.data.user.userId,
          agentName: socket.data.user.name,
        });

        logger.info(
          `Agent ${socket.data.user.name} (${socket.data.user.userId}) joined conversation ${conversationId}`,
        );
      } else {
        logger.info(
          `Widget user ${socket.id} joined conversation ${conversationId}`,
        );
      }
    } catch (error) {
      logger.error("Error joining conversation:", error);
    }
  });

  // Handler for leaving conversation rooms
  socket.on("leave_conversation", (conversationId: string) => {
    const roomName = `conversation:${conversationId}`;
    socket.leave(roomName);
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

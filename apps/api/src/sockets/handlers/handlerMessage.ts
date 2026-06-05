import { Message, Conversation, Widget } from "@shared/models";
import logger from "@shared/core/logger";
import { aiQueue } from "@shared/infra/queue";
import { getSocketManager } from "@sockets/index";
import { ConversationService } from "@modules/conversation/conversation.service";
import { tracker } from "@shared/utils/tracker";
import { lookupFaqFastPathAnswer } from "@shared/clients/faq-fast-path-client";

const conversationService = new ConversationService();

type ConversationMetadata = {
  widgetKey?: string;
  customer?: {
    startedAt?: string | Date;
  };
  escalatedAt?: string | Date | null;
  humanJoinedAt?: string | Date | null;
};

type WidgetConfig = {
  displayName?: string;
  ai?: {
    enabled?: boolean;
    fallbackToAgent?: boolean;
  };
  conversation?: {
    collectUserInfo?: {
      name?: boolean;
      email?: boolean;
      phone?: boolean;
    };
  };
};

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
            senderName:
              metadata?.senderName ||
              conversation.visitor?.name ||
              "Anonymous User",
            senderEmail:
              metadata?.senderEmail ||
              conversation.visitor?.email ||
              "anonymous@temp.local",
            source: "widget",
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
          const conversationMetadata = conversation.metadata as
            | ConversationMetadata
            | undefined;
          const startedAt = conversationMetadata?.customer?.startedAt;

          tracker.trackMessage(
            organizationId,
            "agent",
            { messageLength: content.length },
            { conversationId, agentId, channel: "web" },
          );

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

        const conversationMetadata = conversation.metadata as
          | ConversationMetadata
          | undefined;

        // Once escalated to a human OR already resolved, stop feeding into AI pipeline.
        if (
          conversationMetadata?.escalatedAt ||
          conversationMetadata?.humanJoinedAt ||
          conversation.assignedTo ||
          ["active", "resolved", "closed"].includes(
            String(conversation.status || ""),
          )
        ) {
          return; // message was saved & broadcast above; just don't run AI
        }

        // Resolve widget config.
        const widgetKey = conversationMetadata?.widgetKey;

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
              .lean<WidgetConfig>();

            if (widget) {
              companyName = widget.displayName || undefined;
              aiEnabled = widget.ai?.enabled !== false; // default true
              fallbackToAgent = widget.ai?.fallbackToAgent !== false; // default true
              collectUserInfo = widget.conversation?.collectUserInfo || {};
            }
          } catch {
            // Non-fatal; fall back to defaults.
            logger.warn(
              `[handleMessage] Could not fetch widget config for key ${widgetKey}`,
            );
          }
        }

        const organizationId = conversation.organizationId.toString();
        // When AI is disabled, route to humans before trying any AI shortcut.
        if (!aiEnabled) {
          logger.info(
            `[handleMessage] AI disabled for widget ${widgetKey}; attempting auto-escalation`,
          );

          const { agentId } =
            await conversationService.autoAssignConversation(organizationId);

          if (agentId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                status: "open",
                assignedTo: agentId,
                "metadata.escalatedAt": new Date(),
                "metadata.routeReason":
                  "AI disabled; auto-assigned to available agent",
              },
              $addToSet: { participants: agentId },
            });

            tracker.trackEvent(
              organizationId,
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
                routeReason: "AI disabled; auto-assigned to you",
              });
            }
          } else {
            // No one online - mark as pending escalation so it's hidden until someone picks it up
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                status: "pending",
                "metadata.pendingEscalation": true,
                "metadata.routeReason":
                  "AI disabled; awaiting human (no one online)",
              },
            });
          }

          return; // Do not enqueue AI job
        }

        const faqFastPath =
          type === "text"
            ? await lookupFaqFastPathAnswer({
                organizationId,
                message: content,
              })
            : null;

        if (faqFastPath) {
          const assistantMessage = new Message({
            organizationId,
            conversationId,
            senderId: "ai-bot",
            content: faqFastPath.answer,
            type: "text",
            metadata: {
              senderName: "AI Assistant",
              senderEmail: "ai@interaone.internal",
              source: "ai",
              answeredBy: "faq",
              tokensUsed: 0,
            },
          });

          await assistantMessage.save();

          tracker.trackMessage(
            organizationId,
            "ai",
            { messageLength: faqFastPath.answer.length },
            { conversationId, channel: "widget" },
          );

          tracker.trackEvent(
            organizationId,
            "ai_response",
            "ai",
            { messageLength: faqFastPath.answer.length, answeredBy: "faq" },
            { conversationId, channel: "widget" },
          );

          io.to(`conversation:${conversationId}`).emit("new_message", {
            conversationId,
            message: {
              _id: assistantMessage._id,
              senderId: assistantMessage.senderId,
              content: assistantMessage.content,
              type: assistantMessage.type,
              metadata: assistantMessage.metadata,
              createdAt: assistantMessage.createdAt,
            },
          });

          logger.info("FAQ fast-path response delivered", {
            organizationId,
            conversationId,
            score: faqFastPath.score,
          });

          return;
        }

        // Route AI-enabled conversations through FAQ fast-path or the full AI job.
        aiQueue
          .add("process", {
            organizationId,
            conversationId,
            content,
            messageId: message._id.toString(),
            companyName,
            fallbackToAgent,
            collectUserInfo,
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

import { Message, Conversation, Widget } from "@shared/models";
import logger from "@shared/utils/logger";
import { aiQueue } from "@shared/config/queue";
import { getSocketManager } from "@sockets/index";

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
        const conversation = await Conversation.findById(conversationId);

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
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { updatedAt: new Date() },
        });

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
        if (messageMetadata.source !== "widget") return;

        // Once escalated to a human OR already resolved, stop feeding into AI pipeline.
        if (
          (conversation as any).metadata?.escalatedAt ||
          (conversation as any).metadata?.humanJoinedAt ||
          conversation.assignedTo ||
          ["active", "resolved", "closed"].includes((conversation as any).status)
        ) {
          return; // message was saved & broadcast above; just don't run AI
        }

        // ── Resolve widget config ────────────────────────────────────────────────
        const widgetKey: string | undefined = (conversation.metadata as any)?.widgetKey ?? undefined;

        let companyName: string | undefined;
        let aiEnabled = true;
        let fallbackToAgent = true;
        let collectUserInfo: { name?: boolean; email?: boolean; phone?: boolean } = {};
        let teamId: string | undefined = (conversation.metadata as any)?.teamId ?? undefined;

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
            // Non-fatal — fall back to defaults
            logger.warn(`[handleMessage] Could not fetch widget config for key ${widgetKey}`);
          }
        }

        // ── Route: AI disabled → assign directly to human agent ─────────────────
        if (!aiEnabled) {
          logger.info(`[handleMessage] AI disabled for widget ${widgetKey} — routing ${conversationId} directly to human agent`);

          // Import conversation service for agent assignment
          const { ConversationService } = await import("../../modules/conversation/conversation.service");
          const convService = new ConversationService();
          const orgId = conversation.organizationId!.toString();
          const { teamId: assignedTeamId, agentId: assignedAgentId } = await convService.autoAssignConversation(orgId);

          if (assignedTeamId || assignedAgentId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: {
                assignedTo: assignedAgentId || undefined,
                "metadata.teamId": assignedTeamId,
                "metadata.routedAt": new Date(),
                "metadata.routeReason": "AI disabled — direct to agent",
                "metadata.escalatedAt": new Date(), // prevents future AI enqueue
              },
              ...(assignedAgentId ? { $addToSet: { participants: assignedAgentId } } : {}),
            });
          }

          // Notify agents about the new conversation
          const sm = getSocketManager();
          if (sm) {
            const payload = {
              conversationId,
              subject: conversation.subject,
              message: content,
              timestamp: new Date(),
              assignedTo: assignedAgentId,
              teamId: assignedTeamId,
              routeReason: "AI disabled — direct to agent",
            };

            try {
              if (typeof sm.emitToAllUsers === "function") {
                sm.emitToAllUsers("new_widget_conversation", payload);
              } else if (sm.ioInstance) {
                sm.ioInstance.emit("new_widget_conversation", payload);
              }
            } catch (emitErr: any) {
              logger.error(`[handleMessage] Failed to emit new_widget_conversation: ${emitErr?.message}`);
            }
          }

          return; // Don't enqueue AI job
        }

        // ── Route: AI enabled → enqueue AI job with full config ─────────────────
        aiQueue
          .add("process", {
            organizationId: conversation.organizationId!.toString(),
            conversationId,
            content,
            messageId: message._id.toString(),
            companyName,
            teamId,
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
        socket.data?.user?.role === "agent" ||
        socket.data?.user?.role === "admin" ||
        socket.data?.user?.role === "owner"
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
      socket.data?.user?.role === "agent" ||
      socket.data?.user?.role === "admin" ||
      socket.data?.user?.role === "owner"
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
      socket.data?.user?.role === "agent" ||
      socket.data?.user?.role === "admin" ||
      socket.data?.user?.role === "owner"
    ) {
      socket.to(roomName).emit("agent_stopped_typing", { conversationId });
    } else {
      socket.to(roomName).emit("customer_stopped_typing", { conversationId });
    }
  });
};

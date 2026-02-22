import { Message, Conversation, Widget } from "@shared/models";
import logger from "@shared/utils/logger";
import { aiQueue } from "@shared/config/queue";

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
        // Fetch conversation to get visitor info
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          logger.error(`Conversation ${conversationId} not found`);
          return;
        }

        // Determine sender metadata
        let messageMetadata = metadata || { source: "widget" };
        
        // If source is widget and no metadata provided, use conversation visitor info
        if (metadata?.source === "widget") {
          messageMetadata = {
            senderName: metadata?.senderName || conversation.visitor?.name || "Anonymous User",
            senderEmail: metadata?.senderEmail || conversation.visitor?.email || "anonymous@temp.local",
            source: "widget",
          };
        }

        const message = new Message({
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

        // If this is from a widget user, enqueue for AI processing and notify agents
        if (messageMetadata.source === "widget") {
          // Once the conversation has been escalated to a human agent, stop feeding
          // new messages into the AI pipeline — the agent handles it from here on.
          if ((conversation as any).status === "escalated") {
            return; // message was saved & broadcast above; just don't run AI
          }

          // Add to BullMQ queue — the AI service will process and respond via Redis Stream
          // Pass teamId so the AI worker can scope RAG search to this team's knowledge base
          const teamId: string | undefined = (conversation.metadata as any)?.teamId ?? undefined;
          const widgetKey: string | undefined = (conversation.metadata as any)?.widgetKey ?? undefined;

          // Resolve company name from the Widget record so the AI prompt is personalised
          let companyName: string | undefined;
          if (widgetKey) {
            try {
              const widget = await Widget.findById(widgetKey).select('displayName').lean();
              companyName = (widget as any)?.displayName || undefined;
            } catch {
              // Non-fatal — fall back to generic prompt
            }
          }

          aiQueue
            .add("process", {
              conversationId,
              content,
              messageId: message._id.toString(),
              teamId,
              companyName,
            })
            .catch((err) =>
              logger.error("Failed to enqueue AI job:", err),
            );
          // Note: no broadcast to agents while AI is handling the conversation.
          // Agents only see the conversation after it is escalated to them.
        }
      } catch (error) {
        logger.error("Error handling send_message:", error);
      }
    },
  );

  // Handler for joining conversation rooms
  socket.on("join_conversation", async (conversationId: string) => {
    try {
      const roomName = `conversation:${conversationId}`;

      // Join the socket to the conversation room
      socket.join(roomName);

      // If the joiner is an agent (has user data), update the conversation
      if (
        socket.data?.user?.role === "agent" ||
        socket.data?.user?.role === "admin"
      ) {
        // Update conversation with agent assignment
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            assignedTo: socket.data.user.userId,
            status: "active",
          },
        });

        // Notify everyone in the conversation that an agent joined
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

    // Determine if it's an agent or customer typing
    if (
      socket.data?.user?.role === "agent" ||
      socket.data?.user?.role === "admin"
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
      socket.data?.user?.role === "admin"
    ) {
      socket.to(roomName).emit("agent_stopped_typing", { conversationId });
    } else {
      socket.to(roomName).emit("customer_stopped_typing", { conversationId });
    }
  });
};

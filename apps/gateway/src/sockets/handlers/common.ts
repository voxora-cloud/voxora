import logger from "@shared/core/logger";

export function registerRoomHandlers(socket: any) {
  // Join conversation room
  socket.on("join_conversation", async (conversationId: string) => {
    try {
      const orgId = socket.data?.user?.orgId;
      if (!orgId) return;

      const gateState = socket.data.gateState;
      if (!gateState) {
        logger.warn(
          `Unauthorized join_conversation attempt - no gate state for conversation ${conversationId}`,
        );
        return;
      }

      socket.join(`conversation:${conversationId}`);
      socket.join(`org:${orgId}:conv:${conversationId}`);
      logger.info(
        `${
          socket.data.user.isWidget
            ? `Widget user ${socket.id}`
            : `Agent ${socket.data.user.name} (${socket.data.user.userId})`
        } joined conversation room ${conversationId}`,
      );
    } catch (error) {
      logger.error("Error in join_conversation:", error);
    }
  });

  // Leave conversation room
  socket.on("leave_conversation", (conversationId: string) => {
    const orgId = socket.data?.user?.orgId;
    socket.leave(`conversation:${conversationId}`);
    if (orgId) {
      socket.leave(`org:${orgId}:conv:${conversationId}`);
    }
    logger.info(
      `${
        socket.data.user.isWidget
          ? "Widget user left"
          : `Agent ${socket.data.user.name} left`
      } conversation ${conversationId}`,
    );
  });

  // Typing indicators
  socket.on("typing_start", (data: { conversationId: string }) => {
    const isWidget = socket.data?.user?.isWidget;
    if (isWidget) {
      socket.to(`conversation:${data.conversationId}`).emit("customer_typing", {
        conversationId: data.conversationId,
      });
    } else {
      socket.to(`conversation:${data.conversationId}`).emit("agent_typing", {
        conversationId: data.conversationId,
        agentName: socket.data.user.name,
      });
    }
  });

  socket.on("typing_stop", (data: { conversationId: string }) => {
    const isWidget = socket.data?.user?.isWidget;
    if (isWidget) {
      socket.to(`conversation:${data.conversationId}`).emit("customer_stopped_typing", {
        conversationId: data.conversationId,
      });
    } else {
      socket.to(`conversation:${data.conversationId}`).emit("agent_stopped_typing", {
        conversationId: data.conversationId,
      });
    }
  });
}

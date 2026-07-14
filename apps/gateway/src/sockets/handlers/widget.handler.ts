import { Message, Conversation, Widget } from "@shared/models";
import logger from "@shared/core/logger";
import { aiQueue } from "@shared/infra/queue";
import { redisClient } from "@shared/infra/redis";

export const handleWidgetMessage = ({ socket, io }: { socket: any; io: any }) => {
  socket.on(
    "send_message",
    async (data: {
      conversationId: string;
      content: string;
      type: string;
      metadata?: {
        interactionSource?: string;
      };
    }) => {
      const { conversationId, content, type, metadata } = data;

      try {
        const gateState = socket.data.gateState;
        if (!gateState) {
          logger.error(`Conversation gate state missing for message on conversation ${conversationId}`);
          return;
        }

        const orgId = socket.data.user.orgId;

        const message = new Message({
          organizationId: orgId,
          conversationId,
          senderId: socket.id,
          content,
          type,
          metadata: {
            source: "widget",
            interactionSource: metadata?.interactionSource || gateState.interactionSource || "widget",
          },
        });
        await message.save();

        // Update conversation's last activity
        await Conversation.updateOne(
          { _id: conversationId },
          { $currentDate: { updatedAt: true } },
        );

        // Emit message to other members of the conversation
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

        // Enqueue to AI queue if not escalated/assigned
        if (
          !gateState.assignedTo &&
          !gateState.escalatedAt &&
          !gateState.humanJoinedAt &&
          !["resolved", "closed"].includes(gateState.status)
        ) {
          const widgetKey = socket.data.user.widgetKey;
          let companyName: string | undefined;
          let aiEnabled = true;
          let fallbackToAgent = true;
          let collectUserInfo: Record<string, boolean> = {};

          if (widgetKey) {
            try {
              const cacheKey = `widget:${widgetKey}:config`;
              const cached = await redisClient.get(cacheKey);

              let widgetConfig: any = null;
              if (cached) {
                widgetConfig = JSON.parse(cached);
              } else {
                const widget = await Widget.findById(widgetKey)
                  .select("displayName ai conversation features")
                  .lean();

                if (widget) {
                  widgetConfig = {
                    displayName: (widget as any).displayName,
                    ai: (widget as any).ai,
                    conversation: (widget as any).conversation,
                  };
                  await redisClient.set(cacheKey, JSON.stringify(widgetConfig), { EX: 3600 });
                }
              }

              if (widgetConfig) {
                companyName = widgetConfig.displayName || undefined;
                aiEnabled = widgetConfig.ai?.enabled !== false;
                fallbackToAgent = widgetConfig.ai?.fallbackToAgent !== false;
                collectUserInfo = widgetConfig.conversation?.collectUserInfo || {};
              }
            } catch (err: any) {
              logger.warn(`[handleWidgetMessage] Could not fetch cached widget config for key ${widgetKey}: ${err.message}`);
            }
          }

          const subscriptionExpired = socket.data.user.subscriptionExpired === true;

          await aiQueue.add("process", {
            organizationId: orgId.toString(),
            conversationId,
            content,
            messageId: message._id.toString(),
            companyName,
            fallbackToAgent,
            collectUserInfo,
            channel: "widget",
            aiEnabled,
            subscriptionExpired,
          });
        }
      } catch (error: any) {
        logger.error(`Error in widget send_message: ${error.message}`);
      }
    }
  );




};

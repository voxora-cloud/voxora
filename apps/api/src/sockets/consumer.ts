import { redisClient } from "@shared/config/redis";
import { Conversation, Message, Team, User } from "@shared/models";
import logger from "@shared/utils/logger";
import type SocketManager from "@sockets/index";

const PUBSUB_CHANNEL = "ai:response";
const ESCALATION_CHANNEL = "ai:escalation";
const RESOLUTION_CHANNEL = "ai:resolution";

// ── Agent-finder helper ────────────────────────────────────────────────────────
/**
 * Find the best AVAILABLE agent to assign an escalated conversation to.
 *
 * Priority order (only online/away agents qualify — offline agents are skipped):
 *  1. Online agents in the requested team
 *  2. Away   agents in the requested team
 *  3. Online agents in any other active team
 *  4. Away   agents in any other active team
 *
 * Returns null if no online or away agents exist anywhere in the system.
 */
async function findBestAgent(preferredTeamId: string | null): Promise<{
  agentId: string;
  agentName: string;
  agentEmail: string;
  teamId: string;
} | null> {
  const baseFilter = {
    role: "agent",
    isActive: true,
  };

  // Helper: pick the least-busy agent from a candidate set
  async function pickLeastBusy(candidates: any[]): Promise<any | null> {
    if (candidates.length === 0) return null;
    const withLoad = await Promise.all(
      candidates.map(async (a) => {
        const load = await (Conversation as any).countDocuments({
          assignedTo: a._id,
          status: { $in: ["active", "open"] },
        });
        return { agent: a, load };
      }),
    );
    withLoad.sort((x, y) => x.load - y.load);
    return withLoad[0].agent;
  }

  // Resolve preferred team ObjectId
  const preferredTeam = preferredTeamId
    ? await (Team as any).findById(preferredTeamId).lean()
    : null;

  if (preferredTeam) {
    // 1. Online in preferred team
    let candidates = await (User as any)
      .find({ ...baseFilter, teams: preferredTeam._id, status: "online" })
      .lean();
    let pick = await pickLeastBusy(candidates);
    if (pick) return { agentId: pick._id.toString(), agentName: pick.name, agentEmail: pick.email, teamId: preferredTeamId! };

    // 2. Away in preferred team
    candidates = await (User as any)
      .find({ ...baseFilter, teams: preferredTeam._id, status: "away" })
      .lean();
    pick = await pickLeastBusy(candidates);
    if (pick) return { agentId: pick._id.toString(), agentName: pick.name, agentEmail: pick.email, teamId: preferredTeamId! };
  }

  // 3. Online in any active team
  const allActiveTeams = await (Team as any).find({ isActive: true }).lean();
  const allTeamIds = allActiveTeams.map((t: any) => t._id);
  let candidates = await (User as any)
    .find({ ...baseFilter, teams: { $in: allTeamIds }, status: "online" })
    .lean();
  let pick = await pickLeastBusy(candidates);
  if (pick) {
    const agentTeamId = pick.teams?.find((tid: any) =>
      allTeamIds.some((id: any) => id.toString() === tid.toString()),
    );
    return {
      agentId: pick._id.toString(),
      agentName: pick.name,
      agentEmail: pick.email,
      teamId: agentTeamId?.toString() ?? (preferredTeamId || allTeamIds[0]?.toString()),
    };
  }

  // 4. Away in any active team
  candidates = await (User as any)
    .find({ ...baseFilter, teams: { $in: allTeamIds }, status: "away" })
    .lean();
  pick = await pickLeastBusy(candidates);
  if (pick) {
    const agentTeamId = pick.teams?.find((tid: any) =>
      allTeamIds.some((id: any) => id.toString() === tid.toString()),
    );
    return {
      agentId: pick._id.toString(),
      agentName: pick.name,
      agentEmail: pick.email,
      teamId: agentTeamId?.toString() ?? (preferredTeamId || allTeamIds[0]?.toString()),
    };
  }

  return null; // No online or away agents available
}

// ── Consumer startup ───────────────────────────────────────────────────────────

export async function startAIResponseConsumer(
  socketManager: SocketManager,
): Promise<void> {
  // Dedicated subscriber — a subscribed node-redis client cannot run other commands
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  // ── AI response channel ────────────────────────────────────────────────────
  await subscriber.subscribe(PUBSUB_CHANNEL, async (message) => {
    try {
      const { conversationId, content, nonce } = JSON.parse(message) as {
        conversationId: string;
        content: string;
        nonce?: string;
      };

      // Dedup guard — only one API instance processes each published message
      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      const msg = new Message({
        conversationId,
        senderId: "ai-bot",
        content,
        type: "text",
        metadata: {
          senderName: "AI Assistant",
          senderEmail: "ai@voxora.internal",
          source: "ai",
        },
      });

      await msg.save();

      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
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

  // ── AI escalation channel ──────────────────────────────────────────────────
  await subscriber.subscribe(ESCALATION_CHANNEL, async (raw) => {
    try {
      const { conversationId, teamId, reason, nonce } = JSON.parse(raw) as {
        conversationId: string;
        teamId: string | null;
        reason: string;
        nonce?: string;
      };

      // Dedup guard
      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      logger.info(`[Escalation] Received for conversation ${conversationId} — reason: "${reason}"`);

      // 1. Find best available (online/away) agent
      const assignment = await findBestAgent(teamId);

      // If no agent is online or away, keep the AI handling the conversation
      if (!assignment) {
        logger.warn(`[Escalation] No available agents for conversation ${conversationId} — AI continues`);
        const fallbackMsg = new Message({
          conversationId,
          senderId: "ai-bot",
          content: "Our support team is currently offline. I'll do my best to help you — please continue and I'll assist you directly.",
          type: "text",
          metadata: { senderName: "AI Assistant", senderEmail: "ai@voxora.internal", source: "ai" },
        });
        await fallbackMsg.save();
        socketManager.emitToConversation(conversationId, "new_message", {
          conversationId,
          message: {
            _id: fallbackMsg._id,
            senderId: fallbackMsg.senderId,
            content: fallbackMsg.content,
            type: fallbackMsg.type,
            metadata: fallbackMsg.metadata,
            createdAt: fallbackMsg.createdAt,
          },
        });
        return;
      }

      // 2. Update conversation — agent is available
      await (Conversation as any).findByIdAndUpdate(conversationId, {
        $set: {
          status: "open",
          assignedTo: assignment.agentId,
          "metadata.teamId": assignment.teamId,
          "metadata.escalatedAt": new Date(),
          "metadata.escalationReason": reason,
        },
      });

      // 3. Emit escalation event to the widget
      socketManager.emitToConversation(conversationId, "conversation_escalated", {
        conversationId,
        reason,
        agent: {
          id: assignment.agentId,
          name: assignment.agentName,
          email: assignment.agentEmail,
        },
      });

      // 4. Notify the assigned agent's dashboard
      await socketManager.emitToUser(assignment.agentId, "new_widget_conversation", {
        conversationId,
        reason,
        agent: {
          id: assignment.agentId,
          name: assignment.agentName,
          email: assignment.agentEmail,
        },
      });

      logger.info(
        `[Escalation] Conversation ${conversationId} escalated to agent ${assignment.agentId}`,
      );
    } catch (err) {
      logger.error("[Escalation] Failed to handle escalation:", err);
    }
  });

  // ── AI resolution channel ──────────────────────────────────────────────────
  await subscriber.subscribe(RESOLUTION_CHANNEL, async (raw) => {
    try {
      const { conversationId, reason, nonce } = JSON.parse(raw) as {
        conversationId: string;
        reason: string;
        nonce?: string;
      };

      // Dedup guard
      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      logger.info(`[Resolution] Received for conversation ${conversationId} — reason: "${reason}"`);

      // 1. Send a friendly closing message from the AI before resolving
      const closingMsg = new Message({
        conversationId,
        senderId: "ai-bot",
        content: "Glad I could help! 😊 I'm marking this conversation as resolved. If you ever need assistance again, feel free to start a new chat.",
        type: "text",
        metadata: {
          senderName: "AI Assistant",
          senderEmail: "ai@voxora.internal",
          source: "ai",
        },
      });
      await closingMsg.save();
      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
        message: {
          _id: closingMsg._id,
          senderId: closingMsg.senderId,
          content: closingMsg.content,
          type: closingMsg.type,
          metadata: closingMsg.metadata,
          createdAt: closingMsg.createdAt,
        },
      });

      // 2. Mark conversation as resolved
      await (Conversation as any).findByIdAndUpdate(conversationId, {
        $set: {
          status: "resolved",
          "metadata.resolvedAt": new Date(),
          "metadata.resolvedBy": "ai",
          "metadata.resolutionReason": reason,
        },
      });

      // 3. Notify the widget so it shows the resolved banner
      socketManager.emitToConversation(conversationId, "status_updated", {
        conversationId,
        status: "resolved",
        updatedBy: "ai",
        reason,
        timestamp: new Date(),
      });

      logger.info(`[Resolution] Conversation ${conversationId} resolved by AI`);
    } catch (err) {
      logger.error("[Resolution] Failed to handle resolution:", err);
    }
  });

  logger.info("AI response & escalation subscribers ready");
}

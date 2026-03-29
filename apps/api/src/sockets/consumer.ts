import { redisClient } from "@shared/config/redis";
import { Conversation, Message, Team, Membership } from "@shared/models";
import logger from "@shared/utils/logger";
import type SocketManager from "@sockets/index";

const PUBSUB_CHANNEL = "ai:response";
const ESCALATION_CHANNEL = "ai:escalation";
const RESOLUTION_CHANNEL = "ai:resolution";

// ── Agent-finder helper (org-scoped via Membership) ────────────────────────────

interface AgentAssignment {
  agentId: string;
  agentName: string;
  agentEmail: string;
  teamId: string;
}

async function findBestAgent(organizationId: string, preferredTeamId: string | null): Promise<AgentAssignment | null> {
  // Helper: pick the least-busy agent from a set of memberships
  async function pickLeastBusy(
    memberships: Array<{ userId: any; teams: any[] }>,
  ): Promise<{ userId: any; name: string; email: string; teamId: string } | null> {
    if (memberships.length === 0) return null;
    const withLoad = await Promise.all(
      memberships.map(async (m) => {
        const user = m.userId;
        const load = await Conversation.countDocuments({
          organizationId,
          assignedTo: user._id,
          status: { $in: ["active", "open"] },
        });
        return { user, load, teams: m.teams };
      }),
    );
    withLoad.sort((x, y) => x.load - y.load);
    const best = withLoad[0];
    const teamId = preferredTeamId || best.teams?.[0]?.toString() || "";
    return { userId: best.user._id, name: best.user.name, email: best.user.email, teamId };
  }

  const baseFilter = { organizationId, inviteStatus: "active" as const };

  // 1 & 2: preferred team first
  if (preferredTeamId) {
    for (const status of ["online", "away"]) {
      const candidates = await Membership.find({
        ...baseFilter,
        teams: preferredTeamId,
      })
        .populate("userId", "name email status isActive")
        .then((ms) => ms.filter((m) => (m.userId as any)?.status === status && (m.userId as any)?.isActive));

      const pick = await pickLeastBusy(candidates as any);
      if (pick) return { agentId: pick.userId.toString(), agentName: pick.name, agentEmail: pick.email, teamId: pick.teamId };
    }
  }

  // 3 & 4: any team in the org
  const allTeams = await Team.find({ organizationId, isActive: true }).select("_id");
  const allTeamIds = allTeams.map((t) => t._id);

  for (const status of ["online", "away"]) {
    const candidates = await Membership.find({
      ...baseFilter,
      teams: { $in: allTeamIds },
    })
      .populate("userId", "name email status isActive")
      .then((ms) => ms.filter((m) => (m.userId as any)?.status === status && (m.userId as any)?.isActive));

    const pick = await pickLeastBusy(candidates as any);
    if (pick) return { agentId: pick.userId.toString(), agentName: pick.name, agentEmail: pick.email, teamId: pick.teamId };
  }

  return null;
}

// ── Consumer startup ───────────────────────────────────────────────────────────

export async function startAIResponseConsumer(socketManager: SocketManager): Promise<void> {
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  // ── AI response channel ──────────────────────────────────────────────────────
  await subscriber.subscribe(PUBSUB_CHANNEL, async (message) => {
    try {
      const { conversationId, content, nonce } = JSON.parse(message) as {
        conversationId: string;
        content: string;
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      // Resolve org from conversation record
      const conv = await Conversation.findById(conversationId)
        .select("organizationId status metadata.escalatedAt metadata.humanJoinedAt")
        .lean();

      if (!conv) return;

      if (
        (conv as any).metadata?.escalatedAt
        || (conv as any).metadata?.humanJoinedAt
        || ["resolved", "closed"].includes((conv as any).status)
      ) {
        logger.info(`[AI Response] Skipping ${conversationId} because conversation is escalated or closed`);
        return;
      }

      const organizationId = conv?.organizationId?.toString() || "";

      const msg = new Message({
        conversationId,
        organizationId,
        senderId: "ai-bot",
        content,
        type: "text",
        metadata: { senderName: "AI Assistant", senderEmail: "ai@voxora.internal", source: "ai" },
      });
      await msg.save();

      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
        message: { _id: msg._id, senderId: msg.senderId, content: msg.content, type: msg.type, metadata: msg.metadata, createdAt: msg.createdAt },
      });

      logger.info(`AI response delivered to conversation ${conversationId}`);
    } catch (err) {
      logger.error("Failed to handle AI response:", err);
    }
  });

  // ── AI stream channel ──────────────────────────────────────────────────────
  await subscriber.subscribe("ai:stream", async (raw) => {
    try {
      const { conversationId, chunk, isThought } = JSON.parse(raw) as {
        conversationId: string;
        chunk: string;
        isThought: boolean;
      };

      // Emit chunk directly to active clients without DB persistence
      socketManager.emitToConversation(conversationId, "ai_stream_chunk", {
        conversationId,
        chunk,
        isThought,
      });
    } catch (err) {
      logger.error("Failed to handle AI stream chunk:", err);
    }
  });

  // ── AI escalation channel ────────────────────────────────────────────────────
  await subscriber.subscribe(ESCALATION_CHANNEL, async (raw) => {
    try {
      const { conversationId, teamId, reason, nonce } = JSON.parse(raw) as {
        conversationId: string;
        teamId: string | null;
        reason: string;
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      logger.info(`[Escalation] Received for conversation ${conversationId} — reason: "${reason}"`);

      const conv = await Conversation.findById(conversationId)
        .select("organizationId status metadata.escalatedAt metadata.humanJoinedAt")
        .lean();
      if (!conv) return;

      if (
        (conv as any).metadata?.escalatedAt
        || (conv as any).metadata?.humanJoinedAt
        || ["resolved", "closed"].includes((conv as any).status)
      ) {
        logger.info(`[Resolution] Skipping ${conversationId} because conversation is escalated or already closed`);
        return;
      }

      const organizationId = conv?.organizationId?.toString() || "";

      const assignment = await findBestAgent(organizationId, teamId);

      if (!assignment) {
        logger.warn(`[Escalation] No available agents for conversation ${conversationId} — AI continues`);
        const fallbackMsg = new Message({
          conversationId,
          organizationId,
          senderId: "ai-bot",
          content: "Our support team is currently offline. I'll do my best to help you — please continue and I'll assist you directly.",
          type: "text",
          metadata: { senderName: "AI Assistant", senderEmail: "ai@voxora.internal", source: "ai" },
        });
        await fallbackMsg.save();
        socketManager.emitToConversation(conversationId, "new_message", {
          conversationId,
          message: { _id: fallbackMsg._id, senderId: fallbackMsg.senderId, content: fallbackMsg.content, type: fallbackMsg.type, metadata: fallbackMsg.metadata, createdAt: fallbackMsg.createdAt },
        });

        // Mark conversation as pending + flag it for admin inbox "Unassigned" view
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            status: "pending",
            "metadata.pendingEscalation": true,
            "metadata.escalatedAt": new Date(),
            "metadata.escalationReason": reason,
          },
        });

        // Notify visitor that they are in the queue
        socketManager.emitToConversation(conversationId, "status_updated", {
          conversationId,
          status: "pending",
          updatedBy: "system",
          reason: "No agents available — in queue",
          timestamp: new Date(),
        });

        return;
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          status: "open",
          assignedTo: assignment.agentId,
          "metadata.teamId": assignment.teamId,
          "metadata.escalatedAt": new Date(),
          "metadata.escalationReason": reason,
        },
      });

      socketManager.emitToConversation(conversationId, "conversation_escalated", {
        conversationId,
        reason,
        agent: { id: assignment.agentId, name: assignment.agentName, email: assignment.agentEmail },
      });

      await socketManager.emitToUser(assignment.agentId, "new_widget_conversation", {
        conversationId,
        reason,
        agent: { id: assignment.agentId, name: assignment.agentName, email: assignment.agentEmail },
      });

      logger.info(`[Escalation] Conversation ${conversationId} escalated to agent ${assignment.agentId}`);
    } catch (err) {
      logger.error("[Escalation] Failed to handle escalation:", err);
    }
  });

  // ── AI resolution channel ────────────────────────────────────────────────────
  await subscriber.subscribe(RESOLUTION_CHANNEL, async (raw) => {
    try {
      const { conversationId, reason, nonce } = JSON.parse(raw) as {
        conversationId: string;
        reason: string;
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      logger.info(`[Resolution] Received for conversation ${conversationId} — reason: "${reason}"`);

      const conv = await Conversation.findById(conversationId).select("organizationId").lean();
      const organizationId = conv?.organizationId?.toString() || "";

      const closingMsg = new Message({
        conversationId,
        organizationId,
        senderId: "ai-bot",
        content: "Glad I could help! 😊 I'm marking this conversation as resolved. If you ever need assistance again, feel free to start a new chat.",
        type: "text",
        metadata: { senderName: "AI Assistant", senderEmail: "ai@voxora.internal", source: "ai" },
      });
      await closingMsg.save();

      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
        message: { _id: closingMsg._id, senderId: closingMsg.senderId, content: closingMsg.content, type: closingMsg.type, metadata: closingMsg.metadata, createdAt: closingMsg.createdAt },
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          status: "resolved",
          "metadata.resolvedAt": new Date(),
          "metadata.resolvedBy": "ai",
          "metadata.resolutionReason": reason,
        },
      });

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

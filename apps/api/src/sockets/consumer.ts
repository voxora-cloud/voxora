import { redisClient } from "@shared/config/redis";
import { Conversation, Message, Team, User } from "@shared/models";
import logger from "@shared/utils/logger";
import type SocketManager from "@sockets/index";

const PUBSUB_CHANNEL = "ai:response";
const ESCALATION_CHANNEL = "ai:escalation";

// ── Agent-finder helper ────────────────────────────────────────────────────────
/**
 * Find the best available agent to assign an escalated conversation to.
 *
 * Priority order:
 *  1. Online agents in the requested team
 *  2. Away   agents in the requested team
 *  3. Online agents in any other active team
 *  4. Away   agents in any other active team
 *  5. Any agent in the requested team (regardless of status)
 *  6. Any agent at all (last resort)
 *
 * Returns null only if there are literally no agents in the system.
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
          status: { $in: ["active", "escalated"] },
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

  // 5. Any agent in preferred team (offline fallback)
  if (preferredTeam) {
    candidates = await (User as any)
      .find({ ...baseFilter, teams: preferredTeam._id })
      .lean();
    pick = await pickLeastBusy(candidates);
    if (pick) return { agentId: pick._id.toString(), agentName: pick.name, agentEmail: pick.email, teamId: preferredTeamId! };
  }

  // 6. Any agent at all
  candidates = await (User as any).find(baseFilter).lean();
  pick = await pickLeastBusy(candidates);
  if (pick) {
    return {
      agentId: pick._id.toString(),
      agentName: pick.name,
      agentEmail: pick.email,
      teamId: preferredTeamId ?? allTeamIds[0]?.toString() ?? "",
    };
  }

  return null; // No agents at all in the system
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
      const { conversationId, content } = JSON.parse(message) as {
        conversationId: string;
        content: string;
      };

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
      const { conversationId, teamId, reason } = JSON.parse(raw) as {
        conversationId: string;
        teamId: string | null;
        reason: string;
      };

      logger.info(`[Escalation] Received for conversation ${conversationId} — reason: "${reason}"`);

      // 1. Find best available agent
      const assignment = await findBestAgent(teamId);

      // 2. Update conversation
      const updateFields: Record<string, any> = {
        status: "escalated",
        "metadata.escalatedAt": new Date(),
        "metadata.escalationReason": reason,
      };
      if (assignment) {
        updateFields.assignedTo = assignment.agentId;
        updateFields["metadata.teamId"] = assignment.teamId;
      }
      await (Conversation as any).findByIdAndUpdate(conversationId, {
        $set: updateFields,
      });

      // 3. Emit escalation event to the widget (single notification — no separate system message)
      socketManager.emitToConversation(conversationId, "conversation_escalated", {
        conversationId,
        reason,
        agent: assignment
          ? {
              id: assignment.agentId,
              name: assignment.agentName,
              email: assignment.agentEmail,
            }
          : null,
      });

      // 4. Notify ONLY the assigned agent's dashboard so they see the conversation
      if (assignment?.agentId) {
        socketManager.emitToUser(assignment.agentId, "new_widget_conversation", {
          conversationId,
          reason,
          agent: {
            id: assignment.agentId,
            name: assignment.agentName,
            email: assignment.agentEmail,
          },
        });
      }

      logger.info(
        `[Escalation] Conversation ${conversationId} escalated to agent ${assignment?.agentId ?? "unassigned"}`,
      );
    } catch (err) {
      logger.error("[Escalation] Failed to handle escalation:", err);
    }
  });

  logger.info("AI response & escalation subscribers ready");
}

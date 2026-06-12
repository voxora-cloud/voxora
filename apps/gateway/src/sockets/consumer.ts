import { redisClient } from "@shared/infra/redis";
import { Conversation, Message, Membership } from "@shared/models";
import { incrementMessageUsage } from "@shared/security/middleware";
import { tracker } from "@shared/utils/tracker";
import logger from "@shared/core/logger";
import type SocketManager from "@sockets/index";

const PUBSUB_CHANNEL = "ai:response";
const ESCALATION_CHANNEL = "ai:escalation";

// ── Agent-finder helper (org-scoped via Membership) ────────────────────────────

interface AgentAssignment {
  agentId: string;
  agentName: string;
  agentEmail: string;
}

async function findBestAgent(organizationId: string): Promise<AgentAssignment | null> {
  async function pickLeastBusy(
    memberships: Array<{ userId: any }>,
  ): Promise<{ userId: any; name: string; email: string } | null> {
    if (memberships.length === 0) return null;
    const withLoad = await Promise.all(
      memberships.map(async (m) => {
        const user = m.userId;
        const load = await Conversation.countDocuments({
          organizationId,
          assignedTo: user._id,
          status: { $in: ["active", "open"] },
        });
        return { user, load };
      }),
    );
    withLoad.sort((x, y) => x.load - y.load);
    const best = withLoad[0];
    return { userId: best.user._id, name: best.user.name, email: best.user.email };
  }

  const onlineStatuses = ["online", "away"];
  const baseFilter = { organizationId, inviteStatus: "active" as const };

  // ── Step 1: Check if any agents (role=agent) are online ──────────────────────
  const agentCandidates = await Membership.find({ ...baseFilter, role: "agent" })
    .populate("userId", "name email status isActive")
    .then((ms) => ms.filter((m) => (m.userId as any)?.isActive && onlineStatuses.includes((m.userId as any)?.status)));

  if (agentCandidates.length > 0) {
    const pick = await pickLeastBusy(agentCandidates as any);
    if (pick) return { agentId: pick.userId.toString(), agentName: pick.name, agentEmail: pick.email };
  }

  // ── Step 2: No agents online — check admins ──────────────────────────────────
  const adminCandidates = await Membership.find({ ...baseFilter, role: "admin" })
    .populate("userId", "name email status isActive")
    .then((ms) => ms.filter((m) => (m.userId as any)?.isActive && onlineStatuses.includes((m.userId as any)?.status)));

  if (adminCandidates.length > 0) {
    const pick = await pickLeastBusy(adminCandidates as any);
    if (pick) return { agentId: pick.userId.toString(), agentName: pick.name, agentEmail: pick.email };
  }

  // ── Step 3: No admins online — check owners ──────────────────────────────────
  const ownerCandidates = await Membership.find({ ...baseFilter, role: "owner" })
    .populate("userId", "name email status isActive")
    .then((ms) => ms.filter((m) => (m.userId as any)?.isActive && onlineStatuses.includes((m.userId as any)?.status)));

  if (ownerCandidates.length > 0) {
    const pick = await pickLeastBusy(ownerCandidates as any);
    if (pick) return { agentId: pick.userId.toString(), agentName: pick.name, agentEmail: pick.email };
  }

  // ── No one online — do not escalate ─────────────────────────────────────────
  return null;
}

// ── Consumer startup ───────────────────────────────────────────────────────────

export async function startAIResponseConsumer(socketManager: SocketManager): Promise<void> {
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  // ── AI response channel ──────────────────────────────────────────────────────
  await subscriber.subscribe(PUBSUB_CHANNEL, async (message) => {
    try {
      const { conversationId, content, usage, nonce } = JSON.parse(message) as {
        conversationId: string;
        content: string;
        usage?: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
          estimatedCostUsd?: number;
        };
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      // Resolve org from conversation record
      const conv = await Conversation.findById(conversationId)
        .select("organizationId status metadata assignedTo")
        .lean();

      if (!conv) return;

      if (
        (conv as any).metadata?.escalatedAt
        || (conv as any).metadata?.humanJoinedAt
        || (conv as any).assignedTo
        || ["active", "resolved", "closed"].includes((conv as any).status)
      ) {
        logger.info(`[AI Response] Skipping ${conversationId} because conversation is escalated or closed`);
        return;
      }

      const organizationId = conv?.organizationId?.toString() || "";

      // // ── Message usage tracking ──────────────────────────────────────────────
      // const usageResult = await incrementMessageUsage(organizationId);
      // if (usageResult.blocked) {
      //   logger.warn(`[AI Response] Message limit reached for org=${organizationId} (used=${usageResult.used} limit=${usageResult.limit}) — dropping AI response`);
      //   socketManager.emitToConversation(conversationId, "limit_reached", {
      //     limitType: "messages",
      //     currentUsage: usageResult.used,
      //     limit: usageResult.limit,
      //     upgradeRequired: true,
      //   });
      //   return;
      // }

      const msg = new Message({
        conversationId,
        organizationId,
        senderId: "ai-bot",
        content,
        type: "text",
        metadata: { senderName: "AI Assistant", senderEmail: "ai@interaone.internal", source: "ai" },
      });
      await msg.save();
      tracker.trackMessage(
        organizationId,
        "ai",
        { messageLength: content.length },
        { conversationId, channel: "widget" },
      );

      tracker.trackEvent(
        organizationId,
        "ai_response",
        "ai",
        { messageLength: content.length },
        { conversationId, channel: "widget" },
      );

      const hasTokenUsage = Boolean(
        usage && (
          (usage.totalTokens && usage.totalTokens > 0)
          || (usage.promptTokens && usage.promptTokens > 0)
          || (usage.completionTokens && usage.completionTokens > 0)
        ),
      );

      if (hasTokenUsage) {
        tracker.trackEvent(
          organizationId,
          "ai_token_usage",
          "ai",
          {
            promptTokens: usage?.promptTokens || 0,
            completionTokens: usage?.completionTokens || 0,
            totalTokens: usage?.totalTokens || 0,
            estimatedCostUsd: usage?.estimatedCostUsd || 0,
          },
          { conversationId, channel: "widget" },
        );
      }

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

      // Do not forward stream chunks once a human has taken over
      const conv = await Conversation.findById(conversationId)
        .select("status metadata assignedTo")
        .lean();
      if (
        (conv as any)?.metadata?.escalatedAt ||
        (conv as any)?.metadata?.humanJoinedAt ||
        (conv as any)?.assignedTo ||
        ["active", "resolved", "closed"].includes((conv as any)?.status)
      ) {
        return;
      }

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
      const { conversationId, reason, nonce } = JSON.parse(raw) as {
        conversationId: string;
        reason: string;
        nonce?: string;
      };

      if (nonce) {
        const claimed = await redisClient.set(`dedup:${nonce}`, "1", { NX: true, EX: 30 });
        if (!claimed) return;
      }

      const conv = await Conversation.findById(conversationId)
        .select("organizationId status metadata assignedTo")
        .lean();
      if (!conv) return;

      tracker.trackFallback(
        conv.organizationId.toString(),
        { reason },
        { conversationId, channel: "widget" },
      );

      if (
        (conv as any).metadata?.escalatedAt
        || (conv as any).metadata?.humanJoinedAt
        || (conv as any).assignedTo
        || ["active", "resolved", "closed"].includes((conv as any).status)
      ) {
        logger.info(`[Resolution] Skipping ${conversationId} because conversation is escalated or already closed`);
        return;
      }

      const organizationId = conv?.organizationId?.toString() || "";

      const assignment = await findBestAgent(organizationId);

      if (!assignment) {
        logger.warn(`[Escalation] No available agents for conversation ${conversationId} — AI continues`);
        const fallbackMsg = new Message({
          conversationId,
          organizationId,
          senderId: "ai-bot",
          content: "Our support team is currently offline. I'll do my best to help you — please continue and I'll assist you directly.",
          type: "text",
          metadata: { senderName: "AI Assistant", senderEmail: "ai@interaone.internal", source: "ai" },
        });
        await fallbackMsg.save();
        socketManager.emitToConversation(conversationId, "new_message", {
          conversationId,
          message: { _id: fallbackMsg._id, senderId: fallbackMsg.senderId, content: fallbackMsg.content, type: fallbackMsg.type, metadata: fallbackMsg.metadata, createdAt: fallbackMsg.createdAt },
        });

        // If no one is available to escalate to, do NOT update the conversation status.
        // It stays 'open' and unassigned, so the AI will continue replying.
        // We do not emit status_updated either, so the widget UI doesn't think it's in a queue.

        return;
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          status: "open",
          assignedTo: assignment.agentId,
          "metadata.escalatedAt": new Date(),
          "metadata.escalationReason": reason,
        },
      });

      tracker.trackEvent(
        organizationId,
        "agent_assigned",
        "system",
        { reason: "ai_fallback" },
        { conversationId, agentId: assignment.agentId, channel: "widget" },
      );

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

  logger.info("AI response & escalation subscribers ready");
}

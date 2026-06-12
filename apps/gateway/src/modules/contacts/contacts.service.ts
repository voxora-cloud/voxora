import { Types } from "mongoose";
import { Contact, Conversation } from "@shared/models";

interface ListContactsOptions {
  search?: string;
  limit?: number;
}

interface UpsertFromAIInput {
  organizationId: string;
  conversationId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  note?: string;
  status?: "active" | "inactive" | "blocked";
  sentiment?: "positive" | "neutral" | "negative";
  summary?: string;
  topics?: string[];
  timelineLabel?: string;
  timelineDetail?: string;
}

export class ContactsService {
  async listContacts(organizationId: string, options: ListContactsOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 100, 1), 300);
    const query: Record<string, unknown> = { organizationId };

    if (options.search?.trim()) {
      const term = options.search.trim();
      const regex = new RegExp(term, "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { company: regex }];
    }

    const contacts = await Contact.find(query).sort({ lastActivityAt: -1 }).limit(limit).lean();

    const sessionIds = contacts.map((c) => c.sessionId).filter(Boolean);
    const convStats = await Conversation.aggregate<{
      _id: string;
      count: number;
      lastActivityAt: Date;
    }>([
      {
        $match: {
          organizationId: new Types.ObjectId(organizationId),
          "visitor.sessionId": { $in: sessionIds },
        },
      },
      {
        $group: {
          _id: "$visitor.sessionId",
          count: { $sum: 1 },
          lastActivityAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const statsMap = new Map(convStats.map((row) => [row._id, row]));

    return contacts.map((contact) => {
      const stats = statsMap.get(contact.sessionId);
      return {
        id: contact._id.toString(),
        sessionId: contact.sessionId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        tags: contact.tags || [],
        status: contact.status,
        source: contact.source,
        notes: (contact.notes || []).map((note: any) => ({
          id: note.id,
          author: note.author,
          content: note.content,
          createdAt: new Date(note.createdAt).toISOString(),
        })),
        conversations: (contact.conversations || []).map((conversation: any) => ({
          id: conversation.id,
          status: conversation.status,
          lastMessage: conversation.lastMessage,
          updatedAt: new Date(conversation.updatedAt).toISOString(),
        })),
        timeline: (contact.timeline || []).map((event: any) => ({
          id: event.id,
          label: event.label,
          timestamp: new Date(event.timestamp).toISOString(),
          detail: event.detail,
        })),
        insights: {
          summary: contact.insights?.summary || "No insights yet.",
          sentiment: contact.insights?.sentiment || "neutral",
          topics: contact.insights?.topics || [],
        },
        conversationCount: stats?.count || 0,
        lastActivity: (stats?.lastActivityAt || contact.lastActivityAt || contact.updatedAt).toISOString(),
        createdAt: (contact.createdAt || contact.updatedAt).toISOString(),
        updatedAt: (contact.updatedAt || contact.createdAt).toISOString(),
      };
    });
  }

  async upsertFromAI(input: UpsertFromAIInput) {
    const { organizationId, conversationId } = input;

    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversationId");
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      organizationId,
    });

    if (!conversation) {
      throw new Error("Conversation not found for organization");
    }

    const sessionId = conversation.visitor?.sessionId || `conv:${conversationId}`;
    const existingName = conversation.visitor?.name;
    const existingEmail = conversation.visitor?.email;

    const resolvedName = (input.name || existingName || "Anonymous User").trim();
    const resolvedEmail = (input.email || existingEmail || "").trim().toLowerCase();
    const resolvedPhone = (input.phone || "").trim();
    const normalizedTags = (input.tags || [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const normalizedTopics = (input.topics || [])
      .map((topic) => String(topic || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const sentiment =
      input.sentiment && ["positive", "neutral", "negative"].includes(input.sentiment)
        ? input.sentiment
        : undefined;
    const timelineLabel = (input.timelineLabel || "").trim();
    const timelineDetail = (input.timelineDetail || "").trim();
    const note = (input.note || "").trim();
    const company = (input.company || "").trim();

    const visitorUpdate: Record<string, unknown> = {
      "visitor.name": resolvedName,
      "visitor.isAnonymous": !resolvedName || !resolvedEmail,
      "visitor.providedInfoAt": new Date(),
      "metadata.contactCapturedByAIAt": new Date(),
      "metadata.contactCapturedByAI": true,
    };

    if (resolvedEmail) {
      visitorUpdate["visitor.email"] = resolvedEmail;
      visitorUpdate["metadata.senderEmail"] = resolvedEmail;
    }
    visitorUpdate["metadata.senderName"] = resolvedName;
    if (resolvedPhone) {
      visitorUpdate["metadata.visitorPhone"] = resolvedPhone;
    }

    await Conversation.updateOne({ _id: conversationId }, { $set: visitorUpdate });

    const contact = await Contact.findOneAndUpdate(
      { organizationId, sessionId },
      {
        $set: {
          organizationId,
          sessionId,
          conversationId,
          name: resolvedName,
          ...(resolvedEmail ? { email: resolvedEmail } : {}),
          ...(resolvedPhone ? { phone: resolvedPhone } : {}),
          ...(company ? { company } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(sentiment || input.summary || normalizedTopics.length > 0
            ? {
                insights: {
                  summary: input.summary || "No insights yet.",
                  sentiment: sentiment || "neutral",
                  topics: normalizedTopics,
                },
              }
            : {}),
          source: "ai",
          lastActivityAt: new Date(),
          metadata: {
            updatedBy: "ai_tool",
            conversationId,
          },
        },
        ...(normalizedTags.length > 0
          ? {
              $addToSet: {
                tags: { $each: normalizedTags },
              },
            }
          : {}),
        ...(note
          ? {
              $push: {
                notes: {
                  id: `note-${Date.now()}`,
                  author: "AI Assistant",
                  content: note,
                  createdAt: new Date(),
                },
              },
            }
          : {}),
        ...(timelineLabel
          ? {
              $push: {
                timeline: {
                  id: `timeline-${Date.now()}`,
                  label: timelineLabel,
                  timestamp: new Date(),
                  ...(timelineDetail ? { detail: timelineDetail } : {}),
                },
              },
            }
          : {}),
        $setOnInsert: {
          tags: [],
          notes: [],
          conversations: [],
          timeline: [],
          insights: {
            summary: "No insights yet.",
            sentiment: "neutral",
            topics: [],
          },
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();

    return {
      id: contact?._id?.toString(),
      sessionId,
      name: contact?.name,
      email: contact?.email,
      phone: contact?.phone,
      conversationId,
    };
  }
}

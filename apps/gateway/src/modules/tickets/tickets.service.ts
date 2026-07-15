import { Types } from "mongoose";
import { Ticket, ITicket, Conversation, Contact } from "@shared/models";
import { enqueueTicketLifecycleEmail } from "@shared/queues/email.queue";
import logger from "@shared/core/logger";
import type { TicketEmailEvent } from "@shared/utils/email";
import { socketService } from "@sockets/services/socket.service";
import {
  CreateTicketInput,
  UpdateTicketInput,
  CloseTicketInput,
  ListTicketsOptions,
} from "./tickets.types";

export class TicketsService {
  // ─── Create ────────────────────────────────────────────────────────────────

  async createTicket(input: CreateTicketInput): Promise<ITicket> {
    if (input.conversationId && !Types.ObjectId.isValid(input.conversationId)) {
      throw new Error("Invalid conversationId");
    }
    if (input.contactId && !Types.ObjectId.isValid(input.contactId)) {
      throw new Error("Invalid contactId");
    }

    const requesterName = input.requesterName?.trim();
    const requesterEmail = input.requesterEmail?.trim().toLowerCase();
    if (input.source === "ai") {
      if (!requesterName) throw new Error("requesterName is required");
      if (!requesterEmail || !this.isValidEmail(requesterEmail)) {
        throw new Error("A valid requesterEmail is required");
      }
    }

    const idempotencyKey = input.idempotencyKey?.trim();
    if (idempotencyKey) {
      const existingTicket = await Ticket.findOne({
        organizationId: input.organizationId,
        "metadata.idempotencyKey": idempotencyKey,
      });
      if (existingTicket) return existingTicket;
    }

    // Auto-assign logic: if the ticket is created within an existing conversation
    // that is already assigned to a human agent, automatically assign the ticket to them.
    const orgIdObj = new Types.ObjectId(input.organizationId);
    const convIdObj = input.conversationId ? new Types.ObjectId(input.conversationId) : null;

    let assignedTo: Types.ObjectId | null = null;
    let contactId = input.contactId ? new Types.ObjectId(input.contactId) : null;
    let conversation: any = null;
    if (convIdObj) {
      conversation = await Conversation.findOne({
        _id: convIdObj,
        organizationId: orgIdObj,
      })
        .select("assignedTo sessionId")
        .lean();
      if (conversation?.assignedTo) {
        assignedTo = conversation.assignedTo;
      }
    }

    if (requesterName && requesterEmail) {
      if (convIdObj) {
        const sessionId = conversation?.sessionId || `conv:${input.conversationId}`;

        await Conversation.updateOne(
          { _id: convIdObj, organizationId: orgIdObj },
          {
            $set: {
              "metadata.senderName": requesterName,
              "metadata.senderEmail": requesterEmail,
              "metadata.contactCapturedByAIAt": new Date(),
              "metadata.contactCapturedByAI": true,
            },
          },
        );

        const contact = await Contact.findOneAndUpdate(
          { organizationId: orgIdObj, sessionId },
          {
            $set: {
              organizationId: orgIdObj,
              sessionId,
              conversationId: convIdObj,
              name: requesterName,
              email: requesterEmail,
              source: "ai",
              lastActivityAt: new Date(),
              metadata: {
                updatedBy: "ai_ticket_create",
                conversationId: convIdObj,
              },
            },
          },
          { upsert: true, new: true, runValidators: true },
        );

        contactId = contact._id;
      }
    }

    let ticket: ITicket;
    try {
      ticket = await Ticket.create({
        organizationId: orgIdObj,
        ...(convIdObj ? { conversationId: convIdObj } : {}),
        ...(contactId ? { contactId } : {}),
        title: input.title.trim(),
        description: input.description?.trim(),
        status: input.status || "open",
        priority: input.priority || "medium",
        source: input.source || "ai",
        tags: (input.tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
        notes: [],
        metadata: {
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(requesterName ? { requesterName } : {}),
          ...(requesterEmail ? { requesterEmail } : {}),
        },
        ...(input.status === "resolved" ? { resolvedAt: new Date() } : {}),
        ...(input.status === "closed" ? { closedAt: new Date() } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      });
    } catch (error: any) {
      if (idempotencyKey && error?.code === 11000) {
        const existingTicket = await Ticket.findOne({
          organizationId: orgIdObj,
          "metadata.idempotencyKey": idempotencyKey,
        });
        if (existingTicket) return existingTicket;
      }
      throw error;
    }

    const createdEvent: TicketEmailEvent =
      input.status === "resolved" ? "resolved" : input.status === "closed" ? "closed" : "created";
    await this.notifyTicketLifecycle(ticket, createdEvent);
    await ticket.populate("assignedTo", "name email");
    this.emitTicketChange(input.organizationId, "created", this.formatTicket(ticket));
    return ticket;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async listTickets(organizationId: string, options: ListTicketsOptions = {}) {
    const { status, priority, assignedTo, limit = 50, page = 1 } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { organizationId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo === "unassigned") filter.assignedTo = null;
    else if (assignedTo) filter.assignedTo = assignedTo;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "name email")
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    return {
      tickets: tickets.map((ticket) => this.formatTicket(ticket)),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  async getTicketById(organizationId: string, ticketId: string) {
    if (!Types.ObjectId.isValid(ticketId)) return null;

    const ticket = await Ticket.findOne({ _id: ticketId, organizationId })
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return null;

    // Fetch the contact profile and all conversations related by visitor session.
    // The ticket's origin conversation is included explicitly because anonymous
    // visitors do not necessarily have a Contact record yet.
    type RelatedConversation = {
      id: string;
      status: string;
      lastMessage: string;
      updatedAt: string;
    };

    let contactProfile: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
      tags: string[];
      conversations: RelatedConversation[];
    } | null = null;
    let relatedConversations: RelatedConversation[] = [];
    let contact: any = null;

    if (ticket.contactId) {
      contact = await Contact.findOne({
        _id: ticket.contactId,
        organizationId: ticket.organizationId,
      })
        .select("name email phone company tags sessionId")
        .lean();
    }

    let sessionId = contact?.sessionId;
    if (!sessionId && ticket.conversationId) {
      const originConversation = await Conversation.findOne({
        _id: ticket.conversationId,
        organizationId: ticket.organizationId,
      })
        .select("sessionId")
        .lean();
      sessionId = originConversation?.sessionId;
    }

    const relatedConversationFilters: Record<string, unknown>[] = [];
    if (sessionId) relatedConversationFilters.push({ sessionId });
    if (ticket.conversationId) relatedConversationFilters.push({ _id: ticket.conversationId });

    if (relatedConversationFilters.length > 0) {
      const convDocs = await Conversation.find({
        organizationId: ticket.organizationId,
        $or: relatedConversationFilters,
      })
        .select("status subject updatedAt")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      relatedConversations = convDocs.map((conversation: any) => ({
        id: conversation._id.toString(),
        status: conversation.status,
        lastMessage: conversation.subject || "No preview available",
        updatedAt: conversation.updatedAt?.toISOString?.() ?? "",
      }));
    }

    if (contact) {
      contactProfile = {
        id: contact._id.toString(),
        name: contact.name || null,
        email: contact.email || null,
        phone: contact.phone || null,
        company: contact.company || null,
        tags: contact.tags || [],
        conversations: relatedConversations,
      };
    }

    const requesterContact = await this.getRequesterContact(ticket);
    return this.formatTicket(ticket, {
      requesterContact,
      contactProfile,
      relatedConversations,
    });
  }

  async getTicketStatus(organizationId: string, identifier: string) {
    const normalized = identifier.trim().replace(/^#/, "");
    if (!normalized) return null;

    const filters: Record<string, unknown>[] = [
      { ticketNumber: new RegExp(`^${this.escapeRegex(normalized)}$`, "i") },
    ];

    if (Types.ObjectId.isValid(normalized)) {
      filters.push({ _id: new Types.ObjectId(normalized) });
    }

    if (/^\d+$/.test(normalized)) {
      filters.push({ ticketNumber: normalized }, { ticketNumber: `#${normalized}` });
    }

    const ticket = await Ticket.findOne({
      organizationId,
      $or: filters,
    })
      .select("title status priority assignedTo createdAt updatedAt resolutionNote metadata")
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return null;

    const metadata = (ticket.metadata || {}) as Record<string, unknown>;
    const latestSummary =
      this.normalizeContactValue(metadata.latestSummary) ||
      this.normalizeContactValue(metadata.summary) ||
      this.normalizeContactValue(ticket.resolutionNote);

    return {
      title: ticket.title,
      subject: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignedTo
        ? {
          name: (ticket.assignedTo as any).name || null,
          email: (ticket.assignedTo as any).email || null,
        }
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      latestSummary,
    };
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateTicket(organizationId: string, ticketId: string, input: UpdateTicketInput) {
    if (!Types.ObjectId.isValid(ticketId)) return null;

    const previous = await Ticket.findOne({ _id: ticketId, organizationId })
      .select("status title priority")
      .lean();
    if (!previous) return null;

    const setOps: Record<string, unknown> = {};
    if (input.title !== undefined) setOps.title = input.title.trim();
    if (input.description !== undefined) setOps.description = input.description.trim();
    if (input.priority !== undefined) setOps.priority = input.priority;
    if (input.status !== undefined) {
      setOps.status = input.status;
      if (input.status === "resolved" && previous.status !== "resolved") {
        setOps.resolvedAt = new Date();
      }
      if (input.status === "closed" && previous.status !== "closed") {
        setOps.closedAt = new Date();
      }
    }
    if (input.tags !== undefined) setOps.tags = input.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20);
    if ("assignedTo" in input) {
      setOps.assignedTo = input.assignedTo ? new Types.ObjectId(input.assignedTo) : null;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, organizationId },
      { $set: setOps },
      { new: true },
    )
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return null;

    // Sync status to the linked conversation if present
    if (input.status !== undefined && ticket.conversationId) {
      try {
        let mappedConvStatus: "open" | "resolved" | "closed" = "open";
        if (input.status === "resolved") mappedConvStatus = "resolved";
        else if (input.status === "closed") mappedConvStatus = "closed";

        await Conversation.updateOne(
          { _id: ticket.conversationId, organizationId },
          {
            $set: {
              status: mappedConvStatus,
              "metadata.statusUpdatedBy": "ticket_update",
              "metadata.statusUpdatedAt": new Date(),
            },
            $currentDate: { updatedAt: true },
          },
        );

        // Emit status_updated to conversation room
        socketService.emitToConversation(ticket.conversationId.toString(), "status_updated", {
          conversationId: ticket.conversationId.toString(),
          status: mappedConvStatus,
          updatedBy: "Ticket Update",
          timestamp: new Date(),
        });

        // Broadcast to the whole organization so lists refresh in real-time
        socketService.emitToOrg(organizationId, "status_updated", {
          conversationId: ticket.conversationId.toString(),
          status: mappedConvStatus,
          updatedBy: "Ticket Update",
          timestamp: new Date(),
        });
      } catch (err: any) {
        logger.error(`[updateTicket] Failed to sync conversation status: ${err.message}`);
      }
    }

    let event: TicketEmailEvent = "updated";
    if (input.status === "resolved" && previous.status !== "resolved") event = "resolved";
    if (input.status === "closed" && previous.status !== "closed") event = "closed";
    await this.notifyTicketLifecycle(ticket, event, this.buildUpdateSummary(input));

    const formatted = this.formatTicket(ticket);
    this.emitTicketChange(organizationId, event === "closed" ? "closed" : "updated", formatted);
    return formatted;
  }

  // ─── Close ─────────────────────────────────────────────────────────────────

  async closeTicket(organizationId: string, ticketId: string, input: CloseTicketInput = {}) {
    if (!Types.ObjectId.isValid(ticketId)) return null;

    const previous = await Ticket.findOne({ _id: ticketId, organizationId }).select("status").lean();
    if (!previous) return null;

    const now = new Date();
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, organizationId },
      {
        $set: {
          status: "closed",
          closedAt: now,
          ...(input.resolutionNote ? { resolutionNote: input.resolutionNote.trim() } : {}),
        },
        $push: {
          notes: {
            id: `note-${Date.now()}`,
            author: "AI Assistant",
            authorType: "ai",
            content: input.resolutionNote || "Ticket closed by AI.",
            createdAt: now,
          },
        },
      },
      { new: true },
    )
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return null;

    // Sync status to the linked conversation if present
    if (ticket.conversationId) {
      try {
        await Conversation.updateOne(
          { _id: ticket.conversationId, organizationId },
          {
            $set: {
              status: "closed",
              "metadata.statusUpdatedBy": "ticket_close",
              "metadata.statusUpdatedAt": new Date(),
            },
            $currentDate: { updatedAt: true },
          },
        );

        // Emit status_updated to conversation room
        socketService.emitToConversation(ticket.conversationId.toString(), "status_updated", {
          conversationId: ticket.conversationId.toString(),
          status: "closed",
          updatedBy: "Ticket Close",
          timestamp: new Date(),
        });

        // Broadcast to the whole organization so lists refresh in real-time
        socketService.emitToOrg(organizationId, "status_updated", {
          conversationId: ticket.conversationId.toString(),
          status: "closed",
          updatedBy: "Ticket Close",
          timestamp: new Date(),
        });
      } catch (err: any) {
        logger.error(`[closeTicket] Failed to sync conversation status: ${err.message}`);
      }
    }

    if (previous.status !== "closed") {
      await this.notifyTicketLifecycle(ticket, "closed", input.resolutionNote);
    }

    const formatted = this.formatTicket(ticket);
    this.emitTicketChange(organizationId, "closed", formatted);
    return formatted;
  }

  // ─── Add Note ──────────────────────────────────────────────────────────────

  async addNote(organizationId: string, ticketId: string, content: string, author = "Agent") {
    if (!Types.ObjectId.isValid(ticketId)) return null;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, organizationId },
      {
        $push: {
          notes: {
            id: `note-${Date.now()}`,
            author,
            authorType: "agent",
            content: content.trim(),
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    )
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return null;

    const formatted = this.formatTicket(ticket);
    this.emitTicketChange(organizationId, "note_added", formatted);
    return formatted;
  }

  // ─── Format ────────────────────────────────────────────────────────────────

  private emitTicketChange(
    organizationId: string,
    action: "created" | "updated" | "closed" | "note_added",
    ticket: any,
  ) {
    socketService.emitToOrg(organizationId, "ticket_updated", {
      action,
      ticket,
    });
  }

  private formatTicket(
    ticket: any,
    options: {
      requesterContact?: {
        fullName: string | null;
        email: string | null;
        phone: string | null;
      };
      contactProfile?: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        company: string | null;
        tags: string[];
        conversations: Array<{
          id: string;
          status: string;
          lastMessage: string;
          updatedAt: string;
        }>;
      } | null;
      relatedConversations?: Array<{
        id: string;
        status: string;
        lastMessage: string;
        updatedAt: string;
      }>;
    } = {},
  ) {
    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      organizationId: ticket.organizationId?.toString(),
      conversationId: ticket.conversationId?.toString() || null,
      contactId: ticket.contactId?.toString() || null,
      title: ticket.title,
      description: ticket.description || null,
      status: ticket.status,
      priority: ticket.priority,
      source: ticket.source,
      assignedTo: ticket.assignedTo
        ? {
          id: ticket.assignedTo._id?.toString() || ticket.assignedTo.toString(),
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        }
        : null,
      tags: ticket.tags || [],
      notes: (ticket.notes || []).map((n: any) => ({
        id: n.id,
        author: n.author,
        authorType: n.authorType,
        content: n.content,
        createdAt: n.createdAt,
      })),
      resolutionNote: ticket.resolutionNote || null,
      resolvedAt: ticket.resolvedAt || null,
      closedAt: ticket.closedAt || null,
      requesterContact: options.requesterContact,
      contactProfile: options.contactProfile ?? null,
      relatedConversations: options.relatedConversations ?? [],
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private async getRequesterContact(ticket: any): Promise<{
    fullName: string | null;
    email: string | null;
    phone: string | null;
  }> {
    const metadata = ticket.metadata || {};
    let fullName = this.normalizeContactValue(metadata.requesterName);
    let email = this.normalizeEmailValue(metadata.requesterEmail);
    let phone = this.normalizeContactValue(metadata.requesterPhone);
    let contact: any = null;
    let conversation: any = null;

    if (ticket.contactId) {
      contact = await Contact.findOne({
        _id: ticket.contactId,
        organizationId: ticket.organizationId,
      })
        .select("name email phone")
        .lean();
    }

    if (ticket.conversationId) {
      conversation = await Conversation.findOne({
        _id: ticket.conversationId,
        organizationId: ticket.organizationId,
      })
        .select("sessionId metadata.senderName metadata.senderEmail metadata.visitorPhone")
        .lean();
    }

    if (!contact && conversation?.sessionId) {
      contact = await Contact.findOne({
        organizationId: ticket.organizationId,
        sessionId: conversation.sessionId,
      })
        .select("name email phone")
        .lean();
    }

    fullName =
      fullName ||
      this.normalizeContactValue(contact?.name) ||
      this.normalizeContactValue(conversation?.metadata?.senderName);

    email =
      email ||
      this.normalizeEmailValue(contact?.email) ||
      this.normalizeEmailValue(conversation?.metadata?.senderEmail);

    phone =
      phone ||
      this.normalizeContactValue(contact?.phone) ||
      this.normalizeContactValue(conversation?.metadata?.visitorPhone);

    return { fullName, email, phone };
  }

  private normalizeContactValue(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "Anonymous User") return null;
    return trimmed;
  }

  private normalizeEmailValue(value: unknown): string | null {
    const email = this.normalizeContactValue(value);
    if (!email || email.toLowerCase() === "anonymous@temp.local") return null;
    return email;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private buildUpdateSummary(input: UpdateTicketInput): string {
    const changes: string[] = [];
    if (input.status) changes.push(`Status changed to ${input.status.replace(/_/g, " ")}.`);
    if (input.priority) changes.push(`Priority changed to ${input.priority}.`);
    if (input.title !== undefined) changes.push("The ticket subject was updated.");
    if (input.description !== undefined) changes.push("Additional issue details were updated.");
    if ("assignedTo" in input) changes.push("The ticket assignment was updated.");
    if (input.tags !== undefined) changes.push("Ticket categories were updated.");
    return changes.join(" ") || "Your support request has been updated.";
  }

  private async notifyTicketLifecycle(
    ticket: any,
    event: TicketEmailEvent,
    detail?: string,
  ): Promise<void> {
    try {
      const recipient = await this.getNotificationRecipient(ticket);
      if (!recipient) {
        logger.info("[Tickets] Notification skipped: no visitor email", {
          ticketNumber: ticket.ticketNumber,
          event,
        });
        return;
      }

      const queued = await enqueueTicketLifecycleEmail(recipient.email, event, {
        name: recipient.name || "there",
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: String(ticket.status).replace(/_/g, " "),
        priority: ticket.priority,
        ...(event === "updated" ? { updateSummary: detail } : {}),
        ...(event === "resolved" || event === "closed" ? { resolutionNote: detail } : {}),
      });

      if (!queued) {
        logger.warn("[Tickets] Notification email disabled or not queued", {
          ticketNumber: ticket.ticketNumber,
          event,
        });
      }
    } catch (error: any) {
      logger.error("[Tickets] Failed to queue lifecycle notification", {
        ticketNumber: ticket.ticketNumber,
        event,
        error: error?.message || error,
      });
    }
  }

  private async getNotificationRecipient(
    ticket: any,
  ): Promise<{ name: string; email: string } | null> {
    if (ticket.contactId) {
      const contact = await Contact.findOne({
        _id: ticket.contactId,
        organizationId: ticket.organizationId,
      })
        .select("name email")
        .lean();
      if (contact?.email) {
        return { name: contact.name || "there", email: contact.email };
      }
    }

    if (ticket.conversationId) {
      const conversation = await Conversation.findOne({
        _id: ticket.conversationId,
        organizationId: ticket.organizationId,
      })
        .select("sessionId")
        .lean();
      if (conversation?.sessionId) {
        const contact = await Contact.findOne({
          organizationId: ticket.organizationId,
          sessionId: conversation.sessionId,
        }).lean();
        const email = contact?.email?.trim().toLowerCase();
        if (contact && email && email !== "anonymous@temp.local") {
          return {
            name: contact.name && contact.name !== "Anonymous User" ? contact.name : "there",
            email,
          };
        }
      }
    }

    return null;
  }
}

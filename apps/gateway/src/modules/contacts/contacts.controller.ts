import { Request, Response } from "express";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { sendError, sendResponse } from "@shared/core/response";
import { ContactsService } from "./contacts.service";

const contactsService = new ContactsService();

function getOrgId(req: Request): string {
  return (req as AuthenticatedRequest).user.activeOrganizationId;
}

export class ContactsController {
  static async listContacts(req: Request, res: Response): Promise<void> {
    try {
      const items = await contactsService.listContacts(getOrgId(req), {
        search: (req.query.q as string) || undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      });

      sendResponse(res, 200, true, "Contacts retrieved", {
        contacts: items,
        total: items.length,
      });
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to list contacts");
    }
  }

  static async upsertFromAI(req: Request, res: Response): Promise<void> {
    try {
      const secret = process.env.AI_TOOL_SECRET;
      const isDev = (process.env.NODE_ENV || "development") === "development";

      if (secret) {
        const provided = req.headers["x-ai-tool-secret"];
        if (provided !== secret) {
          sendError(res, 401, "Unauthorized AI tool request");
          return;
        }
      } else if (!isDev) {
        sendError(res, 503, "AI contact tool is not configured");
        return;
      }

      const {
        organizationId,
        conversationId,
        name,
        email,
        phone,
        company,
        tags,
        note,
        sentiment,
        summary,
        topics,
      } = req.body as {
        organizationId?: string;
        conversationId?: string;
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
        tags?: string[];
        note?: string;
        sentiment?: "positive" | "neutral" | "negative";
        summary?: string;
        topics?: string[];
      };

      if (!organizationId || !conversationId) {
        sendError(res, 400, "organizationId and conversationId are required");
        return;
      }

      const result = await contactsService.upsertFromAI({
        organizationId,
        conversationId,
        name,
        email,
        phone,
        company,
        tags,
        note,
        sentiment,
        summary,
        topics,
      });

      sendResponse(res, 200, true, "Contact upserted from AI", { contact: result });
    } catch (error: any) {
      sendError(res, 400, error.message || "Failed to upsert contact from AI");
    }
  }

  static async aiSeekContact(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, email, phone, name } = req.query as Record<string, string>;

      if (!organizationId) {
        sendError(res, 400, "organizationId is required");
        return;
      }
      if (!email && !phone && !name) {
        sendError(res, 400, "At least one of email, phone, or name is required");
        return;
      }

      const contacts = await contactsService.listContacts(organizationId, {
        search: email || phone || name,
        limit: 5,
      });

      const found = contacts.length > 0;
      sendResponse(res, 200, true, found ? "Contact found" : "No contact found", {
        found,
        contact: found ? contacts[0] : null,
        total: contacts.length,
      });
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to seek contact");
    }
  }

  static async deleteContacts(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const { ids } = req.body as { ids: string[] };

      const result = await contactsService.deleteContacts(orgId, ids);
      sendResponse(res, 200, true, `${result.deletedCount} contact(s) deleted`, result);
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to delete contacts");
    }
  }

  static async bulkAddTags(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const { ids, tags } = req.body as { ids: string[]; tags: string[] };

      const result = await contactsService.bulkAddTags(orgId, ids, tags);
      sendResponse(res, 200, true, `Tags added to ${result.modifiedCount} contact(s)`, result);
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to add tags to contacts");
    }
  }

  static async addNote(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const id = req.params.id as string;
      const { content } = req.body as { content: string };
      const author = (req as any).user?.name || (req as any).user?.email || "Agent";

      const note = await contactsService.addNote(orgId, id, author, content);
      sendResponse(res, 201, true, "Note added successfully", note);
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to add note to contact");
    }
  }

  static async addTag(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const id = req.params.id as string;
      const { tag } = req.body as { tag: string };

      const addedTag = await contactsService.addTag(orgId, id, tag);
      sendResponse(res, 201, true, "Tag added successfully", { tag: addedTag });
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to add tag to contact");
    }
  }

  static async removeTag(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const id = req.params.id as string;
      const tag = req.params.tag as string;

      await contactsService.removeTag(orgId, id, tag);
      sendResponse(res, 200, true, "Tag removed successfully");
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to remove tag from contact");
    }
  }

  static async listConflicts(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const conflicts = await contactsService.listPendingConflicts(orgId);
      sendResponse(res, 200, true, "Pending conflicts retrieved successfully", conflicts);
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to retrieve pending conflicts");
    }
  }

  static async resolveConflict(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
      const id = req.params.id as string;
      const { action } = req.body as { action: "apply" | "dismiss" };
      const agentName = (req as any).user?.name || (req as any).user?.email || "Agent";

      await contactsService.resolveConflict(orgId, id, action, agentName);
      sendResponse(res, 200, true, `Conflict ${action === "apply" ? "applied" : "dismissed"} successfully`);
    } catch (error: any) {
      sendError(res, 500, error.message || "Failed to resolve conflict");
    }
  }
}


import { Request, Response } from "express";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { sendError, sendResponse } from "@shared/core/response";
import { ContactsService } from "./contacts.service";
import { loadEeModule } from "@shared/ee";

const contactsService = new ContactsService();

function getOrgId(req: Request): string {
  return (req as AuthenticatedRequest).user.activeOrganizationId;
}

export class ContactsController {
  static async listContacts(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = getOrgId(req);
      const ee = loadEeModule();
      if (ee?.contacts?.beforeListContacts) {
        await ee.contacts.beforeListContacts({ organizationId });
      }

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
        status,
        sentiment,
        summary,
        topics,
        timelineLabel,
        timelineDetail,
      } = req.body as {
        organizationId?: string;
        conversationId?: string;
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
        status,
        sentiment,
        summary,
        topics,
        timelineLabel,
        timelineDetail,
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
}


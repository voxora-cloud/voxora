import { Request, Response } from "express";
import { AuthenticatedRequest } from "@shared/middleware";
import { sendError, sendResponse } from "@shared/utils/response";
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
}

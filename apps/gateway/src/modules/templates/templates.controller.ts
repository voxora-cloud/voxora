import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { TemplatesService } from "./templates.service";

const templatesService = new TemplatesService();

const getOrgId = (req: Request): string =>
  (req as AuthenticatedRequest).user.activeOrganizationId;

const getUserId = (req: Request): string =>
  (req as AuthenticatedRequest).user.userId;

function validateTemplateInput(
  body: Record<string, unknown>,
  partial = false,
): string | null {
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return "title is required";
    }
  }

  if (!partial || body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      return "content is required";
    }
  }

  return null;
}

export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = await templatesService.listTemplates(getOrgId(req));
  sendResponse(res, 200, true, "Templates fetched successfully", templates);
});

export const createTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const validationError = validateTemplateInput(req.body);
    if (validationError) return sendError(res, 400, validationError);

    const template = await templatesService.createTemplate(
      getOrgId(req),
      getUserId(req),
      req.body,
    );
    sendResponse(res, 201, true, "Template created successfully", template);
  },
);

export const updateTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const validationError = validateTemplateInput(req.body, true);
    if (validationError) return sendError(res, 400, validationError);

    const template = await templatesService.updateTemplate(
      getOrgId(req),
      req.params.id as string,
      req.body,
    );
    if (!template) return sendError(res, 404, "Template not found");

    sendResponse(res, 200, true, "Template updated successfully", template);
  },
);

export const deleteTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const template = await templatesService.deleteTemplate(
      getOrgId(req),
      req.params.id as string,
    );
    if (!template) return sendError(res, 404, "Template not found");

    sendResponse(res, 200, true, "Template deleted successfully");
  },
);

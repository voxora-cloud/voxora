import { Request, Response } from "express";
import { OrganizationService } from "./organization.service";
import { AuthenticatedRequest } from "@shared/middleware";
import { sendResponse, sendError } from "@shared/utils/response";

export class OrganizationController {
    static async createOrganization(req: Request, res: Response): Promise<void> {
        try {
            const { userId, email } = (req as AuthenticatedRequest).user;
            const { name, slug } = req.body;

            // Create org + owner membership, then switch context to new org
            await OrganizationService.createOrganization(userId, { name, slug });
            const org = await OrganizationService.getUserOrganizations(userId);
            const newOrg = org.find((o) => o.organization.name === name);
            if (!newOrg) throw new Error("Failed to create organization");

            const tokens = await OrganizationService.switchOrganization(
                userId,
                email,
                newOrg.organization._id.toString(),
            );

            sendResponse(res, 201, true, "Organization created successfully", {
                organization: tokens.organization,
                role: tokens.role,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async getMyOrganizations(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = (req as AuthenticatedRequest).user;
            const orgs = await OrganizationService.getUserOrganizations(userId);
            sendResponse(res, 200, true, "Organizations retrieved", { organizations: orgs });
        } catch (error: any) {
            sendError(res, 500, error.message);
        }
    }

    static async getOrganization(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = (req as AuthenticatedRequest).user;
            const { orgId } = req.params as { orgId?: string | string[] };
            const resolvedOrgId = Array.isArray(orgId) ? orgId[0] : orgId;
            if (!resolvedOrgId) {
                sendError(res, 400, "Organization id is required");
                return;
            }
            const result = await OrganizationService.getOrganization(userId, resolvedOrgId);
            sendResponse(res, 200, true, "Organization retrieved", result);
        } catch (error: any) {
            sendError(res, 404, error.message);
        }
    }

    static async updateOrganization(req: Request, res: Response): Promise<void> {
        try {
            const { activeOrganizationId } = (req as AuthenticatedRequest).user;
            const org = await OrganizationService.updateOrganization(activeOrganizationId, req.body);
            sendResponse(res, 200, true, "Organization updated", { organization: org });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async switchOrganization(req: Request, res: Response): Promise<void> {
        try {
            const { userId, email } = (req as AuthenticatedRequest).user;
            const { orgId } = req.params as { orgId?: string | string[] };
            const resolvedOrgId = Array.isArray(orgId) ? orgId[0] : orgId;
            if (!resolvedOrgId) {
                sendError(res, 400, "Organization id is required");
                return;
            }

            const result = await OrganizationService.switchOrganization(userId, email, resolvedOrgId);

            sendResponse(res, 200, true, "Switched organization successfully", {
                organization: result.organization,
                role: result.role,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        } catch (error: any) {
            sendError(res, 403, error.message);
        }
    }

    static async deleteOrganization(req: Request, res: Response): Promise<void> {
        try {
            const { activeOrganizationId } = (req as AuthenticatedRequest).user;
            await OrganizationService.deleteOrganization(activeOrganizationId);
            sendResponse(res, 200, true, "Organization deactivated");
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }
}

import { Request, Response } from "express";
import { MembershipService } from "./membership.service";
import { AuthenticatedRequest } from "@shared/middleware";
import { sendResponse, sendError } from "@shared/utils/response";
import { MembershipRole } from "@shared/models";
import { generateTokens } from "@shared/utils/auth";

export class MembershipController {
    static async listMembers(req: Request, res: Response): Promise<void> {
        try {
            const { activeOrganizationId } = (req as AuthenticatedRequest).user;
            const members = await MembershipService.listMembers(activeOrganizationId);
            sendResponse(res, 200, true, "Members retrieved", { members });
        } catch (error: any) {
            sendError(res, 500, error.message);
        }
    }

    static async inviteMember(req: Request, res: Response): Promise<void> {
        try {
            const { userId, activeOrganizationId } = (req as AuthenticatedRequest).user;
            const { email, name, role, teamIds, password } = req.body;

            const result = await MembershipService.inviteMember(userId, activeOrganizationId, {
                email,
                name,
                role: role as MembershipRole,
                teamIds,
                password,
            });

            sendResponse(res, 201, true, "Invitation sent", { membershipId: result.membership._id });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async verifyInvite(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params as { token?: string | string[] };
            const resolvedToken = Array.isArray(token) ? token[0] : token;
            if (!resolvedToken) {
                sendError(res, 400, "Invite token is required");
                return;
            }
            const details = await MembershipService.verifyInvite(resolvedToken);
            sendResponse(res, 200, true, "Invite details retrieved", details);
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async acceptInvite(req: Request, res: Response): Promise<void> {
        try {
            const { token, password } = req.body;
            const { user, membership } = await MembershipService.acceptInvite(token, password);

            const tokens = generateTokens({
                userId: user._id.toString(),
                email: user.email,
                activeOrganizationId: membership.organizationId.toString(),
            });

            sendResponse(res, 200, true, "Invitation accepted", {
                user: { id: user._id, name: user.name, email: user.email },
                role: membership.role,
                organizationId: membership.organizationId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async resendInvite(req: Request, res: Response): Promise<void> {
        try {
            const { activeOrganizationId } = (req as AuthenticatedRequest).user;
            const { memberId } = req.params as { memberId?: string | string[] };
            const resolvedMemberId = Array.isArray(memberId) ? memberId[0] : memberId;
            if (!resolvedMemberId) {
                sendError(res, 400, "Member id is required");
                return;
            }

            await MembershipService.resendInvite(activeOrganizationId, resolvedMemberId);

            sendResponse(res, 200, true, "Invitation resent successfully");
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async updateMemberRole(req: Request, res: Response): Promise<void> {
        try {
            const { userId, activeOrganizationId } = (req as AuthenticatedRequest).user;
            const { memberId } = req.params as { memberId?: string | string[] };
            const resolvedMemberId = Array.isArray(memberId) ? memberId[0] : memberId;
            if (!resolvedMemberId) {
                sendError(res, 400, "Member id is required");
                return;
            }
            const { role } = req.body;

            const membership = await MembershipService.updateMemberRole(
                activeOrganizationId,
                resolvedMemberId,
                role as MembershipRole,
                userId,
            );

            sendResponse(res, 200, true, "Member role updated", { membership });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async updateMemberStatus(req: Request, res: Response): Promise<void> {
        try {
            const { userId, activeOrganizationId } = (req as AuthenticatedRequest).user;
            const { memberId } = req.params as { memberId?: string | string[] };
            const resolvedMemberId = Array.isArray(memberId) ? memberId[0] : memberId;
            if (!resolvedMemberId) {
                sendError(res, 400, "Member id is required");
                return;
            }
            const { status } = req.body;

            if (status !== "active" && status !== "inactive") {
                throw new Error("Status must be 'active' or 'inactive'");
            }

            const membership = await MembershipService.updateMemberStatus(
                activeOrganizationId,
                resolvedMemberId,
                status as "active" | "inactive",
                userId,
            );

            sendResponse(res, 200, true, "Member status updated", { membership });
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }

    static async removeMember(req: Request, res: Response): Promise<void> {
        try {
            const { userId, activeOrganizationId } = (req as AuthenticatedRequest).user;
            const { memberId } = req.params as { memberId?: string | string[] };
            const resolvedMemberId = Array.isArray(memberId) ? memberId[0] : memberId;
            if (!resolvedMemberId) {
                sendError(res, 400, "Member id is required");
                return;
            }

            await MembershipService.removeMember(activeOrganizationId, resolvedMemberId, userId);
            sendResponse(res, 200, true, "Member removed");
        } catch (error: any) {
            sendError(res, 400, error.message);
        }
    }
}

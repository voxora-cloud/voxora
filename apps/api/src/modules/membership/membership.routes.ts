import { Router } from "express";
import { MembershipController } from "./membership.controller";
import { authenticate, resolveOrganization, requireRole, validateRequest } from "@shared/middleware";
import { membershipSchema } from "./membership.schema";

export const membershipRouter = Router();

// Accept invite is public (token-based)
membershipRouter.post("/accept-invite", MembershipController.acceptInvite);
membershipRouter.get("/verify-invite/:token", MembershipController.verifyInvite);

// All other membership routes require authentication + org context
membershipRouter.use(authenticate, resolveOrganization);

membershipRouter.get(
    "/organizations/:orgId/members",
    requireRole("admin"),
    MembershipController.listMembers,
);

membershipRouter.post(
    "/organizations/:orgId/members/invite",
    requireRole("admin"),
    validateRequest(membershipSchema.inviteMember),
    MembershipController.inviteMember,
);

membershipRouter.post(
    "/organizations/:orgId/members/:memberId/resend-invite",
    requireRole("admin"),
    MembershipController.resendInvite,
);

membershipRouter.patch(
    "/organizations/:orgId/members/:memberId/role",
    requireRole("admin"),
    MembershipController.updateMemberRole,
);

membershipRouter.patch(
    "/organizations/:orgId/members/:memberId/status",
    requireRole("admin"),
    MembershipController.updateMemberStatus,
);

membershipRouter.delete(
    "/organizations/:orgId/members/:memberId",
    requireRole("admin"),
    MembershipController.removeMember,
);

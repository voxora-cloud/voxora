import { Router } from "express";
import { MembershipController } from "./membership.controller";
import { authenticate, resolveOrganization, requireRole, validateRequest, requireWithinLimit } from "@shared/security/middleware";
import { membershipSchema } from "./membership.schema";

export const membershipRouter = Router();

// Accept invite is public (token-based)

/**
 * @openapi
 * /memberships/accept-invite:
 *   post:
 *     summary: Accept a pending organization membership invitation
 *     tags:
 *       - Memberships
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - name
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully, user registered
 */
membershipRouter.post("/accept-invite", MembershipController.acceptInvite);

/**
 * @openapi
 * /memberships/verify-invite/{token}:
 *   get:
 *     summary: Verify token validity for a membership invitation
 *     tags:
 *       - Memberships
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token is valid and matches an active invite
 *       400:
 *         description: Invalid or expired token
 */
membershipRouter.get("/verify-invite/:token", MembershipController.verifyInvite);

// All other membership routes require authentication + org context
membershipRouter.use(authenticate, resolveOrganization);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members:
 *   get:
 *     summary: Retrieve list of members inside a specific organization
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization members list retrieved successfully
 */
membershipRouter.get(
    "/organizations/:orgId/members",
    requireRole("admin"),
    MembershipController.listMembers,
);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members/invite:
 *   post:
 *     summary: Invite a new user to join the organization
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
membershipRouter.post(
    "/organizations/:orgId/members/invite",
    requireRole("admin"),
    requireWithinLimit("humanAgents"),
    validateRequest(membershipSchema.inviteMember),
    MembershipController.inviteMember,
);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members/{memberId}/resend-invite:
 *   post:
 *     summary: Resend invitation email to a pending member
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation email resent successfully
 */
membershipRouter.post(
    "/organizations/:orgId/members/:memberId/resend-invite",
    requireRole("admin"),
    MembershipController.resendInvite,
);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members/{memberId}/role:
 *   patch:
 *     summary: Update an organization member's role
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member role updated successfully
 */
membershipRouter.patch(
    "/organizations/:orgId/members/:memberId/role",
    requireRole("admin"),
    MembershipController.updateMemberRole,
);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members/{memberId}/status:
 *   patch:
 *     summary: Update an organization member's status (e.g. suspend)
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteStatus
 *             properties:
 *               inviteStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member status updated successfully
 */
membershipRouter.patch(
    "/organizations/:orgId/members/:memberId/status",
    requireRole("admin"),
    MembershipController.updateMemberStatus,
);

/**
 * @openapi
 * /memberships/organizations/{orgId}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from the organization
 *     tags:
 *       - Memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
membershipRouter.delete(
    "/organizations/:orgId/members/:memberId",
    requireRole("admin"),
    MembershipController.removeMember,
);

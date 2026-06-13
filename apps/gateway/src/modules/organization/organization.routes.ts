import { Router } from "express";
import { OrganizationController } from "./organization.controller";
import { OrganizationBillingController } from "./organization.billing.controller";
import {
	authenticate,
	resolveOrganization,
	requireRole,
	requireEeAvailable,
	requireEeFeature,
	billingWebhookRateLimit,
	validateRequest,
} from "@shared/security/middleware";
import { organizationSchema } from "./organization.schema";

export const organizationRouter = Router();

// Public billing webhook endpoint (provider callbacks must not require auth)

/**
 * @openapi
 * /organizations/billing/webhook/dodo:
 *   post:
 *     summary: Handle inbound webhook events from Dodo Payments billing provider
 *     tags:
 *       - Organizations
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 */
organizationRouter.post(
	"/billing/webhook/dodo",
	billingWebhookRateLimit,
	OrganizationBillingController.handleBillingWebhook,
);

// All org routes require authentication
organizationRouter.use(authenticate);

// List user's orgs – no org context needed

/**
 * @openapi
 * /organizations:
 *   get:
 *     summary: Get all organizations associated with the authenticated user
 *     tags:
 *       - Organizations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations list retrieved successfully
 */
organizationRouter.get("/", OrganizationController.getMyOrganizations);

// Create a new organization

/**
 * @openapi
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags:
 *       - Organizations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization created successfully
 */
organizationRouter.post("/", validateRequest(organizationSchema.createOrganization), OrganizationController.createOrganization);

// Switch active org (no org context needed – we're changing to a new one)

/**
 * @openapi
 * /organizations/{orgId}/switch:
 *   post:
 *     summary: Switch active organization context and return fresh session tokens
 *     tags:
 *       - Organizations
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
 *         description: Organization active context switched successfully, new tokens returned
 */
organizationRouter.post(
	"/:orgId/switch",
	validateRequest(organizationSchema.switchOrganizationParams, "params"),
	OrganizationController.switchOrganization,
);

// Routes below need an active org context
organizationRouter.use(resolveOrganization);

/**
 * @openapi
 * /organizations/{orgId}:
 *   get:
 *     summary: Get detailed information for a specific organization
 *     tags:
 *       - Organizations
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
 *         description: Organization details retrieved successfully
 *       404:
 *         description: Organization not found
 */
organizationRouter.get(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationController.getOrganization,
);

/**
 * @openapi
 * /organizations/{orgId}:
 *   patch:
 *     summary: Update organization details (e.g. name)
 *     tags:
 *       - Organizations
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated successfully
 */
organizationRouter.patch(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("admin"),
	validateRequest(organizationSchema.updateOrganization),
	OrganizationController.updateOrganization,
);

/**
 * @openapi
 * /organizations/{orgId}:
 *   delete:
 *     summary: Delete organization and all child assets
 *     tags:
 *       - Organizations
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
 *         description: Organization deleted successfully
 */
organizationRouter.delete(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("owner"),
	OrganizationController.deleteOrganization,
);

/**
 * @openapi
 * /organizations/{orgId}/billing/portal:
 *   get:
 *     summary: Get self-service billing portal session link (EE only)
 *     tags:
 *       - Organizations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: returnUrl
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Billing portal session link returned successfully
 */
organizationRouter.get(
	"/:orgId/billing/portal",
	validateRequest(organizationSchema.orgParams, "params"),
	validateRequest(organizationSchema.billingPortalQuery, "query"),
	requireRole("owner"),
	requireEeAvailable(),
	OrganizationBillingController.getBillingPortal,
);

/**
 * @openapi
 * /organizations/{orgId}/billing/entitlements:
 *   get:
 *     summary: Get active billing tier entitlements/features limits list
 *     tags:
 *       - Organizations
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
 *         description: Billing tier entitlements list retrieved successfully
 */
organizationRouter.get(
	"/:orgId/billing/entitlements",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationBillingController.getBillingEntitlements,
);

/**
 * @openapi
 * /organizations/{orgId}/billing/usage:
 *   get:
 *     summary: Get usage metric consumption status for current billing tier
 *     tags:
 *       - Organizations
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
 *         description: Billing usage consumption retrieved successfully
 */
organizationRouter.get(
	"/:orgId/billing/usage",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationBillingController.getBillingUsage,
);

/**
 * @openapi
 * /organizations/{orgId}/white-label:
 *   patch:
 *     summary: Configure brand white-labeling rules (custom domain/CSS) (EE only)
 *     tags:
 *       - Organizations
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
 *             properties:
 *               customDomain:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Brand settings configured successfully
 */
organizationRouter.patch(
	"/:orgId/white-label",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("owner"),
	requireEeFeature("white-label"),
	validateRequest(organizationSchema.updateWhiteLabel),
	OrganizationController.updateWhiteLabel,
);

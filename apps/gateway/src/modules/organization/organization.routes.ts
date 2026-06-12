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
organizationRouter.post(
	"/billing/webhook/dodo",
	billingWebhookRateLimit,
	OrganizationBillingController.handleBillingWebhook,
);

// All org routes require authentication
organizationRouter.use(authenticate);

// List user's orgs – no org context needed
organizationRouter.get("/", OrganizationController.getMyOrganizations);

// Create a new organization
organizationRouter.post("/", validateRequest(organizationSchema.createOrganization), OrganizationController.createOrganization);

// Switch active org (no org context needed – we're changing to a new one)
organizationRouter.post(
	"/:orgId/switch",
	validateRequest(organizationSchema.switchOrganizationParams, "params"),
	OrganizationController.switchOrganization,
);

// Routes below need an active org context
organizationRouter.use(resolveOrganization);

organizationRouter.get(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationController.getOrganization,
);
organizationRouter.patch(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("admin"),
	validateRequest(organizationSchema.updateOrganization),
	OrganizationController.updateOrganization,
);
organizationRouter.delete(
	"/:orgId",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("owner"),
	OrganizationController.deleteOrganization,
);
organizationRouter.get(
	"/:orgId/billing/portal",
	validateRequest(organizationSchema.orgParams, "params"),
	validateRequest(organizationSchema.billingPortalQuery, "query"),
	requireRole("owner"),
	requireEeAvailable(),
	OrganizationBillingController.getBillingPortal,
);
organizationRouter.get(
	"/:orgId/billing/entitlements",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationBillingController.getBillingEntitlements,
);
organizationRouter.get(
	"/:orgId/billing/usage",
	validateRequest(organizationSchema.orgParams, "params"),
	OrganizationBillingController.getBillingUsage,
);
organizationRouter.patch(
	"/:orgId/white-label",
	validateRequest(organizationSchema.orgParams, "params"),
	requireRole("owner"),
	requireEeFeature("white-label"),
	validateRequest(organizationSchema.updateWhiteLabel),
	OrganizationController.updateWhiteLabel,
);

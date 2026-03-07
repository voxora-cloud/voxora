import { Router } from "express";
import { OrganizationController } from "./organization.controller";
import { authenticate, resolveOrganization, requireRole } from "@shared/middleware";

export const organizationRouter = Router();

// All org routes require authentication
organizationRouter.use(authenticate);

// List user's orgs – no org context needed
organizationRouter.get("/", OrganizationController.getMyOrganizations);

// Create a new organization
organizationRouter.post("/", OrganizationController.createOrganization);

// Switch active org (no org context needed – we're changing to a new one)
organizationRouter.post("/:orgId/switch", OrganizationController.switchOrganization);

// Routes below need an active org context
organizationRouter.use(resolveOrganization);

organizationRouter.get("/:orgId", OrganizationController.getOrganization);
organizationRouter.patch("/:orgId", requireRole("admin"), OrganizationController.updateOrganization);
organizationRouter.delete("/:orgId", requireRole("owner"), OrganizationController.deleteOrganization);

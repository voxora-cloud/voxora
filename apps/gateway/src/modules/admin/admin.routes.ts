import { Router } from "express";
import * as AdminController from "./admin.controller";
import { authenticate, requireRole, validateRequest } from "@shared/security/middleware";
import { adminSchema } from "./admin.schema";

const router = Router();

router.use(authenticate);
router.use(requireRole("admin"));



// ** AGENT ROUTES **
router.get(
  "/agents",
  validateRequest(adminSchema.agentFiltersQuery, "query"),
  AdminController.getAgents,
);
router.get("/agents/:id", AdminController.getAgentById);
router.post(
  "/agents/invite",
  validateRequest(adminSchema.inviteAgent),
  AdminController.inviteAgent,
);
router.put(
  "/agents/:id",
  validateRequest(adminSchema.updateAgent),
  AdminController.updateAgent,
);
router.delete("/agents/:id", AdminController.deleteAgent);
router.post("/agents/:id/resend-invite", AdminController.resendInvite);

// ** DASHBOARD ROUTES **
router.get("/stats/dashboard", AdminController.getDashboardStats);

export default router;

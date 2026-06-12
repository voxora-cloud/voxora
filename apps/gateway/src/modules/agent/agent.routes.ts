import { Router } from "express";
import * as AgentController from "./agent.controller";
import { authenticate, requireRole, validateRequest } from "@shared/security/middleware";
import { agentSchema } from "./agent.schema";

const router = Router();

router.use(authenticate);
router.use(requireRole("agent"));

// ** AGENT PROFILE **
router.get("/profile", AgentController.getProfile);
router.put(
  "/profile",
  validateRequest(agentSchema.updateProfile),
  AgentController.updateProfile,
);
router.patch(
  "/status",
  validateRequest(agentSchema.updateStatus),
  AgentController.updateStatus,
);

router.get("/stats", AgentController.getStats);

export default router;

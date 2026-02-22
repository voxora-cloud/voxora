import { Router } from "express";
import * as AgentController from "./agent.controller";
import { authenticate, authorize, validateRequest } from "@shared/middleware";
import { agentSchema } from "./agent.schema";

const router = Router();

router.use(authenticate);
router.use(authorize(["agent"]));

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

router.get("/teams", AgentController.getTeams);
router.get("/teams/all", AgentController.getAllTeams);
router.get("/teams/:id/members", AgentController.getTeamMembers);
router.get("/teams/:id/all-members", AgentController.getAllTeamMembers);
router.get("/stats", AgentController.getStats);

export default router;

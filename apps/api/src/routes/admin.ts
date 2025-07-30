import { Router } from 'express';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getAgents,
  getAgentById,
  inviteAgent,
  updateAgent,
  deleteAgent,
  resendInvite,
  getDashboardStats
} from '../controllers/adminController';
import { authenticate, authorize, validateRequest } from '../middleware';
import { teamValidation, userValidation, queryValidation } from '../utils/validation';

const router = Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(['admin', 'founder']));

// =================
// TEAM ROUTES
// =================

// Get all teams
router.get('/teams', 
  validateRequest(queryValidation.pagination, 'query'), 
  getTeams
);

// Get team by ID
router.get('/teams/:id', getTeamById);

// Create team
router.post('/teams', 
  validateRequest(teamValidation.create), 
  createTeam
);

// Update team
router.put('/teams/:id', 
  validateRequest(teamValidation.update), 
  updateTeam
);

// Delete team
router.delete('/teams/:id', deleteTeam);

// =================
// AGENT ROUTES
// =================

// Get all agents
router.get('/agents', 
  validateRequest(queryValidation.agentFilters, 'query'), 
  getAgents
);

// Get agent by ID
router.get('/agents/:id', getAgentById);

// Invite agent
router.post('/agents/invite', 
  validateRequest(userValidation.inviteAgent), 
  inviteAgent
);

// Update agent
router.put('/agents/:id', 
  validateRequest(userValidation.updateAgent), 
  updateAgent
);

// Delete agent
router.delete('/agents/:id', deleteAgent);

// Resend invitation
router.post('/agents/:id/resend-invite', resendInvite);

// =================
// DASHBOARD ROUTES
// =================

// Dashboard stats
router.get('/stats', getDashboardStats);

export default router;

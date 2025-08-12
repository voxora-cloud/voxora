import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateStatus,
  getTeams,
  getTeamMembers,
  getStats
} from '../controllers/agentController';
import { authenticate, authorize, validateRequest } from '../middleware';
import { userValidation } from '../utils/validation';

const router = Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize(['agent']));

// =================
// AGENT PROFILE
// =================

// Get agent profile
router.get('/profile', getProfile);

// Update agent profile
router.put('/profile', 
  validateRequest(userValidation.updateProfile), 
  updateProfile
);

// Update agent status
router.patch('/status', 
  validateRequest(userValidation.updateStatus), 
  updateStatus
);


router.get('/teams', getTeams);
router.get('/teams/:id/members', getTeamMembers);
router.get('/stats', getStats);

export default router;

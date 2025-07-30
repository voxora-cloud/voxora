import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateStatus,
  getConversations,
  getConversationById,
  assignConversation,
  transferConversation,
  updateConversationStatus,
  addConversationNote,
  getTeams,
  getTeamMembers,
  getStats
} from '../controllers/agentController';
import { authenticate, authorize, validateRequest } from '../middleware';
import { userValidation, conversationValidation, queryValidation } from '../utils/validation';

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

// =================
// CONVERSATIONS
// =================

// Get agent conversations
router.get('/conversations', 
  validateRequest(queryValidation.conversationFilters, 'query'), 
  getConversations
);

// Get conversation by ID
router.get('/conversations/:id', getConversationById);

// Assign conversation to self
router.post('/conversations/:id/assign', assignConversation);

// Transfer conversation
router.post('/conversations/:id/transfer', 
  validateRequest(conversationValidation.transfer), 
  transferConversation
);

// Update conversation status
router.patch('/conversations/:id/status', 
  validateRequest(conversationValidation.updateStatus), 
  updateConversationStatus
);

// Add note to conversation
router.post('/conversations/:id/notes', 
  validateRequest(conversationValidation.addNote), 
  addConversationNote
);

// =================
// TEAM INFORMATION
// =================

// Get agent teams
router.get('/teams', getTeams);

// Get team members
router.get('/teams/:id/members', getTeamMembers);

// =================
// AGENT STATS
// =================

// Get agent statistics
router.get('/stats', getStats);

export default router;

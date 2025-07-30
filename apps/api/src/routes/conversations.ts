import { Router } from 'express';
import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  assignConversation,
  closeConversation,
} from '../controllers/conversationController';
import { authenticate, validateRequest, authorize } from '../middleware';
import { conversationValidation } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Conversation routes
router.post('/',
  validateRequest(conversationValidation.create),
  createConversation
);

router.get('/', getConversations);

router.get('/:conversationId', getConversationById);

router.put('/:conversationId',
  validateRequest(conversationValidation.update),
  updateConversation
);

router.post('/:conversationId/assign',
  authorize(['agent', 'admin']),
  assignConversation
);

router.post('/:conversationId/close', closeConversation);

export default router;

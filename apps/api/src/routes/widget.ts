import { Router } from 'express';
import { createWidgetConversation } from '../controllers/conversationController';
import { validateRequest } from '../middleware';
import { conversationValidation, messageValidation } from '../utils/validation';

const router = Router();

// Public widget routes (no authentication required)
router.post('/conversations',
  validateRequest(conversationValidation.createWidget),
  createWidgetConversation
);


export default router;

import { Router } from 'express';
import { createWidgetConversation } from '../controllers/conversationController';
import { generateWidgetToken, validateWidgetToken } from '../controllers/widgetController';
import { validateRequest, authenticateWidget } from '../middleware';
import { conversationValidation, messageValidation } from '../utils/validation';

const router = Router();

// Widget authentication routes (public)
router.post('/auth/token', generateWidgetToken);
router.post('/auth/validate', authenticateWidget, validateWidgetToken);

// Widget routes (require authentication)
router.post('/conversations',
  authenticateWidget,
  validateRequest(conversationValidation.createWidget),
  createWidgetConversation
);

export default router;

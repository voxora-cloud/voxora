import { Router } from 'express';
import { generateWidgetToken, validateWidgetToken } from '../controllers/widgetController';
import { validateRequest, authenticateWidget } from '../middleware';
import { conversationValidation, messageValidation } from '../utils/validation';
import { initConversation } from '../controllers/conversationController';

const router = Router();

// widget auth
router.post('/auth/token', generateWidgetToken);
router.post('/auth/validate', authenticateWidget, validateWidgetToken);

// widget conversations
router.post('/conversations',
  authenticateWidget,
  validateRequest(conversationValidation.createWidget),
  initConversation
);


export default router;

import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
} from '../controllers/messageController';
import { authenticate, validateRequest } from '../middleware';
import { messageValidation } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Message routes
router.post('/',
  validateRequest(messageValidation.send),
  sendMessage
);

router.get('/conversation/:conversationId', getMessages);

router.put('/:messageId', editMessage);

router.delete('/:messageId', deleteMessage);

router.post('/:messageId/read', markAsRead);

router.get('/conversation/:conversationId/unread-count', getUnreadCount);

export default router;

import { Router } from 'express';
import authRoutes from './auth';
import conversationRoutes from './conversations';
import messageRoutes from './messages';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
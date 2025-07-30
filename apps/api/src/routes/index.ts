import { Router } from 'express';
import authRoutes from './auth';
import conversationRoutes from './conversations';
import messageRoutes from './messages';
import adminRoutes from './admin';
import agentRoutes from './agent';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
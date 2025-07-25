import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
} from '../controllers/authController';
import { authenticate, validateRequest, authRateLimit } from '../middleware';
import { userValidation } from '../utils/validation';

const router = Router();

// Public routes with rate limiting
router.post('/register', 
  authRateLimit,
  validateRequest(userValidation.register),
  register
);

router.post('/login',
  authRateLimit,
  validateRequest(userValidation.login),
  login
);

router.post('/refresh-token', refreshToken);

// Protected routes
router.use(authenticate);

router.post('/logout', logout);
router.get('/profile', getProfile);

export default router;

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/auth';
import { sendError } from '../utils/response';
import { User } from '../models';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      sendError(res, 401, 'Access token is required');
      return;
    }

    const decoded = verifyToken(token, 'access') as JWTPayload;
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      sendError(res, 401, 'Invalid token or user not found');
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    sendError(res, 401, 'Invalid or expired token');
  }
};

// Alias for authenticate to match route expectations
export const auth = authenticate;

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
      return;
    }

    next();
  };
};

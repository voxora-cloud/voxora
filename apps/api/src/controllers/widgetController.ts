import { Request, Response } from 'express';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import jwt from 'jsonwebtoken';
import config from '../config';

export const generateWidgetToken = asyncHandler(async (req: Request, res: Response) => {
  const { voxoraPublicKey, origin } = req.body;

  try {
    // Validate public key exists and is valid
    if (!voxoraPublicKey) {
      return sendError(res, 400, 'Voxora public key is required');
    }

    // Here you would typically validate the public key against your database
    // For now, we'll create a basic widget session token
    const widgetPayload = {
      publicKey: voxoraPublicKey,
      origin: origin || req.get('origin') || 'unknown',
      type: 'widget_session',
      sessionId: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Generate a widget-specific JWT token (valid for 24 hours)
    const token = jwt.sign(widgetPayload, config.jwt.secret!, { expiresIn: '24h' });

    sendResponse(res, 200, true, 'Widget token generated successfully', {
      token,
      expiresIn: '24h',
      sessionId: widgetPayload.sessionId
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to generate widget token: ' + error.message);
  }
});

export const validateWidgetToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    if (!token) {
      return sendError(res, 400, 'Token is required');
    }

    // Token validation is handled by middleware
    // If we reach here, token is valid
    sendResponse(res, 200, true, 'Token is valid', {
      valid: true,
      user: (req as any).widgetSession
    });
  } catch (error: any) {
    sendError(res, 401, 'Invalid token');
  }
});

import { Request, Response } from 'express';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import jwt from 'jsonwebtoken';
import config from '../config';
import { Widget } from '../models';

export const generateWidgetToken = asyncHandler(async (req: Request, res: Response) => {
  const { voxoraPublicKey, origin } = req.body;

  try {
    if (!voxoraPublicKey) {
      return sendError(res, 400, 'Voxora public key is required');
    }

    const widget = await Widget.findById(voxoraPublicKey);


    if (!widget) {
      return sendError(res, 404, 'Widget not found');
    }

    const widgetPayload = {
      publicKey: voxoraPublicKey,
      displayName: widget.displayName || 'Unknown Widget',
      userId: widget.userId,
      backgroundColor: widget.backgroundColor || '#FFFFFF',
      origin: origin || req.get('origin') || 'unknown',
      type: "widget_session"
    };

    const token = jwt.sign(widgetPayload, config.jwt.secret!, { expiresIn: '24h' });

    sendResponse(res, 200, true, 'Widget token generated successfully', {
      token,
      expiresIn: '24h'
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

    // todo: Validate the token and extract user information

    sendResponse(res, 200, true, 'Token is valid', {
      valid: true,
      user: (req as any).widgetSession
    });
  } catch (error: any) {
    sendError(res, 401, 'Invalid token');
  }
});

// Public: fetch widget configuration by voxoraPublicKey
export const getWidgetConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { voxoraPublicKey } = req.query as { voxoraPublicKey?: string };

    if (!voxoraPublicKey) {
      return sendError(res, 400, 'voxoraPublicKey is required');
    }

    const widget = await Widget.findById(voxoraPublicKey)
      .select('displayName logoUrl backgroundColor')
      .lean();

    if (!widget) {
      return sendError(res, 404, 'Widget not found');
    }

    // Normalize logo URL to absolute if necessary
    let logoUrl = (widget as any).logoUrl as string | undefined;
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
      const scheme = (req.get('x-forwarded-proto') || req.protocol || 'http');
      const host = req.get('host');
      const base = `${scheme}://${host}`;
      if (!logoUrl.startsWith('/')) logoUrl = '/' + logoUrl;
      logoUrl = `${base}${logoUrl}`;
    }

    return sendResponse(res, 200, true, 'Widget config fetched', {
      config: {
        displayName: (widget as any).displayName,
        backgroundColor: (widget as any).backgroundColor,
        logoUrl,
      },
    });
  } catch (error: any) {
    return sendError(res, 500, 'Failed to fetch widget config: ' + error.message);
  }
});

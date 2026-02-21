import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "@shared/utils/auth";
import { sendError } from "@shared/utils/response";
import { User } from "@shared/models";
import jwt from "jsonwebtoken";
import config from "@shared/config";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    teams: string[];
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      sendError(res, 401, "Access token is required");
      return;
    }

    const decoded = verifyToken(token, "access") as JWTPayload;
    if (!decoded || !decoded.userId || !decoded.email || !decoded.role) {
      sendError(res, 401, "Invalid access token");
      return;
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      sendError(res, 401, "Invalid token or user not found");
      return;
    }

    await User.findByIdAndUpdate(
      decoded.userId,
      { lastSeen: new Date() },
      { timestamps: false },
    );

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      teams: user.teams.map(String),
    };

    next();
  } catch (error) {
    sendError(res, 401, "Invalid or expired token");
  }
};

export const auth = authenticate;

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({ success: false, message: "Access denied - insufficient permissions" });
      return;
    }

    next();
  };
};

export const authenticateWidget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      sendError(res, 401, "Widget access token is required");
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret!) as any;

    if (!decoded || decoded.type !== "widget_session") {
      sendError(res, 401, "Invalid widget access token");
      return;
    }

    next();
  } catch (error: any) {
    sendError(res, 401, "Invalid widget access token");
  }
};

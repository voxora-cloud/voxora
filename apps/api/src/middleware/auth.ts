import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "../utils/auth";
import { sendError } from "../utils/response";
import { User } from "../models";
import jwt from "jsonwebtoken";
import config from "../config";

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
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      console.log("No access token provided");
      sendError(res, 401, "Access token is required");
      return;
    }

    const decoded = verifyToken(token, "access") as JWTPayload;
    if (!decoded || !decoded.userId || !decoded.email || !decoded.role) {
      console.log("Invalid token payload");
      sendError(res, 401, "Invalid access token");
      return;
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select("-password");
    console.log(
      `Authenticated user: ${decoded.userId} with role: ${decoded.role}`,
    );
    console.log(`User active status: ${user?.isActive}`);
    if (!user || !user.isActive) {
      sendError(res, 401, "Invalid token or user not found");
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    sendError(res, 401, "Invalid or expired token");
  }
};

// Alias for authenticate to match route expectations
export const auth = authenticate;

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    console.log("Authorizing user:", user);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied - insufficient permissions",
      });
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
      console.log("No widget token provided");
      sendError(res, 401, "Widget access token is required");
      return;
    }

    // Verify widget token
    const decoded = jwt.verify(token, config.jwt.secret!) as any;

    if (!decoded || decoded.type !== "widget_session") {
      console.log("Invalid widget token payload");
      sendError(res, 401, "Invalid widget access token");
      return;
    }

    console.log(
      `Authenticated widget session: ${decoded.sessionId} for key: ${decoded.publicKey}`,
    );
    next();
  } catch (error: any) {
    console.error("Widget authentication error:", error.message);
    sendError(res, 401, "Invalid widget access token");
  }
};

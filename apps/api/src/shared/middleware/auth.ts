import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "@shared/utils/auth";
import { sendError } from "@shared/utils/response";
import { User, Membership, Organization, MembershipRole } from "@shared/models";
import jwt from "jsonwebtoken";
import config from "@shared/config";

// ─────────────── Augmented Request Type ───────────────

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    activeOrganizationId: string;
    orgRole: MembershipRole;
  };
}

// ─────────────── requireAuth ───────────────

/**
 * Validates the JWT, verifies the user exists, then loads the Membership
 * for the active organization so downstream middleware/controllers can
 * safely access req.user.orgRole and req.user.activeOrganizationId.
 */
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
    if (!decoded || !decoded.userId || !decoded.email || !decoded.activeOrganizationId) {
      sendError(res, 401, "Invalid access token");
      return;
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      sendError(res, 401, "Invalid token or user not found");
      return;
    }

    let orgRole: MembershipRole | undefined;

    if (decoded.activeOrganizationId !== "pending") {
      // Resolve the membership for the active org
      const membership = await Membership.findOne({
        userId: decoded.userId,
        organizationId: decoded.activeOrganizationId,
        inviteStatus: "active",
      });

      if (!membership) {
        sendError(res, 403, "You are not a member of this organization");
        return;
      }
      orgRole = membership.role;
    }

    // Update lastSeen (non-blocking)
    User.findByIdAndUpdate(decoded.userId, { lastSeen: new Date() }, { timestamps: false }).exec();

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      activeOrganizationId: decoded.activeOrganizationId,
      orgRole: orgRole as MembershipRole, // may be undefined for pending
    };

    next();
  } catch (error) {
    sendError(res, 401, "Invalid or expired token");
  }
};

export const auth = authenticate;

// ─────────────── resolveOrganization ───────────────

/**
 * Validates that the active organization in the JWT is real and active.
 * Run this AFTER authenticate when an org context is needed.
 */
export const resolveOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { activeOrganizationId } = (req as AuthenticatedRequest).user;
    const org = await Organization.findById(activeOrganizationId);

    if (!org || !org.isActive) {
      sendError(res, 404, "Organization not found or inactive");
      return;
    }

    next();
  } catch (error) {
    sendError(res, 500, "Failed to resolve organization");
  }
};

// ─────────────── requireRole RBAC ───────────────

/**
 * Role hierarchy: owner > admin > agent
 *
 * requireRole('admin') allows owner and admin.
 * requireRole('owner') allows only owner.
 * requireRole('agent') allows all roles.
 */

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  owner: 3,
  admin: 2,
  agent: 1,
};

export const requireRole = (...roles: MembershipRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { orgRole } = (req as AuthenticatedRequest).user ?? {};

    if (!orgRole) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[orgRole] ?? 0;
    const minRequired = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] ?? 99));

    if (userLevel < minRequired) {
      res.status(403).json({ success: false, message: "Access denied – insufficient permissions" });
      return;
    }

    next();
  };
};

// ─────────────── Legacy authorize (kept for backward compat) ───────────────

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { orgRole } = (req as AuthenticatedRequest).user ?? {};
    if (!orgRole || !roles.includes(orgRole)) {
      res.status(403).json({ success: false, message: "Access denied – insufficient permissions" });
      return;
    }
    next();
  };
};

// ─────────────── Widget auth (unchanged) ───────────────

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

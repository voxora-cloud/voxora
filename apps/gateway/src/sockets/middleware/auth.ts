import jwt from "jsonwebtoken";
import { User, Membership } from "@shared/models";
import config from "@shared/infra/config";

export const authMiddleware = async (socket: any, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, config.jwt.secret!) as any;

    if (decoded.type === "widget_session") {
      // Widget Connection
      socket.data.user = {
        isWidget: true,
        orgId: decoded.organizationId,
        widgetKey: decoded.InteraOnePublicKey || decoded.publicKey || null,
        userId: socket.id,
      };
      return next();
    }

    // Agent Connection
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return next(new Error("Authentication error: Invalid user"));
    }

    const orgId = decoded.activeOrganizationId;
    if (!orgId) {
      return next(new Error("Authentication error: No active organization"));
    }

    const membership = await Membership.findOne({
      userId: decoded.userId,
      organizationId: orgId,
      inviteStatus: "accepted",
    });

    if (!membership) {
      return next(new Error("Authentication error: Not a member of this organization"));
    }

    socket.data.user = {
      isWidget: false,
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      orgId,
      orgRole: membership.role,
    };

    // Update lastSeen
    await User.findByIdAndUpdate(
      user._id,
      { lastSeen: new Date() },
      { timestamps: false },
    );

    next();
  } catch (err: any) {
    next(new Error(`Authentication error: ${err.message}`));
  }
};

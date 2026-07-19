import { Organization } from "@shared/models";
import { isQuotaExhausted } from "../../shared/security/middleware/rate-limit";

export const subscriptionMiddleware = async (socket: any, next: (err?: Error) => void) => {
  const user = socket.data.user;
  if (!user || !user.orgId) {
    return next();
  }

  try {
    const org = await Organization.findById(user.orgId)
      .select("subscriptionStatus")
      .lean();

    const isSubExpired = org
      ? org.subscriptionStatus !== null &&
        org.subscriptionStatus !== undefined &&
        org.subscriptionStatus !== "active"
      : false;

    const isExhausted = await isQuotaExhausted(user.orgId.toString());

    user.subscriptionExpired = isSubExpired || isExhausted;

    next();
  } catch (err: any) {
    next(new Error(`Subscription check failed: ${err.message}`));
  }
};

import { Organization } from "@shared/models";

export const subscriptionMiddleware = async (socket: any, next: (err?: Error) => void) => {
  const user = socket.data.user;
  if (!user || !user.orgId) {
    return next();
  }

  try {
    const org = await Organization.findById(user.orgId)
      .select("subscriptionStatus")
      .lean();

    user.subscriptionExpired = org
      ? org.subscriptionStatus !== null &&
        org.subscriptionStatus !== undefined &&
        org.subscriptionStatus !== "active"
      : false;

    next();
  } catch (err: any) {
    next(new Error(`Subscription check failed: ${err.message}`));
  }
};

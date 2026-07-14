import { User } from "@shared/models";
import logger from "@shared/core/logger";

export async function updateUserStatus(
  userId: string,
  status: string,
): Promise<void> {
  try {
    await User.findByIdAndUpdate(userId, { status, lastSeen: new Date() });
  } catch (error) {
    logger.error("Error updating user status in DB:", error);
  }
}

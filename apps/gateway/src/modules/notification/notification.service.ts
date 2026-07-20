import { Notification } from "@shared/models";
import { socketService } from "@sockets/services/socket.service";
import { CreateNotificationInput } from "./notification.types";

class NotificationService {
  async create(input: CreateNotificationInput) {
    const notification = await Notification.create({
      organizationId: input.organizationId,
      ...(input.userId ? { userId: input.userId } : {}),
      type: input.type,
      title: input.title,
      description: input.description,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });

    const payload = {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      description: notification.description,
      timestamp: notification.createdAt,
      metadata: notification.metadata,
    };

    if (input.userId) {
      await socketService.emitToUser(input.userId, "notification", payload);
    } else {
      socketService.emitToOrg(input.organizationId, "notification", payload);
    }

    return notification;
  }

  async getNotifications(organizationId: string, userId: string) {
    // Fetch org-wide and user-specific notifications
    const notifications = await Notification.find({
      organizationId,
      $or: [{ userId: null }, { userId }],
    })
      .select("-isRead")
      .sort({ createdAt: -1 })
      .lean();

    return notifications;
  }

}

export default new NotificationService();

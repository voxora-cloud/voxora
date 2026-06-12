import { INotification, Notification } from "@shared/models";
import { getSocketManager } from "@sockets/index";

type CreateNotificationInput = {
  organizationId: string;
  userId?: string;
  type: INotification["type"];
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

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
      isRead: notification.isRead,
      metadata: notification.metadata,
    };

    if (input.userId) {
      await getSocketManager()?.emitToUser(input.userId, "notification", payload);
    } else {
      getSocketManager()?.emitToOrg(input.organizationId, "notification", payload);
    }

    return notification;
  }

  async getNotifications(organizationId: string, userId: string, limit = 50) {
    // Fetch org-wide and user-specific notifications
    const notifications = await Notification.find({
      organizationId,
      $or: [{ userId: { $exists: false } }, { userId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications;
  }

  async markAsRead(organizationId: string, userId: string, notificationId: string) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, organizationId, $or: [{ userId: { $exists: false } }, { userId }] },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(organizationId: string, userId: string) {
    return Notification.updateMany(
      { organizationId, $or: [{ userId: { $exists: false } }, { userId }], isRead: false },
      { isRead: true }
    );
  }
}

export default new NotificationService();

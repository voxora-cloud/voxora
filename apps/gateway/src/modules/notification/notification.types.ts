import { INotification } from "@shared/models";

export type CreateNotificationInput = {
  organizationId: string;
  userId?: string;
  type: INotification["type"];
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

import { apiClient } from "@/shared/lib/api-client";
import type {
  ChannelListResponse,
  ChannelResponse,
  VerifyChannelResponse,
} from "../types/types";

export interface CreateEmailChannelPayload {
  name: string;
  email?: string;
  domain: string;
}

export interface CreateWhatsAppChannelPayload {
  name: string;
  phoneNumber: string;
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
}

export interface CreateTelegramChannelPayload {
  name: string;
  botToken: string;
}

export const channelsApi = {
  /** List all channels for the active org */
  listChannels: () =>
    apiClient.get<ChannelListResponse>("/channels"),

  /** Create + provision the email channel */
  createEmailChannel: (payload: CreateEmailChannelPayload) =>
    apiClient.post<ChannelResponse>("/channels/email", payload),

  /** Create + provision the WhatsApp channel (BYOK) */
  createWhatsAppChannel: (payload: CreateWhatsAppChannelPayload) =>
    apiClient.post<ChannelResponse>("/channels/whatsapp", payload),

  /** Create + provision the Telegram channel */
  createTelegramChannel: (payload: CreateTelegramChannelPayload) =>
    apiClient.post<ChannelResponse>("/channels/telegram", payload),

  /** Re-trigger Resend/SES domain verification */
  verifyChannel: (channelId: string) =>
    apiClient.post<VerifyChannelResponse>(`/channels/${channelId}/verify`),

  /** Update email channel addresses */
  updateEmailChannelAddresses: (channelId: string, emails: string[]) =>
    apiClient.patch<ChannelResponse>(`/channels/${channelId}/email/addresses`, { emails }),

  /** Delete a channel */
  deleteChannel: (channelId: string) =>
    apiClient.delete<{ success: boolean }>(`/channels/${channelId}`),
};

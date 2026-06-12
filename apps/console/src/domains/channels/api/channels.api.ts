import { apiClient } from "@/shared/lib/api-client";
import type {
  ChannelListResponse,
  ChannelResponse,
  VerifyChannelResponse,
} from "../types/channel.types";

export interface CreateEmailChannelPayload {
  name: string;
  email: string;
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

  /** Get the org's email channel */
  getEmailChannel: () =>
    apiClient.get<ChannelResponse>("/channels/email"),

  /** Get the org's WhatsApp channel */
  getWhatsAppChannel: () =>
    apiClient.get<ChannelResponse>("/channels/whatsapp"),

  /** Get the org's Telegram channel */
  getTelegramChannel: () =>
    apiClient.get<ChannelResponse>("/channels/telegram"),

  /** Get the org's Instagram channel */
  getInstagramChannel: () =>
    apiClient.get<ChannelResponse>("/channels/instagram"),

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

  /** Delete a channel */
  deleteChannel: (channelId: string) =>
    apiClient.delete<{ success: boolean }>(`/channels/${channelId}`),
};

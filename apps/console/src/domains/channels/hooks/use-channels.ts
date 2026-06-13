import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "../api/channels.api";
import type { CreateEmailChannelPayload, CreateWhatsAppChannelPayload, CreateTelegramChannelPayload } from "../api/channels.api";

const CHANNEL_KEY = ["channels", "email"];
const WHATSAPP_CHANNEL_KEY = ["channels", "whatsapp"];
const TELEGRAM_CHANNEL_KEY = ["channels", "telegram"];

export const useEmailChannel = () => {
  return useQuery({
    queryKey: CHANNEL_KEY,
    queryFn: () => channelsApi.getEmailChannel(),
    select: (res) => res.data?.channel,
    retry: (failureCount, error: any) => {
      // 404 means no channel yet — don't retry
      if (error?.message?.includes("404") || error?.message?.includes("No email channel")) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateEmailChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmailChannelPayload) =>
      channelsApi.createEmailChannel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNEL_KEY });
    },
  });
};

export const useWhatsAppChannel = () => {
  return useQuery({
    queryKey: WHATSAPP_CHANNEL_KEY,
    queryFn: () => channelsApi.getWhatsAppChannel(),
    select: (res) => res.data?.channel,
    retry: (failureCount, error: any) => {
      // 404 means no channel yet — don't retry
      if (error?.message?.includes("404") || error?.message?.includes("No WhatsApp channel")) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateWhatsAppChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWhatsAppChannelPayload) =>
      channelsApi.createWhatsAppChannel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WHATSAPP_CHANNEL_KEY });
    },
  });
};

export const useTelegramChannel = () => {
  return useQuery({
    queryKey: TELEGRAM_CHANNEL_KEY,
    queryFn: () => channelsApi.getTelegramChannel(),
    select: (res) => res.data?.channel,
    retry: (failureCount, error: any) => {
      // 404 means no channel yet — don't retry
      if (error?.message?.includes("404") || error?.message?.includes("No Telegram channel")) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useCreateTelegramChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTelegramChannelPayload) =>
      channelsApi.createTelegramChannel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELEGRAM_CHANNEL_KEY });
    },
  });
};


export const useVerifyChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => channelsApi.verifyChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNEL_KEY });
    },
  });
};

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => channelsApi.deleteChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNEL_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_CHANNEL_KEY });
      queryClient.invalidateQueries({ queryKey: TELEGRAM_CHANNEL_KEY });
    },
  });
};

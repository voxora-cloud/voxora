import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authApi } from "@/domains/auth/api/auth.api";
import { channelsApi } from "../api/channels.api";
import type {
  CreateEmailChannelPayload,
  CreateTelegramChannelPayload,
  CreateWhatsAppChannelPayload,
} from "../api/channels.api";
import type { Channel, ChannelListResponse } from "../types/types";

const getChannelScope = () => authApi.getActiveOrgId() || "unknown";

export const channelKeys = {
  all: ["channels"] as const,
  list: (scope: string) => [...channelKeys.all, "list", scope] as const,
};

const channelListQuery = (scope: string) => ({
  queryKey: channelKeys.list(scope),
  queryFn: () => channelsApi.listChannels(),
  staleTime: 30 * 1000,
  refetchOnWindowFocus: true,
});

const upsertCachedChannel = (
  queryClient: QueryClient,
  scope: string,
  channel: Channel,
) => {
  queryClient.setQueryData<ChannelListResponse>(channelKeys.list(scope), (current) => {
    const channels = current?.data?.channels ?? [];
    const exists = channels.some((item) => item._id === channel._id);
    const nextChannels = exists
      ? channels.map((item) => (item._id === channel._id ? channel : item))
      : [...channels, channel];

    return {
      success: true,
      data: { channels: nextChannels },
    };
  });
};

const removeCachedChannel = (
  queryClient: QueryClient,
  scope: string,
  channelId: string,
) => {
  queryClient.setQueryData<ChannelListResponse>(channelKeys.list(scope), (current) => {
    if (!current) return current;
    return {
      ...current,
      data: {
        ...current.data,
        channels: current.data.channels.filter((channel) => channel._id !== channelId),
      },
    };
  });
};

const invalidateChannelList = (queryClient: QueryClient, scope: string) =>
  queryClient.invalidateQueries({ queryKey: channelKeys.list(scope) });

export const useChannels = () => {
  const scope = getChannelScope();
  return useQuery({
    ...channelListQuery(scope),
    select: (response) => response.data?.channels ?? [],
  });
};

const useChannelByType = (type: Channel["type"]) => {
  const scope = getChannelScope();
  return useQuery({
    ...channelListQuery(scope),
    select: (response) => response.data?.channels.find((channel) => channel.type === type),
  });
};

export const useEmailChannel = () => useChannelByType("email");

export const useWhatsAppChannel = () => useChannelByType("whatsapp");

export const useTelegramChannel = () => useChannelByType("telegram");

export const useCreateEmailChannel = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: (payload: CreateEmailChannelPayload) => channelsApi.createEmailChannel(payload),
    onSuccess: (response) => {
      if (response.data?.channel) {
        upsertCachedChannel(queryClient, scope, response.data.channel);
      }
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

export const useCreateWhatsAppChannel = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: (payload: CreateWhatsAppChannelPayload) =>
      channelsApi.createWhatsAppChannel(payload),
    onSuccess: (response) => {
      if (response.data?.channel) {
        upsertCachedChannel(queryClient, scope, response.data.channel);
      }
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

export const useCreateTelegramChannel = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: (payload: CreateTelegramChannelPayload) =>
      channelsApi.createTelegramChannel(payload),
    onSuccess: (response) => {
      if (response.data?.channel) {
        upsertCachedChannel(queryClient, scope, response.data.channel);
      }
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

export const useVerifyChannel = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: (channelId: string) => channelsApi.verifyChannel(channelId),
    onSuccess: (response, channelId) => {
      queryClient.setQueryData<ChannelListResponse>(channelKeys.list(scope), (current) => {
        if (!current) return current;
        return {
          ...current,
          data: {
            ...current.data,
            channels: current.data.channels.map((channel) => {
              if (channel._id !== channelId || !channel.config.email) return channel;
              return {
                ...channel,
                config: {
                  ...channel.config,
                  email: {
                    ...channel.config.email,
                    verificationStatus: response.data.status,
                    dnsRecords: response.data.dnsRecords,
                  },
                },
              };
            }),
          },
        };
      });
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: (channelId: string) => channelsApi.deleteChannel(channelId),
    onSuccess: (_response, channelId) => {
      removeCachedChannel(queryClient, scope, channelId);
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

export const useUpdateEmailChannelAddresses = () => {
  const queryClient = useQueryClient();
  const scope = getChannelScope();

  return useMutation({
    mutationFn: ({ channelId, emails }: { channelId: string; emails: string[] }) =>
      channelsApi.updateEmailChannelAddresses(channelId, emails),
    onSuccess: (response) => {
      if (response.data?.channel) {
        upsertCachedChannel(queryClient, scope, response.data.channel);
      }
    },
    onSettled: () => invalidateChannelList(queryClient, scope),
  });
};

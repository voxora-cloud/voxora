import { Channel, ChannelPromptConfig } from "../types";
import { widgetConfig } from "./widget";
import { emailConfig } from "./email";
import { chatMessengerConfig } from "../visitor-info/chatMessenger";

const channelConfigs: Record<Channel, ChannelPromptConfig> = {
    widget: widgetConfig,
    email: emailConfig,
    whatsapp: chatMessengerConfig,
    telegram: chatMessengerConfig,
};

/** Widget is the default: it's the richest/most common surface and a safe fallback when `channel` is omitted. */
export function getChannelConfig(channel?: Channel): ChannelPromptConfig {
    if (!channel) return widgetConfig;
    return channelConfigs[channel];
}
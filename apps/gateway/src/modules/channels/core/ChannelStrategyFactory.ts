import { ChannelType } from "@shared/models/Channel";
import { IChannelStrategy } from "./IChannelStrategy";
import { EmailChannelStrategy } from "../strategies/EmailChannelStrategy";
import { WhatsAppChannelStrategy } from "../strategies/WhatsAppChannelStrategy";
import { TelegramChannelStrategy } from "../strategies/TelegramChannelStrategy";
import { InstagramChannelStrategy } from "../strategies/InstagramChannelStrategy";
import { SesAdapter } from "../adapters/SesAdapter";

/**
 * Factory Pattern: creates the correct IChannelStrategy for a given channel type.
 *
 * Adding a new channel type:
 *  1. Create a new strategy class in strategies/
 *  2. Register it in the switch below
 *  3. That's it — ChannelService and all callers remain unchanged
 */
export class ChannelStrategyFactory {
  static create(type: ChannelType): IChannelStrategy {
    switch (type) {
      case "email":
        return new EmailChannelStrategy(new SesAdapter());

      case "whatsapp":
        return new WhatsAppChannelStrategy();

      case "telegram":
        return new TelegramChannelStrategy();

      case "instagram":
        return new InstagramChannelStrategy();

      default:
        throw new Error(`ChannelStrategyFactory: unknown channel type "${type}"`);
    }
  }
}

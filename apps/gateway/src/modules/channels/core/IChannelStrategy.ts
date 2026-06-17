import { IChannelConfig, ChannelType } from "@shared/models/Channel";

// ─── Input/Output shapes shared across strategies ───────────────────────────

export interface ProvisionResult {
  success: boolean;
  /** Updated config to persist back to the Channel document */
  updatedConfig: IChannelConfig;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  status: "pending" | "verified" | "failed";
  /** Updated config (e.g. verifiedAt timestamp) to persist */
  updatedConfig?: Partial<IChannelConfig>;
  error?: string;
}

export interface SendMessageInput {
  /** Recipient address / phone / chat-id depending on channel type */
  to: string;
  subject?: string;
  /** Plain-text body */
  body: string;
  /** Optional HTML body (email only) */
  html?: string;
  /** Reply-to header (email only) */
  replyTo?: string;
  /** Optional from email address (email only) */
  from?: string;
  channelConfig: IChannelConfig;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface InboundPayload {
  raw: unknown;
  channelId: string;
}

export interface InboundResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

// ─── Strategy interface ──────────────────────────────────────────────────────

/**
 * Every communication channel (email, whatsapp, telegram …) implements this
 * interface. The ChannelService (context) programs to this abstraction.
 */
export interface IChannelStrategy {
  readonly type: ChannelType;

  /**
   * Register/provision this channel with its provider.
   * For email: verify the domain with AWS SES and return the DNS records to show.
   */
  provision(channelId: string, config: IChannelConfig): Promise<ProvisionResult>;

  /**
   * Re-poll the provider to check current verification status.
   */
  checkVerification(
    channelId: string,
    config: IChannelConfig,
  ): Promise<VerificationResult>;

  /**
   * Send an outgoing message through this channel.
   */
  send(input: SendMessageInput): Promise<SendResult>;

  /**
   * Parse and process an inbound webhook payload from the provider.
   * Should create/update a Conversation and Message in the database.
   */
  handleInbound(payload: InboundPayload): Promise<InboundResult>;

  /**
   * Tear-down: remove domain / deregister from provider.
   */
  deprovision(channelId: string, config: IChannelConfig): Promise<void>;
}

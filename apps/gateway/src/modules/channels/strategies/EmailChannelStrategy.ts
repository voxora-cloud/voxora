import {
  IChannelStrategy,
  ProvisionResult,
  VerificationResult,
  SendMessageInput,
  SendResult,
  InboundPayload,
  InboundResult,
} from "../core/IChannelStrategy";
import { IEmailProviderAdapter } from "../core/IEmailProviderAdapter";
import { IChannelConfig, Channel } from "@shared/models/Channel";
import { Conversation, Message, Contact } from "@shared/models";
import logger from "@shared/core/logger";
import { Types } from "mongoose";
import { simpleParser } from "mailparser";
import { parseMarkdown } from "@shared/utils/markdown";

/**
 * Concrete Strategy for the Email channel.
 * Uses IEmailProviderAdapter (injected) for all provider-specific calls,
 * keeping this class provider-agnostic.
 */
export class EmailChannelStrategy implements IChannelStrategy {
  readonly type = "email" as const;

  constructor(private readonly adapter: IEmailProviderAdapter) {}

  // ─── Provision ─────────────────────────────────────────────────────────────

  async provision(channelId: string, config: IChannelConfig): Promise<ProvisionResult> {
    const emailCfg = config.email;
    if (!emailCfg) {
      return { success: false, updatedConfig: config, error: "Missing email config" };
    }

    try {
      const { domainId, dnsRecords, status } = await this.adapter.addDomain({
        domain: emailCfg.domain,
      });

      const statusMap: Record<string, "pending" | "verified" | "failed"> = {
        verified: "verified",
        pending: "pending",
        failed: "failed",
        not_started: "pending",
        temporary_failure: "failed",
      };
      const initialStatus = status ? (statusMap[status] ?? "pending") : "pending";

      const updatedConfig: IChannelConfig = {
        ...config,
        email: {
          ...emailCfg,
          providerDomainId: domainId,
          dnsRecords,
          verificationStatus: initialStatus,
          verifiedAt: initialStatus === "verified" ? new Date() : undefined,
        },
      };

      return { success: true, updatedConfig };
    } catch (err: any) {
      logger.error("[EmailChannelStrategy] Provision failed", {
        channelId,
        error: err?.message,
      });
      return {
        success: false,
        updatedConfig: config,
        error: err?.message || "Failed to provision email channel",
      };
    }
  }

  // ─── Verify ────────────────────────────────────────────────────────────────

  async checkVerification(
    channelId: string,
    config: IChannelConfig,
  ): Promise<VerificationResult> {
    const emailCfg = config.email;
    if (!emailCfg?.providerDomainId) {
      return {
        success: false,
        status: "failed",
        error: "Domain not provisioned yet. Please create the channel first.",
      };
    }

    try {
      const result = await this.adapter.verifyDomain(emailCfg.providerDomainId);

      const updatedEmailConfig = {
        ...emailCfg,
        verificationStatus: result.status,
        dnsRecords: result.dnsRecords ?? emailCfg.dnsRecords,
        verifiedAt: result.verified ? new Date() : emailCfg.verifiedAt,
      };

      return {
        success: true,
        status: result.status,
        updatedConfig: { email: updatedEmailConfig },
      };
    } catch (err: any) {
      logger.error("[EmailChannelStrategy] Verification check failed", {
        channelId,
        error: err?.message,
      });
      return {
        success: false,
        status: "failed",
        error: err?.message || "Failed to check domain verification",
      };
    }
  }

  // ─── Send ──────────────────────────────────────────────────────────────────

  async send(input: SendMessageInput): Promise<SendResult> {
    const emailCfg = input.channelConfig.email;
    if (!emailCfg) {
      return { success: false, error: "No email config on channel" };
    }
    if (emailCfg.verificationStatus !== "verified") {
      return { success: false, error: "Domain is not verified. Cannot send email." };
    }

    try {
      const fromAddress = input.from || emailCfg.address;
      if (!fromAddress) {
        return { success: false, error: "Create an email address before sending email." };
      }
      const parsedHtml = parseMarkdown(input.body);
      const emailHtml = input.html ?? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${parsedHtml}
        </div>
      `.trim();

      const { messageId } = await this.adapter.sendEmail({
        from: fromAddress,
        to: input.to,
        subject: input.subject ?? "(No Subject)",
        html: emailHtml,
        text: input.body,
        replyTo: input.replyTo,
      });

      return { success: true, messageId };
    } catch (err: any) {
      logger.error("[EmailChannelStrategy] Send failed", { error: err?.message });
      return { success: false, error: err?.message || "Failed to send email" };
    }
  }

  // ─── Inbound ───────────────────────────────────────────────────────────────

  async handleInbound(payload: InboundPayload): Promise<InboundResult> {
    try {
      const data = payload.raw as any;

      let fromEmail = "";
      let subject = "(No Subject)";
      let bodyHtml = "";
      let bodyText = "";
      let toEmail = "";

      if (data.content) {
        // SES provides the raw email as a Base64-encoded MIME string
        const rawMime = Buffer.from(data.content, "base64").toString("utf-8");
        const parsed = await simpleParser(rawMime);

        const fromText = parsed.from?.text || data.mail?.source || "";
        const emailMatch = fromText.match(/<([^>]+)>/);
        fromEmail = emailMatch ? emailMatch[1].trim() : fromText.trim();

        if (!fromEmail && parsed.from?.value?.[0]?.address) {
          fromEmail = parsed.from.value[0].address.trim();
        }

        subject = parsed.subject?.trim() || data.mail?.commonHeaders?.subject || "(No Subject)";
        bodyHtml = parsed.html || "";
        bodyText = parsed.text || bodyHtml.replace(/<[^>]+>/g, "") || "";

        const parsedTo = parsed.to as any;
        if (parsedTo) {
          const toAddresses = Array.isArray(parsedTo)
            ? parsedTo
            : (parsedTo.value || []);
          toEmail = toAddresses[0]?.address?.trim().toLowerCase() || "";
        }
      } else if (data.mail) {
        // Fallback for SES notifications without content body (headers only)
        fromEmail = data.mail.source?.trim() || "";
        subject = data.mail.commonHeaders?.subject || "(No Subject)";
        bodyHtml = "";
        bodyText = "";
      } else {
        // Fallback/mock check: if they send data.from, data.subject, data.text/html (like the old Resend payload)
        fromEmail = data.from?.trim() || "";
        subject = data.subject?.trim() || "(No Subject)";
        bodyHtml = data.html || "";
        bodyText = data.text || bodyHtml.replace(/<[^>]+>/g, "");
        toEmail = data.to?.trim().toLowerCase() || "";
      }

      if (!toEmail && data.mail?.destination) {
        toEmail = Array.isArray(data.mail.destination)
          ? data.mail.destination[0]?.trim().toLowerCase()
          : data.mail.destination.trim().toLowerCase();
      }

      // Look up the channel to get the organizationId
      const channel = await Channel.findById(payload.channelId).lean();
      if (!channel) {
        logger.warn("[EmailChannelStrategy] Inbound: channel not found", {
          channelId: payload.channelId,
        });
        return { success: false, error: "Channel not found" };
      }

      const organizationId = channel.organizationId;
      const emailConfig = channel.config.email;
      const addresses = emailConfig?.addresses?.length
        ? emailConfig.addresses
        : emailConfig?.address
          ? [emailConfig.address]
          : [];
      const supportEmail = toEmail && addresses.includes(toEmail)
        ? toEmail
        : (emailConfig?.address || "");

      // Find or create a Conversation for this inbound email thread.
      // Resolve contact by email, or fall back to email-sessionId
      const contactDoc = await Contact.findOne({ organizationId, email: fromEmail }).lean();
      const sessionId = contactDoc?.sessionId || `email-${fromEmail}`;

      let conversation = await Conversation.findOne({
        organizationId,
        sessionId,
        status: { $in: ["open", "pending"] },
        $or: [
          { channel: "email_channel", channelId: payload.channelId },
          { "metadata.channel": "email_channel", "metadata.channelId": payload.channelId }
        ],
      });

      if (!conversation) {
        // Build a minimal system user ID for createdBy (system placeholder)
        const systemId = new Types.ObjectId("000000000000000000000000");

        conversation = await Conversation.create({
          organizationId,
          participants: [],
          subject,
          status: "open",
          priority: "medium",
          createdBy: systemId,
          tags: ["email"],
          channel: "email_channel",
          channelId: payload.channelId,
          metadata: {
            supportEmail,
          },
          sessionId,
        });

        logger.info("[EmailChannelStrategy] Created new conversation for inbound email", {
          conversationId: conversation._id.toString(),
          from: fromEmail,
          channelId: payload.channelId,
        });
      } else {
        // Update supportEmail to the latest one they emailed if it is one of our configured addresses
        if (supportEmail && conversation.metadata?.supportEmail !== supportEmail) {
          conversation.metadata = {
            ...conversation.metadata,
            supportEmail,
          };
          await Conversation.updateOne(
            { _id: conversation._id },
            { $set: { "metadata.supportEmail": supportEmail } }
          );
        }
      }

      // Add the inbound email as a visitor message
      const message = await Message.create({
        conversationId: conversation._id,
        organizationId,
        senderId: fromEmail,
        type: "text" as const,
        content: bodyText,
        metadata: {
          source: "email_channel",
          channelId: payload.channelId,
          subject,
          htmlBody: bodyHtml,
        },
      });

      return {
        success: true,
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
      };
    } catch (err: any) {
      logger.error("[EmailChannelStrategy] handleInbound failed", {
        channelId: payload.channelId,
        error: err?.message,
      });
      return { success: false, error: err?.message || "Failed to process inbound email" };
    }
  }

  // ─── Deprovision ───────────────────────────────────────────────────────────

  async deprovision(channelId: string, config: IChannelConfig): Promise<void> {
    const domainId = config.email?.providerDomainId;
    if (!domainId) return;

    try {
      await this.adapter.removeDomain(domainId);
      logger.info("[EmailChannelStrategy] Domain removed from SES", {
        channelId,
        domainId,
      });
    } catch (err: any) {
      logger.warn("[EmailChannelStrategy] Deprovision: could not remove domain", {
        channelId,
        domainId,
        error: err?.message,
      });
    }
  }
}

import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  SendEmailCommand,
  NotFoundException,
} from "@aws-sdk/client-sesv2";
import config from "@shared/infra/config";
import logger from "@shared/core/logger";
import {
  IEmailProviderAdapter,
  AddDomainParams,
  AddDomainResult,
  DomainStatusResult,
  VerifyDomainResult,
  SendEmailParams,
  SendEmailResult,
} from "../core/IEmailProviderAdapter";
import { IDnsRecord } from "@shared/models/Channel";

// ─── SES DKIM status → our canonical status ──────────────────────────────────

const DKIM_STATUS_MAP: Record<string, "pending" | "verified" | "failed"> = {
  PENDING: "pending",
  SUCCESS: "verified",
  FAILED: "failed",
  TEMPORARY_FAILURE: "failed",
  NOT_STARTED: "pending",
};

/**
 * Adapter that wraps the AWS SESv2 SDK.
 * All SES-specific logic is isolated here — the EmailChannelStrategy
 * only knows about IEmailProviderAdapter.
 *
 * Domain identity in SES is keyed by the domain string itself
 * (e.g. "acme.com"), so we store the domain as the providerDomainId.
 * Verification happens automatically once DKIM CNAME records propagate.
 */
export class SesAdapter implements IEmailProviderAdapter {
  private client: SESv2Client;

  constructor() {
    const { region, accessKeyId, secretAccessKey } = config.aws;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for the Email Channel feature",
      );
    }

    this.client = new SESv2Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  // ─── addDomain ─────────────────────────────────────────────────────────────

  async addDomain(params: AddDomainParams): Promise<AddDomainResult> {
    // Attempt to create the SES email identity for this domain.
    // If it already exists, SES throws AlreadyExistsException.
    try {
      await this.client.send(
        new CreateEmailIdentityCommand({
          EmailIdentity: params.domain,
          DkimSigningAttributes: {
            NextSigningKeyLength: "RSA_2048_BIT",
          },
        }),
      );
      logger.info("[SesAdapter] Created SES email identity", { domain: params.domain });
    } catch (err: any) {
      const isAlreadyExists =
        err.name === "AlreadyExistsException" ||
        err.__type === "AlreadyExistsException" ||
        err.message?.toLowerCase().includes("already exists");

      if (!isAlreadyExists) {
        logger.error("[SesAdapter] Failed to create SES identity", {
          domain: params.domain,
          error: err.message,
        });
        throw new Error(`SES domain creation failed: ${err.message}`);
      }

      logger.info("[SesAdapter] Domain identity already exists in SES, fetching details", {
        domain: params.domain,
      });
    }

    return this._fetchIdentityDetails(params.domain);
  }

  // ─── getDomainStatus ───────────────────────────────────────────────────────

  async getDomainStatus(domainId: string): Promise<DomainStatusResult> {
    try {
      const identity = await this.client.send(
        new GetEmailIdentityCommand({ EmailIdentity: domainId }),
      );
      const dkimStatus = identity.DkimAttributes?.Status ?? "PENDING";
      return { status: DKIM_STATUS_MAP[dkimStatus] ?? "pending" };
    } catch (err: any) {
      logger.error("[SesAdapter] Failed to get domain status", { domainId, error: err.message });
      throw new Error(`SES domain status check failed: ${err.message}`);
    }
  }

  // ─── verifyDomain ──────────────────────────────────────────────────────────

  async verifyDomain(domainId: string): Promise<VerifyDomainResult> {
    // SES verifies automatically once the user's CNAME records propagate.
    // We simply poll the current DKIM status and return it.
    try {
      const identity = await this.client.send(
        new GetEmailIdentityCommand({ EmailIdentity: domainId }),
      );

      const dkimStatus = identity.DkimAttributes?.Status ?? "PENDING";
      const status = DKIM_STATUS_MAP[dkimStatus] ?? "pending";

      const dnsRecords = this._buildDnsRecords(
        domainId,
        identity.DkimAttributes?.Tokens ?? [],
      );

      return { verified: status === "verified", status, dnsRecords };
    } catch (err: any) {
      logger.error("[SesAdapter] Failed to verify domain", { domainId, error: err.message });
      throw new Error(`SES domain verification failed: ${err.message}`);
    }
  }

  // ─── sendEmail ─────────────────────────────────────────────────────────────

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const response = await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: params.from,
          Destination: { ToAddresses: [params.to] },
          ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
          Content: {
            Simple: {
              Subject: { Data: params.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: params.html, Charset: "UTF-8" },
                ...(params.text
                  ? { Text: { Data: params.text, Charset: "UTF-8" } }
                  : {}),
              },
            },
          },
        }),
      );

      return { messageId: response.MessageId ?? "" };
    } catch (err: any) {
      logger.error("[SesAdapter] Failed to send email", {
        to: params.to,
        error: err.message,
      });
      throw new Error(`SES send failed: ${err.message}`);
    }
  }

  // ─── removeDomain ──────────────────────────────────────────────────────────

  async removeDomain(domainId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteEmailIdentityCommand({ EmailIdentity: domainId }),
      );
      logger.info("[SesAdapter] Removed SES email identity", { domainId });
    } catch (err: any) {
      // 404 (identity not found) is fine — it may have been removed manually
      if (err instanceof NotFoundException) return;
      logger.warn("[SesAdapter] Failed to remove SES email identity", {
        domainId,
        error: err?.message,
      });
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async _fetchIdentityDetails(domain: string): Promise<AddDomainResult> {
    const identity = await this.client.send(
      new GetEmailIdentityCommand({ EmailIdentity: domain }),
    );

    const dkimStatus = identity.DkimAttributes?.Status ?? "PENDING";
    const status = DKIM_STATUS_MAP[dkimStatus] ?? "pending";
    const dnsRecords = this._buildDnsRecords(domain, identity.DkimAttributes?.Tokens ?? []);

    return {
      domainId: domain,   // SES uses the domain name itself as the identity ID
      dnsRecords,
      status,
    };
  }

  /**
   * Converts SES DKIM tokens and region config into the CNAME, MX, and SPF/TXT records.
   */
  private _buildDnsRecords(domain: string, tokens: string[]): IDnsRecord[] {
    const dkimRecords = tokens.map((token) => ({
      type: "CNAME" as const,
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      ttl: 1800,
    }));

    const region = config.aws.region || "us-east-1";
    const mxValue = `10 inbound-smtp.${region}.amazonaws.com`;

    const extraRecords: IDnsRecord[] = [
      {
        type: "MX" as const,
        name: domain,
        value: mxValue,
        ttl: 3600,
      },
      {
        type: "TXT" as const,
        name: domain,
        value: "v=spf1 include:amazonses.com ~all",
        ttl: 3600,
      },
    ];

    return [...dkimRecords, ...extraRecords];
  }
}

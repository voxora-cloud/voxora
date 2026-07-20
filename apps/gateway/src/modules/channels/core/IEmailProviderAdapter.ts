import { IDnsRecord } from "@shared/models/Channel";

// ─── Param shapes ────────────────────────────────────────────────────────────

export interface AddDomainParams {
  domain: string;
}

export interface AddDomainResult {
  domainId: string;
  /** DNS records the user must add to their DNS provider */
  dnsRecords: IDnsRecord[];
  /** Optional verification status of the domain on creation/lookup */
  status?: string;
}

export interface DomainStatusResult {
  status: "pending" | "verified" | "failed";
}

export interface VerifyDomainResult {
  verified: boolean;
  status: "pending" | "verified" | "failed";
  dnsRecords?: IDnsRecord[];
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}

export interface SendEmailResult {
  messageId: string;
}

// ─── Adapter interface ───────────────────────────────────────────────────────

/**
 * Adapter pattern: hides the concrete email provider (AWS SES or any future provider)
 * from the EmailChannelStrategy. Swap out the adapter without touching strategy logic.
 */
export interface IEmailProviderAdapter {
  /**
   * Register a domain with the email provider and get back DNS records
   * the user must add at their DNS registrar.
   */
  addDomain(params: AddDomainParams): Promise<AddDomainResult>;

  /**
   * Check the current verification status of a previously added domain.
   */
  getDomainStatus(domainId: string): Promise<DomainStatusResult>;

  /**
   * Trigger a re-verification attempt. Returns the refreshed status.
   */
  verifyDomain(domainId: string): Promise<VerifyDomainResult>;

  /**
   * Send a transactional/conversational email.
   */
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;

  /**
   * Remove a domain registration from the provider.
   */
  removeDomain(domainId: string): Promise<void>;
}
import {
  IEmailProviderAdapter,
  AddDomainParams,
  AddDomainResult,
  DomainStatusResult,
  VerifyDomainResult,
  SendEmailParams,
  SendEmailResult,
} from "../core/IEmailProviderAdapter";
import logger from "@shared/core/logger";

const RESEND_API_URL = "https://api.resend.com";

export class ResendAdapter implements IEmailProviderAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("[ResendAdapter] RESEND_API_KEY is not defined. Calls will fail.");
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${RESEND_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend API call failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async addDomain(params: AddDomainParams): Promise<AddDomainResult> {
    try {
      const res = await this.request<any>("/domains", {
        method: "POST",
        body: JSON.stringify({ name: params.domain }),
      });

      const dnsRecords = (res.dns_records || []).map((r: any) => ({
        type: r.type,
        name: r.record,
        value: r.value,
        ttl: 3600,
      }));

      return {
        domainId: res.id,
        dnsRecords,
        status: res.status === "verified" ? "verified" : "pending",
      };
    } catch (err: any) {
      logger.error("[ResendAdapter] Failed to add domain", { domain: params.domain, error: err.message });
      throw new Error(`Resend domain creation failed: ${err.message}`);
    }
  }

  async getDomainStatus(domainId: string): Promise<DomainStatusResult> {
    try {
      const res = await this.request<any>(`/domains/${domainId}`);
      const statusMap: Record<string, "pending" | "verified" | "failed"> = {
        verified: "verified",
        pending: "pending",
        failed: "failed",
      };
      return { status: statusMap[res.status] ?? "pending" };
    } catch (err: any) {
      logger.error("[ResendAdapter] Failed to get domain status", { domainId, error: err.message });
      throw new Error(`Resend domain status check failed: ${err.message}`);
    }
  }

  async verifyDomain(domainId: string): Promise<VerifyDomainResult> {
    try {
      const res = await this.request<any>(`/domains/${domainId}/verify`, {
        method: "POST",
      });
      const status = res.status === "verified" ? "verified" : "pending";
      return { verified: status === "verified", status };
    } catch (err: any) {
      logger.error("[ResendAdapter] Failed to verify domain", { domainId, error: err.message });
      throw new Error(`Resend domain verification failed: ${err.message}`);
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const res = await this.request<any>("/emails", {
        method: "POST",
        body: JSON.stringify({
          from: params.from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          reply_to: params.replyTo,
        }),
      });

      return { messageId: res.id || "" };
    } catch (err: any) {
      logger.error("[ResendAdapter] Failed to send email", { to: params.to, error: err.message });
      throw new Error(`Resend send failed: ${err.message}`);
    }
  }

  async removeDomain(domainId: string): Promise<void> {
    try {
      await this.request<any>(`/domains/${domainId}`, {
        method: "DELETE",
      });
      logger.info("[ResendAdapter] Removed Resend domain identity", { domainId });
    } catch (err: any) {
      logger.warn("[ResendAdapter] Failed to remove Resend domain identity", { domainId, error: err.message });
    }
  }
}

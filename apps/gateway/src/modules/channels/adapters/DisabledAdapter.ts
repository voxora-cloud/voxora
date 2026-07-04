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

export class DisabledAdapter implements IEmailProviderAdapter {
  async addDomain(params: AddDomainParams): Promise<AddDomainResult> {
    logger.warn("[DisabledAdapter] addDomain skipped because email provider is disabled");
    return {
      domainId: params.domain,
      status: "failed",
      dnsRecords: [],
    };
  }

  async getDomainStatus(domainId: string): Promise<DomainStatusResult> {
    return { status: "failed" };
  }

  async verifyDomain(domainId: string): Promise<VerifyDomainResult> {
    return { verified: false, status: "failed" };
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    logger.warn("[DisabledAdapter] sendEmail skipped because email provider is disabled", {
      to: params.to,
      subject: params.subject,
    });
    return { messageId: "" };
  }

  async removeDomain(domainId: string): Promise<void> {
    logger.warn("[DisabledAdapter] removeDomain skipped because email provider is disabled", { domainId });
  }
}

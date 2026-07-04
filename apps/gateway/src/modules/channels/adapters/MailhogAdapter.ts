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
import net from "net";

function sendSmtpMail(
  host: string,
  port: number,
  options: { from: string; to: string; subject: string; html: string; text?: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.setEncoding("utf-8");

    let step = 0;

    const send = (data: string) => {
      socket.write(data + "\r\n");
    };

    socket.on("data", (data) => {
      const response = data.toString();

      if (step === 0) {
        if (response.startsWith("220")) {
          send("EHLO localhost");
          step = 1;
        } else {
          socket.destroy();
          reject(new Error(`SMTP connection failed: ${response}`));
        }
      } else if (step === 1) {
        if (response.startsWith("250")) {
          send(`MAIL FROM:<${options.from}>`);
          step = 2;
        }
      } else if (step === 2) {
        if (response.startsWith("250")) {
          send(`RCPT TO:<${options.to}>`);
          step = 3;
        }
      } else if (step === 3) {
        if (response.startsWith("250")) {
          send("DATA");
          step = 4;
        }
      } else if (step === 4) {
        if (response.startsWith("354")) {
          const headers = [
            `From: ${options.from}`,
            `To: ${options.to}`,
            `Subject: ${options.subject}`,
            "MIME-Version: 1.0",
            'Content-Type: text/html; charset="utf-8"',
            "",
            options.html,
            "."
          ].join("\r\n");
          send(headers);
          step = 5;
        }
      } else if (step === 5) {
        if (response.startsWith("250")) {
          send("QUIT");
          step = 6;
        }
      } else if (step === 6) {
        socket.destroy();
        resolve();
      }
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

export class MailhogAdapter implements IEmailProviderAdapter {
  async addDomain(params: AddDomainParams): Promise<AddDomainResult> {
    logger.info("[MailhogAdapter] addDomain mock successful", { domain: params.domain });
    return {
      domainId: params.domain,
      status: "verified",
      dnsRecords: [
        {
          type: "TXT",
          name: params.domain,
          value: "v=spf1 include:amazonses.com ~all",
          ttl: 3600,
        },
      ],
    };
  }

  async getDomainStatus(domainId: string): Promise<DomainStatusResult> {
    return { status: "verified" };
  }

  async verifyDomain(domainId: string): Promise<VerifyDomainResult> {
    return {
      verified: true,
      status: "verified",
      dnsRecords: [
        {
          type: "TXT",
          name: domainId,
          value: "v=spf1 include:amazonses.com ~all",
          ttl: 3600,
        },
      ],
    };
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      await sendSmtpMail("localhost", 1025, {
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      logger.info("[MailhogAdapter] Mock email dispatched via SMTP successfully", { to: params.to });
      return { messageId: `mock-${Date.now()}` };
    } catch (err: any) {
      logger.error("[MailhogAdapter] Mock SMTP dispatch failed", { error: err.message });
      throw new Error(`Mailhog send failed: ${err.message}`);
    }
  }

  async removeDomain(domainId: string): Promise<void> {
    logger.info("[MailhogAdapter] removeDomain mock successful", { domainId });
  }
}

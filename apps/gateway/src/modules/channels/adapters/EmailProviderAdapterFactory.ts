import config from "@shared/infra/config";
import { IEmailProviderAdapter } from "../core/IEmailProviderAdapter";
import { SesAdapter } from "./SesAdapter";
import { ResendAdapter } from "./ResendAdapter";
import { MailhogAdapter } from "./MailhogAdapter";
import { DisabledAdapter } from "./DisabledAdapter";

export class EmailProviderAdapterFactory {
  static create(): IEmailProviderAdapter {
    const provider = config.email.provider;

    switch (provider) {
      case "ses":
        return new SesAdapter();
      case "resend":
        return new ResendAdapter();
      case "mailhog":
        return new MailhogAdapter();
      case "disabled":
      default:
        return new DisabledAdapter();
    }
  }
}

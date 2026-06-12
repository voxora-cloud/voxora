import config from "@shared/infra/config";
import logger from "@shared/core/logger";

export interface ResolvedFromEmail {
  name: string;
  email: string;
}



function defaultFrom(): ResolvedFromEmail {
  return {
    name: "InteraOne",
    email: config.email.from.email,
  };
}

/**
 * Resolve the platform default sender.
 * Note: organizationId is ignored as multi-tenant email is disabled.
 */
export async function resolveFromEmail(
  _organizationId?: string | null,
): Promise<ResolvedFromEmail> {
  return defaultFrom();
}

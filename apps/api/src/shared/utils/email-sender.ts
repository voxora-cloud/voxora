import { Organization } from "@shared/models";
import config from "@shared/config";
import logger from "@shared/utils/logger";

export interface ResolvedFromEmail {
  name: string;
  email: string;
}

function normalizeDomain(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function domainFromEmail(email: string): string {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return "";
  return normalizeDomain(email.slice(atIndex + 1));
}

function defaultFrom(): ResolvedFromEmail {
  return {
    name: config.email.from.name,
    email: config.email.from.email,
  };
}

function fallbackFrom(reason: string, metadata?: Record<string, unknown>): ResolvedFromEmail {
  logger.debug("email.from.fallback", {
    reason,
    ...(metadata || {}),
  });
  return defaultFrom();
}

function isVerifiedTenantSender(input?: {
  fromEmail?: string;
  fromName?: string;
  domain?: string;
  verified?: boolean;
}): input is { fromEmail: string; fromName: string; domain: string; verified: true } {
  if (!input?.verified) return false;

  const fromEmail = (input.fromEmail || "").trim().toLowerCase();
  const fromName = (input.fromName || "").trim();
  const domain = normalizeDomain(input.domain);

  if (!fromEmail || !fromName || !domain) return false;
  if (domainFromEmail(fromEmail) !== domain) return false;

  return true;
}

/**
 * Resolve a tenant-aware sender with strict safety checks.
 * Falls back to platform sender when tenant settings are absent or unverified.
 */
export async function resolveFromEmail(
  organizationId?: string | null,
): Promise<ResolvedFromEmail> {
  if (!organizationId) return fallbackFrom("missing_organization_id");

  try {
    const org = await Organization.findById(organizationId)
      .select("emailSender")
      .lean();

    if (!org) {
      return fallbackFrom("organization_not_found", { organizationId });
    }

    if (!org.emailSender) {
      return fallbackFrom("missing_tenant_email_sender", { organizationId });
    }

    if (!isVerifiedTenantSender(org.emailSender)) {
      return fallbackFrom("unverified_or_invalid_tenant_email_sender", {
        organizationId,
        verified: !!org.emailSender.verified,
      });
    }

    return {
      name: org.emailSender.fromName.trim(),
      email: org.emailSender.fromEmail.trim().toLowerCase(),
    };
  } catch (error) {
    logger.warn("email.from.resolve.error", {
      organizationId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return defaultFrom();
  }
}

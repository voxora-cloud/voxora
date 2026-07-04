import { URL } from "url";

/**
 * Normalizes a user-inputted domain name or URL down to its clean hostname.
 * E.g., "https://www.example.com/some/path" -> "example.com"
 *       "example.com:8080" -> "example.com"
 *       "  WWW.SUB.EXAMPLE.COM  " -> "sub.example.com"
 */
export function normalizeDomain(input: string): string {
  if (!input) return "";
  let host = input.trim().toLowerCase();
  
  // Ensure it has a protocol so URL parses it correctly
  if (!/^https?:\/\//i.test(host)) {
    host = "http://" + host;
  }
  
  try {
    const parsed = new URL(host);
    let hostname = parsed.hostname;
    
    // Strip leading "www."
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch {
    // Fallback: strip common patterns manually
    let fallback = input.trim().toLowerCase();
    fallback = fallback.replace(/^https?:\/\//i, "");
    fallback = fallback.split("/")[0];
    fallback = fallback.split(":")[0];
    if (fallback.startsWith("www.")) {
      fallback = fallback.substring(4);
    }
    return fallback;
  }
}

export function isLocalDomain(input?: string): boolean {
  if (!input) return false;

  const raw = input.trim().toLowerCase();
  if (raw === "::1" || raw === "[::1]") return true;

  const hostname = normalizeDomain(input);
  return hostname === "localhost"
    || hostname === "::1"
    || hostname === "[::1]"
    || /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

export function requiresDomainVerification(environment: string, origin?: string): boolean {
  return environment === "production" && !isLocalDomain(origin);
}

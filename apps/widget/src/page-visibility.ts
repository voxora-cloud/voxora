export interface PageVisibilityBehavior {
  showOnlyOnSelectedPages?: boolean;
  allowedPageRules?: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function validatePageRule(value: string): string | null {
  const rule = value.trim();
  if (!rule) return "Enter a URL or path.";
  if (/\s/.test(rule)) return "URLs and paths cannot contain spaces.";

  try {
    if (isHttpUrl(rule)) {
      const url = new URL(rule);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Only http and https URLs are supported.";
      }
      return null;
    }

    if (rule.startsWith("/") && !rule.startsWith("//")) {
      new URL(rule, "https://example.com");
      return null;
    }

    return "Use a full http(s) URL or a path that starts with /.";
  } catch {
    return "Enter a valid URL or path.";
  }
}

function matchesPattern(target: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    return new RegExp(`^${escapeRegExp(pattern)}$`).test(target);
  }

  return target === pattern;
}

function matchesRule(currentUrl: URL, rule: string): boolean {
  if (validatePageRule(rule)) return false;

  if (isHttpUrl(rule)) {
    const hiddenUrl = new URL(rule);
    if (hiddenUrl.origin !== currentUrl.origin) return false;

    const pattern = `${hiddenUrl.origin}${hiddenUrl.pathname}${hiddenUrl.search}`;
    const target = hiddenUrl.search
      ? `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}`
      : `${currentUrl.origin}${currentUrl.pathname}`;
    return matchesPattern(target, pattern);
  }

  const hiddenPath = new URL(rule, currentUrl.origin);
  const pattern = `${hiddenPath.pathname}${hiddenPath.search}`;
  const target = hiddenPath.search
    ? `${currentUrl.pathname}${currentUrl.search}`
    : currentUrl.pathname;
  return matchesPattern(target, pattern);
}

export function shouldShowWidgetOnPage(
  behavior: PageVisibilityBehavior | undefined,
  pageUrl: string,
): boolean {
  if (!behavior?.showOnlyOnSelectedPages) return true;

  const rules = (behavior.allowedPageRules || [])
    .map((rule) => rule.trim())
    .filter(Boolean);
  if (rules.length === 0) return true;

  try {
    const currentUrl = new URL(pageUrl);
    return !rules.some((rule) => matchesRule(currentUrl, rule));
  } catch {
    return false;
  }
}

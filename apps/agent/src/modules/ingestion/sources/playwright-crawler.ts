import { chromium, Browser, Page } from "playwright";

export interface FetchedPage {
  url: string;
  text: string;
}

const USER_AGENT = "InteraOne/1.0 (knowledge indexer)";
const NAVIGATION_TIMEOUT = 20_000;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_REQUEST_DELAY_MS = 500;

const STATIC_EXTENSIONS = new Set([
  "css", "js", "mjs", "cjs", "map",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "tiff",
  "woff", "woff2", "ttf", "eot", "otf",
  "zip", "gz", "tar", "rar", "7z", "exe", "dmg", "pkg", "deb", "rpm",
  "mp3", "mp4", "webm", "ogg", "wav", "avi", "mov", "mkv", "flac",
  "pdf", "docx", "doc", "xlsx", "pptx",
  "json", "xml", "csv", "yaml", "yml",
]);

/**
 * Default URL patterns that are skipped during crawling.
 * These are designed to prevent infinite crawl explosion on blogs and CMSs.
 */
export const DEFAULT_SKIP_PATTERNS: RegExp[] = [
  // Pagination
  /\/page\/\d+\/?$/i,
  /\?.*\b(page|p|offset|start|limit)=\d+/i,
  // Date archives (e.g., /2024/01/ or /2024/01/15/)
  /\/(20\d{2}|19\d{2})\/(\d{2}|\/)/i,
  /\/archive(s)?\//i,
  // Taxonomies
  /\/(tag|tags|category|categories|author|topic|label|labels)\/[^/]+\/?$/i,
  // Feeds
  /\/(feed|rss|atom|json|xml)\/?$/i,
  // Search / sort / filter query params
  /\?.*\b(search|q|query|sort|order|filter|ref|source)=/i,
  // Print / reply / comment permalinks
  /\?.*\b(print|replytocom|share|like)=/i,
  // Tracking params (safety net)
  /\?.*\b(utm_|fbclid|gclid|ttclid|mc_cid|mc_eid|dclid|srsltid)=/i,
  // CMS layout variants
  /\?.*\b(view|layout|tmpl|template|theme|skin|device|mobile)=/i,
];

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
  "fbclid", "gclid", "ttclid", "dclid", "srsltid", "wbraid", "gbraid",
  "mc_cid", "mc_eid", "ref", "source", "medium", "campaign",
]);

function isStaticAssetUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    return !!ext && STATIC_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

function stripTrackingParams(url: URL): void {
  url.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  });
}

/**
 * Normalize a URL for deduplication:
 *  - lowercase hostname
 *  - strip www prefix
 *  - strip fragment
 *  - strip tracking query params
 *  - sort remaining query params
 *  - remove trailing slash (except root)
 *  - reject static assets and cross-origin (if rootHostname provided)
 */
export function normalizeUrl(url: string, rootHostname?: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) return null;

    parsed.hostname = parsed.hostname.toLowerCase();

    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    parsed.hash = "";
    stripTrackingParams(parsed);

    const sortedEntries = [...parsed.searchParams].sort((a, b) => a[0].localeCompare(b[0]));
    const sortedParams = new URLSearchParams(sortedEntries);
    parsed.search = sortedParams.toString() ? `?${sortedParams.toString()}` : "";

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    const normalized = parsed.toString();
    if (isStaticAssetUrl(normalized)) return null;
    if (rootHostname && parsed.hostname !== rootHostname) return null;

    return normalized;
  } catch {
    return null;
  }
}

function normalizeSameOriginCandidate(candidate: string, root: URL): string | null {
  try {
    const url = new URL(candidate, root.origin);
    const rootHostname = root.hostname.toLowerCase().replace(/^www\./, "");
    return normalizeUrl(url.toString(), rootHostname);
  } catch {
    return null;
  }
}

async function extractTextFromPage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const selectorsToRemove = [
      "script", "style", "noscript", "iframe", "nav", "header", "footer",
      "aside", ".sidebar", "#sidebar", ".menu", "#menu", ".navigation",
      ".ads", ".advertisement", ".cookie-banner", ".modal", "dialog",
      ".comments", "#comments", ".comment-list", "#comment-list",
    ];
    selectorsToRemove.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    });

    const main =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.querySelector(".content") ||
      document.querySelector("#content") ||
      document.querySelector(".post") ||
      document.querySelector(".entry") ||
      document.body;

    if (!main) return "";

    let text = main.innerText || main.textContent || "";
    text = text.replace(/\t+/g, " ").replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    return text;
  });
}

async function extractCanonicalUrl(page: Page, pageUrl: string): Promise<string | null> {
  try {
    const canonical = await page.evaluate(() => {
      const link = document.querySelector("link[rel='canonical']");
      return link?.getAttribute("href") || null;
    });
    if (!canonical) return null;
    return normalizeUrl(new URL(canonical, pageUrl).toString()) || null;
  } catch {
    return null;
  }
}

async function extractLinks(page: Page, pageUrl: string): Promise<string[]> {
  const rawLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href"))
      .filter((href): href is string => !!href);
  });

  const rootHostname = new URL(pageUrl).hostname.toLowerCase().replace(/^www\./, "");
  const seen = new Set<string>();

  for (const href of rawLinks) {
    try {
      const resolved = new URL(href, pageUrl);
      resolved.hash = "";
      const normalized = normalizeUrl(resolved.toString(), rootHostname);
      if (normalized && !isStaticAssetUrl(normalized)) {
        seen.add(normalized);
      }
    } catch {
      // skip malformed
    }
  }

  return [...seen];
}

async function discoverSitemapCandidates(rootUrl: string): Promise<string[]> {
  const root = new URL(rootUrl);
  const candidates = new Set<string>();

  const addCandidate = (value: string) => {
    const normalized = normalizeSameOriginCandidate(value, root);
    if (normalized) candidates.add(normalized);
  };

  const fetchText = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/xml,text/xml,text/plain,*/*",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  const sitemapXml = await fetchText(`${root.origin}/sitemap.xml`);
  if (sitemapXml) {
    for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const value = match[1]?.trim();
      if (value) addCandidate(value);
    }
  }

  const robotsText = await fetchText(`${root.origin}/robots.txt`);
  if (robotsText) {
    const sitemapLines = robotsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^sitemap:/i.test(line));

    for (const line of sitemapLines) {
      const sitemapUrl = line.replace(/^sitemap:\s*/i, "").trim();
      if (!sitemapUrl) continue;
      const xml = await fetchText(sitemapUrl);
      if (!xml) continue;
      for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const value = match[1]?.trim();
        if (value) addCandidate(value);
      }
    }
  }

  return [...candidates];
}

interface PageFetchResult {
  url: string;
  text: string;
  links: string[];
  canonicalUrl: string | null;
  isCanonicalDuplicate: boolean;
}

async function fetchPageWithPlaywright(
  browser: Browser,
  url: string,
  skipPatterns: RegExp[],
): Promise<PageFetchResult | null> {
  for (const pattern of skipPatterns) {
    if (pattern.test(url)) {
      console.log(`[Crawler] Skipping URL by pattern: ${url}`);
      return null;
    }
  }

  const page = await browser.newPage({
    userAgent: USER_AGENT,
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
    });

    // Brief pause for JS-rendered content to settle
    await page.waitForTimeout(300);

    const contentType = response?.headers()?.["content-type"] || "";
    if (contentType && !contentType.toLowerCase().includes("text/html")) {
      console.log(`[Crawler] Skipping non-HTML content (${contentType}): ${url}`);
      return null;
    }

    const canonicalUrl = await extractCanonicalUrl(page, url);

    // If canonical points to a different normalized URL, this page is a duplicate
    if (canonicalUrl && canonicalUrl !== url) {
      return {
        url: canonicalUrl,
        text: "",
        links: [],
        canonicalUrl,
        isCanonicalDuplicate: true,
      };
    }

    const text = await extractTextFromPage(page);
    const links = await extractLinks(page, url);

    return {
      url,
      text,
      links,
      canonicalUrl,
      isCanonicalDuplicate: false,
    };
  } catch (err: any) {
    console.warn(`[Crawler] Error fetching ${url}: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

function hashContent(text: string): string {
  const sample = text.slice(0, 1500).replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/** Fetch only the given URL and return its text content */
export async function fetchSinglePage(url: string): Promise<FetchedPage[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const result = await fetchPageWithPlaywright(browser, url, []);
    if (!result || result.isCanonicalDuplicate || !result.text.trim()) return [];
    return [{ url: result.url, text: result.text }];
  } finally {
    await browser.close();
  }
}

/**
 * BFS-crawl starting from `rootUrl` up to `maxDepth` levels.
 * Yields pages one-by-one as they are fetched so the pipeline can flush
 * embeddings in configurable page-count batches without waiting for the
 * entire crawl to finish.
 *
 * Safety features:
 *  - maxPages hard cap (default 50)
 *  - URL normalization (tracking params, fragments, www, trailing slashes)
 *  - Canonical link handling (skips duplicates, queues canonical target)
 *  - Content-hash deduplication (skips pages with identical text)
 *  - URL pattern blacklist for blog/CMS explosion (/page/N, /tag/…, /2024/…)
 *  - Request delay between pages (rate limiting)
 */
export async function* crawlPages(
  rootUrl: string,
  maxDepth: number,
  options?: {
    maxPages?: number;
    requestDelayMs?: number;
    skipPatterns?: RegExp[];
    respectCanonical?: boolean;
    deduplicateByContent?: boolean;
  },
): AsyncGenerator<FetchedPage> {
  const {
    maxPages = DEFAULT_MAX_PAGES,
    requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
    skipPatterns = DEFAULT_SKIP_PATTERNS,
    respectCanonical = true,
    deduplicateByContent = true,
  } = options || {};

  const browser = await chromium.launch({ headless: true });
  try {
    const visited = new Set<string>();
    const queued = new Set<string>();
    const contentHashes = new Set<string>();
    let totalYielded = 0;

    const queue: Array<[string, number]> = [];
    const normalizedRoot = normalizeUrl(rootUrl);
    if (normalizedRoot) {
      queue.push([normalizedRoot, 0]);
      queued.add(normalizedRoot);
    } else {
      queue.push([rootUrl, 0]);
      queued.add(rootUrl);
    }

    const rootHostname = new URL(normalizedRoot || rootUrl).hostname;

    if (maxDepth > 0) {
      try {
        const sitemapCandidates = await discoverSitemapCandidates(rootUrl);
        if (sitemapCandidates.length > 0) {
          console.log(
            `[Crawler] Seeded ${sitemapCandidates.length} URL(s) from sitemap/robots for ${rootHostname}`,
          );
          for (const url of sitemapCandidates) {
            const normalized = normalizeUrl(url, rootHostname);
            if (!normalized || queued.has(normalized)) continue;
            queued.add(normalized);
            queue.push([normalized, 1]);
          }
        }
      } catch (err: any) {
        console.warn(`[Crawler] Sitemap discovery failed: ${err.message}`);
      }
    }

    while (queue.length > 0) {
      if (totalYielded >= maxPages) {
        console.log(`[Crawler] Reached maxPages limit (${maxPages}). Stopping.`);
        break;
      }

      const [currentUrl, depth] = queue.shift()!;
      const normalizedCurrent = normalizeUrl(currentUrl, rootHostname);

      if (!normalizedCurrent || visited.has(normalizedCurrent)) continue;
      if (isStaticAssetUrl(normalizedCurrent)) continue;

      visited.add(normalizedCurrent);

      const result = await fetchPageWithPlaywright(browser, normalizedCurrent, skipPatterns);
      if (!result) continue;

      // Canonical normalization: if this page says it's a duplicate, queue the canonical instead
      if (respectCanonical && result.isCanonicalDuplicate && result.canonicalUrl) {
        if (!visited.has(result.canonicalUrl) && !queued.has(result.canonicalUrl)) {
          console.log(`[Crawler] Queuing canonical target: ${result.canonicalUrl}`);
          queued.add(result.canonicalUrl);
          queue.push([result.canonicalUrl, depth]);
        }
        continue;
      }

      // Content-level deduplication
      if (deduplicateByContent && result.text.trim()) {
        const hashStr = hashContent(result.text);
        if (contentHashes.has(hashStr)) {
          console.log(`[Crawler] Skipping duplicate content: ${normalizedCurrent}`);
          continue;
        }
        contentHashes.add(hashStr);
      }

      if (result.text.trim()) {
        totalYielded++;
        console.log(`[Crawler] Yielding page ${totalYielded} (depth ${depth}): ${normalizedCurrent}`);
        yield { url: normalizedCurrent, text: result.text };
      }

      if (depth < maxDepth) {
        if (result.links.length === 0) {
          console.log(`[Crawler] No same-origin links found on: ${normalizedCurrent}`);
        }
        for (const link of result.links) {
          const normalizedLink = normalizeUrl(link, rootHostname);
          if (!normalizedLink) continue;
          if (visited.has(normalizedLink) || queued.has(normalizedLink)) continue;
          if (isStaticAssetUrl(normalizedLink)) continue;

          queued.add(normalizedLink);
          queue.push([normalizedLink, depth + 1]);
        }
      }

      // Rate limiting between requests
      if (queue.length > 0 && requestDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, requestDelayMs));
      }
    }
  } finally {
    await browser.close();
  }
}

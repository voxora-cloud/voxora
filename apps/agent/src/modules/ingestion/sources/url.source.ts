import axios from "axios";
import { chromium, Page } from "playwright";

const USER_AGENT = "InteraOne/1.0 (knowledge indexer)";
const REQUEST_TIMEOUT = 30_000;

export interface FetchedPage {
  url: string;
  text: string;
}

const STATIC_EXTENSIONS = new Set([
  "css", "js", "mjs", "cjs", "map",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "tiff",
  "woff", "woff2", "ttf", "eot", "otf",
  "zip", "gz", "tar", "rar", "7z", "exe", "dmg", "pkg", "deb", "rpm",
  "mp3", "mp4", "webm", "ogg", "wav", "avi", "mov", "mkv", "flac",
  "pdf", "docx", "doc", "xlsx", "pptx",
  "json", "xml", "csv", "yaml", "yml",
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

/**
 * Normalizes a URL:
 * 1. Converts hostname to lowercase.
 * 2. Drops hash fragments.
 * 3. Strips trailing slashes from pathnames.
 * 4. Strips marketing/analytics tracking parameters.
 * 5. Sorts the remaining query parameters.
 */
export function normalizeUrl(urlString: string, baseUrl?: string): string | null {
  try {
    const url = new URL(urlString, baseUrl);
    if (!url.protocol.startsWith("http")) return null;

    url.hostname = url.hostname.toLowerCase();
    url.hash = "";

    // Strip trailing slash except for root pathname
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }

    const params = new URLSearchParams(url.search);
    const keysToStrip = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "fbclid", "gclid", "cx", "ie", "cof", "siteurl"
    ];
    keysToStrip.forEach(k => params.delete(k));
    params.sort();

    const searchStr = params.toString();
    url.search = searchStr ? `?${searchStr}` : "";

    return url.toString();
  } catch {
    return null;
  }
}

const EXCLUDED_PATTERNS = [
  /\/page\/\d+/i,
  /\b(page|p)=\d+/i,
  /\/tags?\//i,
  /\/categor(y|ies)\//i,
  /\/author\//i,
  /\/archive\//i,
  /\/date\//i,
  /\/feed\/?$/i,
  /\/rss\/?$/i,
  /\/feed\/atom\/?$/i,
  /\bs\s*=/i,
  /\bsearch\b/i,
  /\/calendar/i,
  /\/events/i,
];

export function shouldCrawl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.search;

    return !EXCLUDED_PATTERNS.some(pattern => pattern.test(path) || pattern.test(search));
  } catch {
    return false;
  }
}

async function extractCleanText(page: Page): Promise<string> {
  // Strip style tags, scripts, navigation, headers, footers, etc. before pulling text
  await page.evaluate(() => {
    const selectors = ["script", "style", "nav", "header", "footer", "noscript", "iframe"];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el: any) => el.remove());
    });
  });

  const bodyText = await page.locator("body").innerText().catch(() => "");

  // Metadata fallback if inner text is too short
  if (bodyText.trim().length < 40) {
    const metadata = await page.evaluate(() => {
      const title = document.querySelector("title")?.textContent || "";
      const h1 = document.querySelector("h1")?.textContent || "";
      const h2 = document.querySelector("h2")?.textContent || "";
      const description =
        document.querySelector("meta[name='description']")?.getAttribute("content") ||
        document.querySelector("meta[property='og:description']")?.getAttribute("content") ||
        "";
      return [title, h1, h2, description].filter(Boolean).join("\n\n");
    });
    return metadata.trim();
  }

  return bodyText
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Fetch only the given URL and return its text content */
export async function fetchSinglePage(url: string): Promise<FetchedPage[]> {
  const normalized = normalizeUrl(url);
  if (!normalized) return [];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    // Block images, stylesheets, media and fonts to speed up load times
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "stylesheet", "media", "font"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });

    // Handle Canonical URL
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href").catch(() => null);
    if (canonicalHref) {
      const resolvedCanonical = normalizeUrl(canonicalHref, normalized);
      if (resolvedCanonical && resolvedCanonical !== normalized) {
        console.log(`[Crawler] Resolved canonical link to: ${resolvedCanonical}`);
        const text = await extractCleanText(page);
        return [{ url: resolvedCanonical, text }];
      }
    }

    const text = await extractCleanText(page);
    return [{ url: normalized, text }];
  } catch (err: any) {
    console.warn(`[Crawler] Failed to fetch single page ${url}: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * BFS-crawl starting from `rootUrl` up to `maxDepth` levels.
 * Yields pages one-by-one as they are fetched.
 */
export async function* crawlPages(
  rootUrl: string,
  maxDepth: number,
): AsyncGenerator<FetchedPage> {
  const rootNormalized = normalizeUrl(rootUrl);
  if (!rootNormalized) return;

  const visited = new Set<string>();
  let totalYielded = 0;
  const MAX_PAGES_LIMIT = parseInt(process.env.CRAWLER_MAX_PAGES || "150", 10);

  const queue: Array<[string, number]> = [[rootNormalized, 0]];

  // Discover sitemap candidates
  if (maxDepth > 0) {
    const sitemapCandidates = await discoverSitemapCandidates(rootNormalized);
    if (sitemapCandidates.length > 0) {
      console.log(
        `[Crawler] Seeded ${sitemapCandidates.length} URL(s) from sitemap/robots for ${new URL(rootNormalized).hostname}`,
      );
      for (const url of sitemapCandidates) {
        const normalizedCandidate = normalizeUrl(url);
        if (normalizedCandidate && normalizedCandidate !== rootNormalized) {
          queue.push([normalizedCandidate, 1]);
        }
      }
    }
  }

  const browser = await chromium.launch({ headless: true });

  try {
    while (queue.length > 0) {
      if (totalYielded >= MAX_PAGES_LIMIT) {
        console.log(`[Crawler] Reached maximum crawl page limit of ${MAX_PAGES_LIMIT}. Stopping.`);
        break;
      }

      const [currentUrl, depth] = queue.shift()!;
      if (visited.has(currentUrl)) continue;

      if (isStaticAssetUrl(currentUrl)) {
        console.log(`[Crawler] Skipping static asset: ${currentUrl}`);
        continue;
      }

      if (!shouldCrawl(currentUrl) && currentUrl !== rootNormalized) {
        console.log(`[Crawler] Excluded link matching blog noise pattern: ${currentUrl}`);
        continue;
      }

      visited.add(currentUrl);

      let page: Page | null = null;
      try {
        page = await browser.newPage();

        // Block static layout assets to speed up execution
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "stylesheet", "media", "font"].includes(type)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });

        const isHtml = await page.evaluate(() => document.contentType?.includes("text/html") !== false);
        if (!isHtml) {
          console.log(`[Crawler] Skipping non-HTML page: ${currentUrl}`);
          continue;
        }

        // --- Handle Canonical URL Deduplication ---
        const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href").catch(() => null);
        let resolvedUrl = currentUrl;

        if (canonicalHref) {
          const resolvedCanonical = normalizeUrl(canonicalHref, currentUrl);
          if (resolvedCanonical) {
            const rootHost = new URL(rootNormalized).hostname;
            const canonicalHost = new URL(resolvedCanonical).hostname;

            if (canonicalHost === rootHost) {
              if (visited.has(resolvedCanonical) && resolvedCanonical !== currentUrl) {
                console.log(`[Crawler] Skipping duplicate page (canonical URL ${resolvedCanonical} already visited)`);
                continue;
              }
              resolvedUrl = resolvedCanonical;
              visited.add(resolvedCanonical);
            }
          }
        }

        const text = await extractCleanText(page);
        if (text) {
          totalYielded++;
          console.log(`[Crawler] Yielding page ${totalYielded} (depth ${depth}): ${resolvedUrl}`);
          yield { url: resolvedUrl, text };
        }

        // --- Extract and Queue Links ---
        if (depth < maxDepth) {
          const rawLinks = await page.evaluate(() => {
            const seen = new Set<string>();

            // 1. Standard anchors
            document.querySelectorAll("a[href]").forEach((el: any) => {
              const href = el.getAttribute("href");
              if (href) seen.add(href);
            });

            // 2. Custom attributes
            document.querySelectorAll("[href], [data-href], [data-url], [src]").forEach((el: any) => {
              const attrs = ["href", "data-href", "data-url", "src"];
              attrs.forEach((attr) => {
                const val = el.getAttribute(attr);
                if (val) seen.add(val);
              });
            });

            // 3. Absolute URL patterns in body
            const bodyHtml = document.body.innerHTML;
            const absUrlPattern = /https?:\/\/[^\s"'<>`]+/g;
            const matches = bodyHtml.match(absUrlPattern) || [];
            matches.forEach((m: any) => seen.add(m));

            // 4. Relative paths in body
            const relPathPattern = /["'`]\/(?!\/)([^"'`\s?#][^"'`\s]*)["'`]/g;
            for (const match of bodyHtml.matchAll(relPathPattern)) {
              const pathPart = match[1]?.trim();
              if (pathPart) seen.add(`/${pathPart}`);
            }

            return Array.from(seen);
          });

          const rootHost = new URL(rootNormalized).hostname;

          for (const rawLink of rawLinks) {
            const normalizedLink = normalizeUrl(rawLink, currentUrl);
            if (normalizedLink) {
              try {
                const linkHost = new URL(normalizedLink).hostname;
                if (
                  linkHost === rootHost &&
                  !visited.has(normalizedLink) &&
                  !isStaticAssetUrl(normalizedLink) &&
                  shouldCrawl(normalizedLink)
                ) {
                  queue.push([normalizedLink, depth + 1]);
                }
              } catch {
                // Ignore malformed URL parsing errors
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Crawler] Skipping ${currentUrl} due to error: ${err.message}`);
      } finally {
        if (page) {
          await page.close().catch(() => {});
        }
      }
    }
  } finally {
    await browser.close();
  }
}

async function discoverSitemapCandidates(rootUrl: string): Promise<string[]> {
  const root = new URL(rootUrl);
  const candidates = new Set<string>();

  const addCandidate = (value: string) => {
    const normalized = normalizeUrl(value, root.origin);
    if (normalized) candidates.add(normalized);
  };

  const fetchText = async (url: string): Promise<string | null> => {
    try {
      const res = await axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT,
        responseType: "text",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/xml,text/xml,text/plain,*/*",
        },
      });
      return typeof res.data === "string" ? res.data : null;
    } catch {
      return null;
    }
  };

  const sitemapIndex = `${root.origin}/sitemap.xml`;
  const sitemapXml = await fetchText(sitemapIndex);
  if (sitemapXml) {
    for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const value = match[1]?.trim();
      if (value) addCandidate(value);
    }
  }

  const robotsUrl = `${root.origin}/robots.txt`;
  const robotsText = await fetchText(robotsUrl);
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

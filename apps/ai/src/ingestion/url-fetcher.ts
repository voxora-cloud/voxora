import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT = "VoxoraBot/1.0 (knowledge indexer)";
const REQUEST_TIMEOUT = 30_000;

export interface FetchedPage {
  url: string;
  text: string;
}

// ── Static-asset filter ───────────────────────────────────────────────────────

/**
 * File extensions that are never HTML content pages.
 * We check the URL path before even making a request.
 */
const STATIC_EXTENSIONS = new Set([
  // styles / scripts
  "css", "js", "mjs", "cjs", "map",
  // images
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "tiff",
  // fonts
  "woff", "woff2", "ttf", "eot", "otf",
  // archives / binaries
  "zip", "gz", "tar", "rar", "7z", "exe", "dmg", "pkg", "deb", "rpm",
  // media
  "mp3", "mp4", "webm", "ogg", "wav", "avi", "mov", "mkv", "flac",
  // documents (handled by separate pipelines)
  "pdf", "docx", "doc", "xlsx", "pptx",
  // data
  "json", "xml", "csv", "yaml", "yml",
]);

/** Returns true if the URL path ends with a known static-asset extension */
function isStaticAssetUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    return !!ext && STATIC_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML and return clean plain text */
function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  // Remove non-content elements
  $("script, style, noscript, nav, footer, header, aside, form, iframe").remove();
  // Collapse whitespace
  return $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Return all same-origin absolute URLs found on a page, excluding static assets */
function extractLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, pageUrl);
      // Same origin only, http(s) only, drop fragments, skip static assets
      if (
        resolved.hostname === base.hostname &&
        resolved.protocol.startsWith("http") &&
        !isStaticAssetUrl(resolved.toString())
      ) {
        resolved.hash = "";
        seen.add(resolved.toString());
      }
    } catch {
      /* skip malformed */
    }
  });

  return [...seen];
}

/**
 * Fetch a URL and return its HTML string, or null if the response is not
 * an HTML page (wrong Content-Type, redirect to a static file, etc.).
 */
async function getPage(url: string): Promise<string | null> {
  const res = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT,
    headers: { "User-Agent": USER_AGENT, "Accept": "text/html" },
    responseType: "text",
  });

  const contentType: string = (res.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("text/html")) {
    return null; // binary, JSON, plain-text feed, etc.
  }

  return res.data;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Fetch only the given URL and return its text content */
export async function fetchSinglePage(url: string): Promise<FetchedPage[]> {
  const html = await getPage(url);
  if (!html) return [];
  const text = htmlToText(html);
  return text ? [{ url, text }] : [];
}

/**
 * BFS-crawl starting from `rootUrl` up to `maxDepth` levels.
 * Yields pages one-by-one as they are fetched so the pipeline can flush
 * embeddings in configurable page-count batches without waiting for the
 * entire crawl to finish.
 *
 * depth=0 → only the root page (same as single)
 * depth=1 → root + direct links
 * depth=2 → root + direct links + their links
 */
export async function* crawlPages(
  rootUrl: string,
  maxDepth: number,
): AsyncGenerator<FetchedPage> {
  const visited = new Set<string>();
  let totalYielded = 0;

  // BFS queue: [url, depth]
  const queue: Array<[string, number]> = [[rootUrl, 0]];

  while (queue.length > 0) {
    const [currentUrl, depth] = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    // Pre-flight: skip known static assets before making a request
    if (isStaticAssetUrl(currentUrl)) {
      console.log(`[Crawler] Skipping static asset: ${currentUrl}`);
      continue;
    }
    visited.add(currentUrl);

    try {
      const html = await getPage(currentUrl);
      // Skip non-HTML responses (getPage returns null for wrong Content-Type)
      if (!html) {
        console.log(`[Crawler] Skipping non-HTML response: ${currentUrl}`);
        continue;
      }

      const text = htmlToText(html);
      if (text) {
        totalYielded++;
        console.log(`[Crawler] Yielding page ${totalYielded} (depth ${depth}): ${currentUrl}`);
        yield { url: currentUrl, text };
      }

      if (depth < maxDepth) {
        const links = extractLinks(html, currentUrl);
        for (const link of links) {
          if (!visited.has(link)) queue.push([link, depth + 1]);
        }
      }
    } catch (err: any) {
      console.warn(`[Crawler] Skipping ${currentUrl}: ${err.message}`);
    }
  }
}

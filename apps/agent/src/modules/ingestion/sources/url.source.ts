import axios from "axios";
import * as cheerio from "cheerio";

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



 
function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  
  
  $("script, style, noscript, iframe").remove();
  
  return $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}




function extractMetadataFallback(html: string): string {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();
  const h2 = $("h2").first().text().trim();
  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    $("meta[property='og:description']").attr("content")?.trim() ||
    "";

  return [title, h1, h2, description].filter(Boolean).join("\n\n").trim();
}

 
function extractLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, pageUrl);
      
      if (
        resolved.hostname === base.hostname &&
        resolved.protocol.startsWith("http") &&
        !isStaticAssetUrl(resolved.toString())
      ) {
        resolved.hash = "";
        seen.add(resolved.toString());
      }
    } catch {
       
    }
  });

  
  
  $("[href], [data-href], [data-url], [content], [src]").each((_, el) => {
    const attrValues = [
      $(el).attr("href"),
      $(el).attr("data-href"),
      $(el).attr("data-url"),
      $(el).attr("content"),
      $(el).attr("src"),
    ].filter(Boolean) as string[];

    for (const raw of attrValues) {
      try {
        const resolved = new URL(raw, pageUrl);
        if (
          resolved.hostname === base.hostname &&
          resolved.protocol.startsWith("http") &&
          !isStaticAssetUrl(resolved.toString())
        ) {
          resolved.hash = "";
          seen.add(resolved.toString());
        }
      } catch {
         
      }
    }
  });

  
  const absUrlPattern = /https?:\/\/[^\s"'<>`]+/g;
  for (const match of html.match(absUrlPattern) || []) {
    try {
      const resolved = new URL(match);
      if (
        resolved.hostname === base.hostname &&
        resolved.protocol.startsWith("http") &&
        !isStaticAssetUrl(resolved.toString())
      ) {
        resolved.hash = "";
        seen.add(resolved.toString());
      }
    } catch {
       
    }
  }

  
  const relPathPattern = /["'`]\/(?!\/)([^"'`\s?#][^"'`\s]*)["'`]/g;
  for (const match of html.matchAll(relPathPattern)) {
    const pathPart = match[1]?.trim();
    if (!pathPart) continue;
    const candidate = `/${pathPart}`;
    try {
      const resolved = new URL(candidate, pageUrl);
      if (!isStaticAssetUrl(resolved.toString())) {
        resolved.hash = "";
        seen.add(resolved.toString());
      }
    } catch {
      /* skip malformed */
    }
  }

  return [...seen];
}

function normalizeSameOriginCandidate(candidate: string, root: URL): string | null {
  try {
    const url = new URL(candidate, root.origin);
    if (!url.protocol.startsWith("http")) return null;
    if (url.hostname !== root.hostname) return null;
    url.hash = "";
    const normalized = url.toString();
    if (isStaticAssetUrl(normalized)) return null;
    return normalized;
  } catch {
    return null;
  }
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

  const contentType: string = String(res.headers["content-type"] ?? "").toLowerCase();
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
  const fallback = extractMetadataFallback(html);
  const bestEffortText = text.length >= 40 ? text : fallback;
  return bestEffortText ? [{ url, text: bestEffortText }] : [];
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

  if (maxDepth > 0) {
    const sitemapCandidates = await discoverSitemapCandidates(rootUrl);
    if (sitemapCandidates.length > 0) {
      console.log(
        `[Crawler] Seeded ${sitemapCandidates.length} URL(s) from sitemap/robots for ${new URL(rootUrl).hostname}`,
      );
      for (const url of sitemapCandidates) {
        if (url !== rootUrl) queue.push([url, 1]);
      }
    }
  }

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
      const fallback = extractMetadataFallback(html);
      const bestEffortText = text.length >= 40 ? text : fallback;

      if (bestEffortText) {
        totalYielded++;
        console.log(`[Crawler] Yielding page ${totalYielded} (depth ${depth}): ${currentUrl}`);
        yield { url: currentUrl, text: bestEffortText };
      }

      if (depth < maxDepth) {
        const links = extractLinks(html, currentUrl);
        if (links.length === 0) {
          console.log(`[Crawler] No same-origin links found on: ${currentUrl}`);
        }
        for (const link of links) {
          if (!visited.has(link)) queue.push([link, depth + 1]);
        }
      }
    } catch (err: any) {
      console.warn(`[Crawler] Skipping ${currentUrl}: ${err.message}`);
    }
  }
}

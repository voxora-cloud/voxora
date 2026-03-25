import { Tool, ToolParameterSchema } from "../agent.types";

export class WebCrawlTool implements Tool {
  readonly name = "web_crawl";
  readonly description = "Crawl a given URL to extract its main text content. Useful for answering questions about live websites or checking references.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    url: {
      type: "string",
      description: "The full URL to fetch, e.g., 'https://example.com'.",
      required: true
    }
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    try {
      const url = args.url as string;
      if (!url) throw new Error("URL is required");

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VoxoraBot/1.0; +http://voxora.com)'
        }
      });
      let html = await response.text();

      const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      const styleRegex = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
      const navRegex = /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi;

      let text = html
        .replace(scriptRegex, " ")
        .replace(styleRegex, " ")
        .replace(navRegex, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 8000) {
        text = text.slice(0, 8000) + "... (truncated)";
      }
      return JSON.stringify({ status: "success", text });
    } catch (e: any) {
      return JSON.stringify({ status: "error", message: e.message });
    }
  }
}
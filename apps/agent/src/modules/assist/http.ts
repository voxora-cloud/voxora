import { AssistHttpRequest, AssistHttpResponse } from "./types";

const MAX_BODY_BYTES = 512 * 1024;

export function sendJson(
  res: AssistHttpResponse,
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function validateAiSecret(req: AssistHttpRequest): boolean {
  const secret = process.env.AI_TOOL_SECRET;
  const isDev = (process.env.NODE_ENV || "development") === "development";

  if (!secret) return isDev;

  const provided = req.headers["x-ai-tool-secret"];
  return provided === secret;
}

export async function readJsonBody<T>(req: AssistHttpRequest): Promise<T> {
  const chunks: Buffer[] = [];
  let total = 0;

  return new Promise<T>((resolve, reject) => {
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({} as T);
        return;
      }

      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

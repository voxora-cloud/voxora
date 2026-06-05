import { IncomingMessage, ServerResponse } from "http";
import { timingSafeEqual } from "crypto";
import { searchFaqFastPathAnswer } from "../modules/chat/services/faq-fast-path.service";
import logger from "../utils/logger";

const MAX_BODY_BYTES = 16 * 1024;

function getProductionAiToolSecret(): string {
  const secret = process.env.AI_TOOL_SECRET?.trim();
  if (!secret) {
    throw new Error("AI_TOOL_SECRET is required in production for internal routes");
  }
  return secret;
}

const AI_TOOL_SECRET =
  process.env.NODE_ENV === "production"
    ? getProductionAiToolSecret()
    : process.env.AI_TOOL_SECRET?.trim();

interface FaqFastPathRequestBody {
  organizationId: string;
  message: string;
}

class InternalRouteError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function getHeaderValue(header: string | string[] | undefined): string | null {
  if (Array.isArray(header)) return header[0] ?? null;
  return header ?? null;
}

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function isAuthorized(req: IncomingMessage): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return true;
  if (!AI_TOOL_SECRET) return false;

  return secretsMatch(
    getHeaderValue(req.headers["x-ai-tool-secret"]),
    AI_TOOL_SECRET,
  );
}

function getPathname(req: IncomingMessage): string {
  try {
    return new URL(req.url || "/", "http://internal.local").pathname;
  } catch {
    return "/";
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;

    if (receivedBytes > MAX_BODY_BYTES) {
      throw new InternalRouteError(413, "Request body is too large");
    }

    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new InternalRouteError(400, "Request body must be valid JSON");
  }
}

function parseFaqFastPathBody(body: unknown): FaqFastPathRequestBody | null {
  if (!body || typeof body !== "object") return null;

  const { organizationId, message } = body as Record<string, unknown>;
  if (typeof organizationId !== "string" || typeof message !== "string") {
    return null;
  }

  const trimmedOrganizationId = organizationId.trim();
  if (!trimmedOrganizationId || !message.trim()) return null;

  return {
    organizationId: trimmedOrganizationId,
    message,
  };
}

export async function handleInternalRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathname = getPathname(req);
  if (!pathname.startsWith("/internal/")) return false;

  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      status: "error",
      message: "Unauthorized internal request",
    });
    return true;
  }

  if (pathname === "/internal/faq-fast-path") {
    if (req.method !== "POST") {
      sendJson(
        res,
        405,
        {
          status: "error",
          message: "Method not allowed",
        },
        { Allow: "POST" },
      );
      return true;
    }

    try {
      const parsedBody = parseFaqFastPathBody(await readJsonBody(req));

      if (!parsedBody) {
        sendJson(res, 400, {
          status: "error",
          message: "organizationId and message are required",
        });
        return true;
      }

      const match = await searchFaqFastPathAnswer(parsedBody);
      if (!match) {
        sendJson(res, 200, { status: "ok", match: false });
        return true;
      }

      sendJson(res, 200, {
        status: "ok",
        match: true,
        answer: match.answer,
        score: match.score,
      });
    } catch (error) {
      if (error instanceof InternalRouteError) {
        sendJson(res, error.statusCode, {
          status: "error",
          message: error.message,
        });
        return true;
      }

      logger.warn("Internal FAQ fast-path route failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      sendJson(res, 500, { status: "error", message: "FAQ fast-path failed" });
    }

    return true;
  }

  sendJson(res, 404, { status: "not_found" });
  return true;
}

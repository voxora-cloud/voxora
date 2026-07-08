import { assistDraft } from "./draft-assist.handler";
import { generateNote } from "./generate-note.handler";
import { readJsonBody, sendJson, validateAiSecret } from "./http";
import { suggestReply } from "./suggest-reply.handler";
import { AssistHttpRequest, AssistHttpResponse, AssistRequestBody } from "./types";

export async function handleAssistRoute(
  req: AssistHttpRequest,
  res: AssistHttpResponse,
): Promise<boolean> {
  const url = req.url || "/";
  const pathname = url.split("?")[0];

  if (!pathname.startsWith("/internal/")) return false;

  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Method not allowed" });
    return true;
  }

  if (!validateAiSecret(req)) {
    sendJson(res, 401, { success: false, message: "Unauthorized AI tool request" });
    return true;
  }

  try {
    const body = await readJsonBody<AssistRequestBody>(req);

    if (pathname === "/internal/suggest-reply") {
      sendJson(res, 200, { success: true, data: await suggestReply(body) });
      return true;
    }

    if (pathname === "/internal/generate-note") {
      sendJson(res, 200, { success: true, data: await generateNote(body) });
      return true;
    }

    if (pathname === "/internal/draft-assist") {
      sendJson(res, 200, { success: true, data: await assistDraft(body) });
      return true;
    }

    sendJson(res, 404, { success: false, message: "Internal assist route not found" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assist request failed";
    const statusCode =
      message.includes("required") || message.includes("Invalid JSON") || message.includes("too large")
        ? 400
        : 500;
    sendJson(res, statusCode, { success: false, message });
    return true;
  }
}

import axios from "axios";

/**
 * Pre-configured axios instance for making authenticated requests to apps/gateway
 * from within apps/agent. Uses the AI_TOOL_SECRET shared secret for authorization
 * so no JWT is needed (these are internal service-to-service calls only).
 */
export const internalApi = axios.create({
  baseURL: (process.env.API_URL || "http://localhost:3002/api/v1").replace(/\/$/, ""),
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    ...(process.env.AI_TOOL_SECRET
      ? { "x-ai-tool-secret": process.env.AI_TOOL_SECRET }
      : {}),
  },
});

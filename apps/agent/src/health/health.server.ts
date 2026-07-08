import http from "http";
import { handleAssistRoute } from "../modules/assist/assist.router";

const HEALTH_PORT = parseInt(process.env.AI_HEALTH_PORT || "4010", 10);

export function startHealthServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = req.url || "/";

    if (await handleAssistRoute(req, res)) {
      return;
    }

    if (url.startsWith("/health") || url.startsWith("/ready")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "not_found" }));
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[Health] Listening on http://localhost:${HEALTH_PORT}`);
  });

  return server;
}

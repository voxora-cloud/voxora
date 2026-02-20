import { Worker, ConnectionOptions } from "bullmq";
import { GoogleGenAI } from "@google/genai";
import { pubRedis } from "./config/redis";
import config from "./config/index";

const QUEUE_NAME = "ai-processing";
const PUBSUB_CHANNEL = "ai:response";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AIJobData {
  conversationId: string;
  content: string;
  messageId: string;
}

export function startWorker() {
  // Pass plain options so BullMQ uses its own bundled ioredis.
  // Never share a pre-built Redis instance across ioredis versions.
  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker<AIJobData, void, string>(
    QUEUE_NAME,
    async (job) => {
      const { conversationId, content } = job.data;

      console.log(
        `[AI Worker] Processing job ${job.id} | conversation: ${conversationId}`,
      );

      // ─── Gemini AI response ────────────────────────────────────────────────
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: content,
      });
      const aiResponse = result.text ?? "Sorry, I could not generate a response.";
      // ───────────────────────────────────────────────────────────────────────

      // Publish to Redis channel — the API subscriber delivers it to the socket
      await pubRedis.publish(
        PUBSUB_CHANNEL,
        JSON.stringify({ conversationId, content: aiResponse }),
      );

      console.log(
        `[AI Worker] Published response for conversation ${conversationId}`,
      );
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[AI Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[AI Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[AI Worker] Worker error:", err);
  });

  console.log(
    `[AI Worker] Started, listening on BullMQ queue: "${QUEUE_NAME}"`,
  );

  return worker;
}

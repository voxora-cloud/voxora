import { Worker, Queue, ConnectionOptions } from "bullmq";
import config from "../config";
import { getBullMQConnection } from "../infrastructure/queue/bullmq.client";
import { FallbackRouter } from "../infrastructure/providers/routing/fallback-router";
import { internalApi } from "../infrastructure/api/internal.client";
import logger from "../utils/logger";

const QUEUE_NAME = "conversation-analyzer";
const BATCH_SIZE = 5; // Optimal batch size for LLM context window and extraction accuracy

export interface AnalyzerJobData {}

export function startConversationAnalysisWorker() {
  const connection = getBullMQConnection();

  // Unified repeatable schedule for checking conversation inactivity and batch analysis
  const queue = new Queue(QUEUE_NAME, { connection });
  queue
    .upsertJobScheduler(
      "conversation-inactivity-check",
      { every: 15 * 60 * 1000 }, // runs every 15 minutes
      { name: "inactivity-check", data: {} },
    )
    .catch((err) => {
      logger.error("Failed to register conversation inactivity job scheduler", {
        error: err.message || err,
      });
    });

  const worker = new Worker<AnalyzerJobData, void, string>(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== "inactivity-check") {
        return;
      }

      logger.info("Starting periodic conversation inactivity scan");
      let closedCount = 0;
      try {
        const closeRes = await internalApi.post(
          "/conversations/ai/close-inactive",
          {
            inactivityLimitMs: 30 * 60 * 1000, // 30 minutes threshold
          },
        );
        closedCount = closeRes.data?.data?.closedCount || 0;
        logger.info("Completed periodic conversation inactivity scan", {
          closedCount,
        });
      } catch (err: any) {
        logger.error("Failed to perform conversation inactivity scan", {
          error: err.message || err,
        });
      }

      // Fetch all pending resolved/closed conversations that need analysis
      logger.info("Fetching conversations pending AI analysis");
      let pendingList: any[] = [];
      try {
        const pendingRes = await internalApi.get(
          "/conversations/ai/pending-analysis",
        );
        pendingList = pendingRes.data?.data || pendingRes.data || [];
        logger.info("Fetched pending conversations for analysis", {
          count: pendingList.length,
        });
      } catch (err: any) {
        logger.error("Failed to fetch pending conversations for analysis", {
          error: err.message || err,
        });
        return;
      }

      if (pendingList.length === 0) {
        logger.info("No conversations pending analysis. Finishing job.");
        return;
      }

      // Filter: Process short/abandoned chats directly without LLM calls
      const toAnalyze: any[] = [];
      for (const conv of pendingList) {
        const userMessages = (conv.messages || []).filter(
          (m: any) => m.role === "user",
        );

        if (userMessages.length < 2) {
          logger.info("Short conversation detected. Bypassing LLM call.", {
            conversationId: conv.conversationId,
            userMessagesCount: userMessages.length,
          });

          const payload = {
            organizationId: conv.organizationId,
            conversationId: conv.conversationId,
            sentiment: "neutral",
            summary:
              userMessages.length === 0
                ? "Visitor abandoned chat without sending any messages."
                : `Short conversation. Visitor sent message: "${userMessages[0]?.content || ""}"`,
            tags: [],
            topics: [],
          };

          try {
            await internalApi.post("/contacts/ai/upsert", payload);
          } catch (err: any) {
            logger.error("Failed to upsert details for short conversation", {
              conversationId: conv.conversationId,
              error: err.response?.data || err.message,
            });
          }
        } else {
          toAnalyze.push(conv);
        }
      }

      if (toAnalyze.length === 0) {
        logger.info(
          "All pending conversations were short chats. Finished batch.",
        );
        return;
      }

      logger.info("Starting batch LLM analysis on filtered conversations", {
        count: toAnalyze.length,
      });

      // Process in batches
      for (let i = 0; i < toAnalyze.length; i += BATCH_SIZE) {
        const batch = toAnalyze.slice(i, i + BATCH_SIZE);
        logger.info(
          `Processing batch of ${batch.length} conversations (${i + 1} to ${Math.min(i + BATCH_SIZE, toAnalyze.length)})`,
        );

        try {
          await processBatchWithLLM(batch);
        } catch (err: any) {
          logger.error(
            "Batch processing failed. Falling back to 1-by-1 sequential analysis for this batch",
            {
              error: err.message,
            },
          );
          // Fallback strategy: Process sequentially if the entire batch fails (e.g. malformed batch output)
          for (const conv of batch) {
            try {
              await processSingleWithLLM(conv);
            } catch (singleErr: any) {
              logger.error("Single conversation fallback analysis failed", {
                conversationId: conv.conversationId,
                error: singleErr.message,
              });
            }
          }
        }
      }

      logger.info("Finished periodic batch conversation analysis run");
    },
    { connection, concurrency: 1 },
  );

  worker.on("completed", (job) =>
    logger.info("Analyzer job completed", {
      jobId: job.id,
      queue: QUEUE_NAME,
    }),
  );

  worker.on("failed", (job, err: any) =>
    logger.error("Analyzer job failed", {
      jobId: job?.id,
      queue: QUEUE_NAME,
      error: err.message,
    }),
  );

  logger.info("Analyzer worker started", {
    queue: QUEUE_NAME,
  });

  return worker;
}

// ── Batch LLM Helper ─────────────────────────────────────────────────────────
async function processBatchWithLLM(batch: any[]) {
  // Format batch transcript
  let combinedTranscripts = "";
  batch.forEach((conv, index) => {
    const formatted = (conv.messages || [])
      .map(
        (m: any) =>
          `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`,
      )
      .join("\n");
    combinedTranscripts += `\n--- START CONVERSATION [${index}] ---\n${formatted}\n--- END CONVERSATION [${index}] ---\n`;
  });

  const systemPrompt = `You are an expert CRM data extractor. You will be provided with a batch of chat transcripts, each wrapped in indicators like "START CONVERSATION [index]" and "END CONVERSATION [index]".
Analyze each transcript between the visitor and the assistant, and extract contact details and insights.
Return ONLY a valid JSON array of objects matching this schema:
[
  {
    "index": number (the matching index of the conversation, e.g. 0, 1, 2),
    "name": "Visitor's name if disclosed (do not guess, leave empty string if not provided)",
    "phone": "Visitor's phone if disclosed (leave empty string if not provided)",
    "company": "Visitor's company if disclosed (leave empty string if not provided)",
    "tags": ["1-3 relevant categorizing tags based on the conversation topic"],
    "sentiment": "positive", "neutral", or "negative",
    "summary": "A concise 1-2 sentence summary of what the visitor wanted",
    "topics": ["1-3 main topics discussed"]
  }
]
Do not wrap the JSON in markdown code blocks or add any explanations. Output only raw JSON.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: combinedTranscripts },
  ];

  const firstConv = batch[0];
  const llmResult = await FallbackRouter.generate(messages, {
    tools: [],
    toolContext: {
      organizationId: firstConv.organizationId,
      conversationId: firstConv.conversationId,
      messageId: `batch-analysis-${Date.now()}`,
    },
  });

  let results: any[] = [];
  try {
    const cleanedText = llmResult.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();
    results = JSON.parse(cleanedText);
  } catch (err: any) {
    throw new Error(`Failed to parse batch LLM JSON response: ${err.message}`);
  }

  if (!Array.isArray(results)) {
    throw new Error("LLM did not return a valid JSON array");
  }

  // Map and save each extraction result
  for (const item of results) {
    const idx = item.index;
    const conv = batch[idx];
    if (!conv) continue;

    const payload = {
      organizationId: conv.organizationId,
      conversationId: conv.conversationId,
      name: item.name?.trim() || undefined,
      phone: item.phone?.trim() || undefined,
      company: item.company?.trim() || undefined,
      tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
      sentiment: ["positive", "neutral", "negative"].includes(item.sentiment)
        ? item.sentiment
        : "neutral",
      summary: item.summary || "Conversation completed.",
      topics: Array.isArray(item.topics) ? item.topics.filter(Boolean) : [],
    };

    try {
      await internalApi.post("/contacts/ai/upsert", payload);
      logger.info("Successfully updated contact details via batched analysis", {
        conversationId: conv.conversationId,
        name: payload.name,
      });
    } catch (err: any) {
      logger.error(
        "Failed to upsert contact details for batched conversation",
        {
          conversationId: conv.conversationId,
          error: err.response?.data || err.message,
        },
      );
    }
  }
}

// ── Single Fallback LLM Helper ────────────────────────────────────────────────
async function processSingleWithLLM(conv: any) {
  const formatted = (conv.messages || [])
    .map(
      (m: any) =>
        `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`,
    )
    .join("\n");

  const systemPrompt = `You are an expert CRM data extractor. Analyze the following chat transcript.
Extract the visitor's contact information and insights.
Return ONLY a valid JSON object matching this schema:
{
  "name": "Visitor's name if disclosed (leave empty string if not provided)",
  "phone": "Visitor's phone if disclosed (leave empty string if not provided)",
  "company": "Visitor's company if disclosed (leave empty string if not provided)",
  "tags": ["1-3 relevant categorizing tags"],
  "sentiment": "positive", "neutral", or "negative",
  "summary": "A concise 1-2 sentence summary of what the visitor wanted",
  "topics": ["1-3 main topics discussed"]
}
Do not wrap the JSON in markdown code blocks. Output only raw JSON.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `Transcript:\n${formatted}` },
  ];

  const llmResult = await FallbackRouter.generate(messages, {
    tools: [],
    toolContext: {
      organizationId: conv.organizationId,
      conversationId: conv.conversationId,
      messageId: `analysis-fallback-${Date.now()}`,
    },
  });

  const cleanedText = llmResult.text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const extracted = JSON.parse(cleanedText);

  const payload = {
    organizationId: conv.organizationId,
    conversationId: conv.conversationId,
    name: extracted.name?.trim() || undefined,
    phone: extracted.phone?.trim() || undefined,
    company: extracted.company?.trim() || undefined,
    tags: Array.isArray(extracted.tags) ? extracted.tags.filter(Boolean) : [],
    sentiment: ["positive", "neutral", "negative"].includes(extracted.sentiment)
      ? extracted.sentiment
      : "neutral",
    summary: extracted.summary || "Conversation completed.",
    topics: Array.isArray(extracted.topics)
      ? extracted.topics.filter(Boolean)
      : [],
  };

  try {
    await internalApi.post("/contacts/ai/upsert", payload);
    logger.info(
      "Successfully updated contact details via fallback single analysis",
      {
        conversationId: conv.conversationId,
        name: payload.name,
      },
    );
  } catch (err: any) {
    logger.error(
      "Failed to upsert contact details for single conversation fallback",
      {
        conversationId: conv.conversationId,
        error: err.response?.data || err.message,
      },
    );
    throw err;
  }
}

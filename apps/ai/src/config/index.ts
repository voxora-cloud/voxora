const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    ingestionConcurrency: parseInt(process.env.INGESTION_CONCURRENCY || "2", 10),
  },
  llm: {
    /** e.g. "gemini" | "openai" | "anthropic" — must match a registered provider name */
    provider: process.env.LLM_PROVIDER || "gemini",
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    },
  },
  ai: {
    systemPrompt:
      "You are a helpful customer support assistant. Be concise, friendly, and accurate.",
  },
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || "gemini",
    geminiModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    /** Number of similar chunks to inject into context (RAG) */
    ragTopK: parseInt(process.env.RAG_TOP_K || "5", 10),
  },
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY || "",
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET_NAME || "voxora",
  },
};

export default config;

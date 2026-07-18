const config = {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    ingestionConcurrency: parseInt(process.env.INGESTION_CONCURRENCY || "2", 10),
  },
  llm: {
    provider: process.env.LLM_PROVIDER,
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    },
    bedrock: {
      region: process.env.AWS_REGION || "us-east-1",
      model: process.env.BEDROCK_MODEL || "us.amazon.nova-pro-v1:0",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    ollama: {
      host: process.env.OLLAMA_HOST || "localhost",
      port: parseInt(process.env.OLLAMA_PORT || "11434", 10),
      model: process.env.OLLAMA_MODEL || "llama3.2",
    },
    huggingface: {
      token: process.env.HF_TOKEN,
      model: process.env.HF_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
      endpointUrl: process.env.HF_ENDPOINT_URL,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
  },
  ai: {
    systemPrompt:
      "You are a helpful customer support assistant. Be concise, friendly, and accurate.",
  },
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || "bedrock",
    geminiModel: process.env.GEMINI_EMBEDDING_MODEL,
    bedrock: {
      model: process.env.BEDROCK_EMBEDDING_MODEL || "amazon.titan-embed-text-v2:0",
      dimensions: parseInt(process.env.BEDROCK_EMBEDDING_DIMENSIONS || "1024", 10),
    },
    ollama: {
      model: process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
      dimensions: parseInt(process.env.OLLAMA_EMBEDDING_DIMENSIONS || "1024", 10),
    },
    huggingface: {
      model: process.env.HF_EMBEDDING_MODEL || "BAAI/bge-large-en-v1.5",
      dimensions: parseInt(process.env.HF_EMBEDDING_DIMENSIONS || "1024", 10),
      endpointUrl: process.env.HF_EMBEDDING_ENDPOINT_URL,
    },
    openai: {
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || "1024", 10),
    },
    ragTopK: parseInt(process.env.RAG_TOP_K || "5", 10),
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET_NAME,
  },
};

export default config;
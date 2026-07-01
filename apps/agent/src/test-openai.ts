import dotenv from "dotenv";
import path from "path";
// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

import { OpenAILLMProvider } from "./infrastructure/providers/openai/openai-llm.provider";
import { OpenAIEmbeddingProvider } from "./infrastructure/providers/openai/openai-embedding.provider";

async function runTests() {
  console.log("=== OpenAI Provider Verification ===");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set.");
    process.exit(1);
  }
  console.log("OPENAI_API_KEY is loaded successfully.");

  // 1. LLM Provider Test (Non-streaming)
  console.log("\n--- Testing OpenAILLMProvider (Non-Streaming) ---");
  const llmProvider = new OpenAILLMProvider();
  
  try {
    const res = await llmProvider.generate([
      { role: "system", content: "You are a brief, helpful assistant." },
      { role: "user", content: "Hello! Say 'OpenAI LLM is working' and nothing else." },
    ]);
    console.log("LLM Response:\n", res.text);
  } catch (err) {
    console.error("LLM Generation failed:", err);
  }

  // 2. LLM Provider Test (Streaming)
  console.log("\n--- Testing OpenAILLMProvider (Streaming) ---");
  try {
    process.stdout.write("Streaming LLM Response: ");
    const resStream = await llmProvider.generate(
      [
        { role: "system", content: "You are a brief assistant." },
        { role: "user", content: "Count from 1 to 5 with commas, and nothing else." },
      ],
      {
        onStream: (chunk) => {
          process.stdout.write(chunk);
        },
      }
    );
    console.log("\nFinal accumulated text:", resStream.text);
  } catch (err) {
    console.error("\nLLM Streaming failed:", err);
  }

  // 3. Embedding Provider Test
  console.log("\n--- Testing OpenAIEmbeddingProvider ---");
  const embeddingProvider = new OpenAIEmbeddingProvider();
  try {
    const vector = await embeddingProvider.embed("OpenAI embeddings are working perfectly.");
    console.log("Successfully generated embedding vector!");
    console.log("Dimensions:", vector.length);
    console.log("Sample (first 5 elements):", vector.slice(0, 5));
  } catch (err) {
    console.error("Embedding generation failed:", err);
  }
}

runTests().catch(console.error);

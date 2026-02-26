export interface EmbeddingProvider {
  /** Unique identifier, e.g. "gemini", "openai" */
  readonly name: string;
  /** Size of the vector this provider produces (e.g. 3072 for gemini-embedding-001) */
  readonly dimensions: number;
  /**
   * Generate a single embedding vector for the given text.
   * For batch embed, call in parallel with Promise.all.
   */
  embed(text: string): Promise<number[]>;
}

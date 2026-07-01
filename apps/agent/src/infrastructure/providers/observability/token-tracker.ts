import { LLMTokenUsage } from "../types/ai.types";

/**
 * Accumulates token usage across multiple streaming chunks or loop iterations.
 */
export class TokenTracker {
  private _prompt = 0;
  private _completion = 0;

  /** Merge a usage snapshot returned by the provider */
  accumulate(usage: LLMTokenUsage | undefined): void {
    if (!usage) return;
    this._prompt += usage.promptTokens ?? 0;
    this._completion += usage.completionTokens ?? 0;
  }

  get promptTokens(): number {
    return this._prompt;
  }

  get completionTokens(): number {
    return this._completion;
  }

  get totalTokens(): number {
    return this._prompt + this._completion;
  }

  toUsage(): LLMTokenUsage {
    return {
      promptTokens: this._prompt,
      completionTokens: this._completion,
      totalTokens: this.totalTokens,
    };
  }
}

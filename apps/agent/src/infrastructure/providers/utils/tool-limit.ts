export const TOOL_LIMIT_FINAL_RESPONSE_INSTRUCTION = `
The tool-call limit has now been reached. Do not call, request, or emit any more
tools. Generate the final response to the client using only the conversation,
retrieved knowledge, RAG context, and tool results already available above.
Answer as helpfully and completely as the available information allows. If an
important detail is still unavailable, say so clearly without attempting
another tool call.
`.trim();

export function cleanFinalResponse(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<(thinking|thought)>[\s\S]*$/gi, "")
    .replace(/<\/?(?:thinking|thought)>/gi, "")
    .trim();
}

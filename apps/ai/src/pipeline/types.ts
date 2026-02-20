export interface AIJobData {
  conversationId: string;
  content: string;
  messageId: string;
  /** Team that owns this conversation — used to scope RAG search */
  teamId?: string;
}

export interface PipelineResult {
  conversationId: string;
  response: string;
}

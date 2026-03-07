export interface AIJobData {
  organizationId: string;
  conversationId: string;
  content: string;
  messageId: string;
  /** Team that owns this conversation — used to scope RAG search */
  teamId?: string;
  /** Display name of the company whose widget initiated the conversation */
  companyName?: string;
}

export interface PipelineResult {
  conversationId: string;
  response: string;
}

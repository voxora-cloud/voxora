export interface AIJobData {
  organizationId: string;
  conversationId: string;
  content: string;
  messageId: string;
  /** Display name of the company whose widget initiated the conversation */
  companyName?: string;
}

export interface PipelineResult {
  conversationId: string;
  response: string;
}

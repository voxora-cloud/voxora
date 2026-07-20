import { ChannelPromptConfig } from "../types";

const style = `Professional email etiquette:
- Always include a formal greeting (e.g., "Dear [Name],") and a formal closing using the company name (e.g., "Best regards, the [Company] Team" or "Best regards, [Company] Team"). Do NOT use generic signatures like "InteraOne Support Team" unless the company name is InteraOne.
- Use clean, structured paragraphs with a blank line between each paragraph.
- Ensure the tone is extremely polite, detailed, and complete.
- Use standard Markdown formatting. Do not use HTML.
- When human agent escalation is requested by the user, you MUST call the "escalate_to_human" tool.
- After calling the "escalate_to_human" tool, you MUST output a response exactly in the following format (substitute [Name] and [Email] with the user's name and email address from the conversation details):

Dear [Name],

I've saved your contact details so the right team member can follow up with you.

Your inquiry has been noted and will be assigned to a member of our team. They'll be reaching out to you at [Email] shortly.

If you want to continue talking with me, please create a new email instead of replying to this thread. This thread is now connected to a human agent who will continue the conversation; the AI assistant is only available on a new email thread.

If there's anything else I can help you with in the meantime, please don't hesitate to let me know.

Best regards,
the [Company] Team

Do NOT deviate from this response format when escalating.`;

const idVerification = `Email channel = identity ALREADY VERIFIED. No OTP needed. Full access to tickets/CRM linked to their email.`;

const getVisitorInfoInstructions = (fieldList: string): string =>
    `Proactively ask for missing fields: ${fieldList}. Be conversational, explain why useful.`;

export const emailConfig: ChannelPromptConfig = {
    style,
    idVerification,
    getVisitorInfoInstructions,
};
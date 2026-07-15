import { ChannelPromptConfig } from "../types";

const style = `Professional email etiquette:
- Always include a formal greeting (e.g., "Dear [Name],") and a formal closing (e.g., "Best regards, [Company] Support Team").
- Use clean, structured paragraphs with a blank line between each paragraph.
- Ensure the tone is extremely polite, detailed, and complete.
- Use standard Markdown formatting. Do not use HTML.`;

const idVerification = `Email channel = identity ALREADY VERIFIED. No OTP needed. Full access to tickets/CRM linked to their email.`;

const getVisitorInfoInstructions = (fieldList: string): string =>
    `Proactively ask for missing fields: ${fieldList}. Be conversational, explain why useful.`;

export const emailConfig: ChannelPromptConfig = {
    style,
    idVerification,
    getVisitorInfoInstructions,
};
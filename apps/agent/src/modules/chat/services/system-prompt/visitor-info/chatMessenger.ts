import { ChannelPromptConfig } from "../types";
import { OTP_ID_VERIFICATION } from "../sections/otpVerification";

const style = `Extremely brief, chat-friendly mobile layout:
- Write short, punchy lines with active spacing and emojis (e.g., 👍, 😊, 🚀, ⏳) to keep it lively.
- Use bullet points and newlines to break up text instead of long paragraphs.
- No formal greeting headers or signature footers. Just answer directly.
- Use standard markdown only.
- Do NOT use interactive HTML tags (like <interaone-button>, <interaone-radio>, or <interaone-form>).
- Instead, always end your message with a brief, natural follow-up question to guide the conversation.`;

const getVisitorInfoInstructions = (fieldList: string): string =>
    `Proactively ask for missing fields: ${fieldList}. Be conversational, explain why useful.`;

/**
 * Shared by both "whatsapp" and "telegram" — they behave identically today.
 * If they ever diverge, split into chatMessenger.ts -> whatsapp.ts / telegram.ts.
 */
export const chatMessengerConfig: ChannelPromptConfig = {
    style,
    idVerification: OTP_ID_VERIFICATION,
    getVisitorInfoInstructions,
};
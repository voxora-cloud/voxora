import { ChannelPromptConfig } from "../types";
import { OTP_ID_VERIFICATION } from "../sections/otpVerification";

const style = `Concise, direct, and operational. Short paragraphs and step-by-step bullet points.
- Use Markdown tables only when the visitor asks for tabular data or when presenting a compact comparison, pricing, schedule, or similarly structured dataset.
- Keep tables small: at most 4 columns and 8 data rows. Keep every cell brief. Never put paragraphs, explanations, or long sentences inside table cells.
- If the information needs lengthy descriptions or does not benefit from column-by-column comparison, use short bullets with bold labels instead.
- For normal answers, use clear headings only when useful, short paragraphs, and concise bullet points.

INTERACTIVE-FIRST RULE (mandatory):
- Default to an interactive component instead of plain text whenever ANY of these apply: you present 2+ options, ask a yes/no question, request any field of info, offer a next step, or list actions the visitor could take. Plain text lists of choices are NOT allowed in these cases — convert them into buttons, radios, or checkboxes.
- Rule of thumb: if your draft response contains the words "you can", "would you like", "options include", "choose", or a numbered/bulleted list of choices — stop and re-render that list as interactive components instead.
- Components:
  * Inputs: <interaone-input name="[unique_field_name]" placeholder="[placeholder_text]" />
  * Buttons: <interaone-button action="[action_text]">[Button Label]</interaone-button>
  * Checkboxes: <interaone-checkbox name="[field_name]">[Checkbox Label]</interaone-checkbox>
  * Radios: <interaone-radio name="[group_name]" options="[comma,separated,values]" />
- When offering 2-4 quick choices (not full form fields), prefer a row of buttons over a radio group — buttons feel more "clickable" and visual. Wrap them in a flex div:
  <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0;">
    <interaone-button action="Tell me about pricing">Pricing</interaone-button>
    <interaone-button action="Book a demo">Book a demo</interaone-button>
  </div>
- When offering 5+ choices, or choices that map to a single logical group (e.g. plan tiers, satisfaction rating), use a radio group inside a grid div instead of stacking buttons.
- If you are requesting MULTIPLE fields or options, you MUST wrap all of them inside a single <interaone-form id="[unique_form_id]"> container so that they render as a single form with one submit button. Example:
  "Please give your feedback: <interaone-form id="feedback_form"><interaone-radio name="rating" options="1,2,3,4,5" /><interaone-input name="comments" placeholder="Optional comments..." /></interaone-form>"
- You are allowed and highly encouraged to use <div> tags with inline styles (e.g., style="display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0;" for buttons side-by-side, or style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" for grids) to wrap, layout, structure, or style interactive elements beautifully. Apart from standard markdown and styled <div> tags, do not use other custom HTML.
- At the bottom of EVERY single message you write, you MUST include 2-3 interactive suggestion buttons wrapped in a flex div (using <interaone-button action="[exact text visitor would send]">[Button Label]</interaone-button>). These MUST be follow-up questions directly related to the retrieved facts, uploaded knowledge, or FAQ topics, allowing the visitor to quickly click to explore available organization facts.
- Never send a bare list of clickable-sounding options as plain markdown bullets — that pattern must always become buttons or radios.`;
const idVerification = OTP_ID_VERIFICATION;

const getVisitorInfoInstructions = (fieldList: string): string => `Proactively collect missing fields: ${fieldList}.
- You MUST render an interactive form to collect the missing fields in a single step using a <interaone-form> container:
  * To ask for name and email, write: "Please fill in your contact details: <interaone-form id="contact_details"><interaone-input name="name" placeholder="Your name" /><interaone-input name="email" placeholder="Your email address" /></interaone-form>"
- Do NOT ask for multiple fields in separate steps or plain text. Always group them in one <interaone-form> container.
- If the visitor asks about their past/previous conversations or chat history, explain that once they verify/provide both their Name and Email address using the contact form, their historical conversations will automatically be restored and synced.`;

export const widgetConfig: ChannelPromptConfig = {
  style,
  idVerification,
  getVisitorInfoInstructions,
};
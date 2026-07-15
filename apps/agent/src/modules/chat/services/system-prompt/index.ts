import { BuildSystemPromptOptions } from "./types";
import { getChannelConfig } from "./channels";
import { RULES } from "./sections/rules";
import { TOOLS_SECTION } from "./sections/tools";
import { RESOLUTION_SECTION } from "./sections/resolution";
import { buildEscalationSection } from "./sections/escalation";
import { getVisitorFieldSummary } from "./sections/visitorFields";
import { buildKnownVisitorSection } from "./sections/knownVisitor";
import { AGENTIC_PRINCIPLES } from "./sections/agenticPrinciples";

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
    const {
        companyName,
        fallbackToAgent,
        collectUserInfo,
        knownVisitorDetails,
        channel,
    } = opts;

    const company =
        companyName?.trim() || process.env.AI_COMPANY_NAME || "our company";

    const channelConfig = getChannelConfig(channel);
    const { wantsAny, enabled, fieldList } = getVisitorFieldSummary(collectUserInfo);

    const visitorInfoInstructions = wantsAny
        ? channelConfig.getVisitorInfoInstructions(fieldList)
        : "";

    const escalationSection = buildEscalationSection(fallbackToAgent);
    const knownVisitorSection = buildKnownVisitorSection(knownVisitorDetails);

    return `<system>
You are the autonomous support agent for ${company}. Your role: fully resolve visitor requests — product questions, organization information, and support workflows — end to end, not just answer the literal last message.

${AGENTIC_PRINCIPLES}

${RULES}

<response_style>
${channelConfig.style}
</response_style>

${TOOLS_SECTION}

<identity_verification>
${channelConfig.idVerification}
This gate is never skipped for autonomy, urgency, or visitor insistence — it is the one place agentic chaining always pauses for visitor input.
</identity_verification>

<visitor_info enabled="${enabled}">
${visitorInfoInstructions}
ONLY call update_contact_profile when BOTH a valid name and a valid email address have been successfully provided by the visitor. Having both name and email is STRICTLY MANDATORY before saving contact details. Respect refusals — don't ask again. never fabricate.
</visitor_info>

${RESOLUTION_SECTION}

${escalationSection}
${knownVisitorSection}
</system>`;
}
export function buildEscalationSection(fallbackToAgent: boolean): string {
    const body = fallbackToAgent
        ? `Even if the visitor explicitly requests a human agent or support, do NOT call escalate_to_human immediately. First, explain that you can assist, ask what problem they are trying to solve, and try your absolute best to solve their problem autonomously — chaining knowledge_retrieval, faq_retrieval, and reformulated retries as needed — or offer to create a ticket using create_ticket if it cannot be resolved immediately. CRITICAL: After successfully creating a ticket with create_ticket, do NOT automatically call escalate_to_human. The ticket is the resolution — inform the user that their ticket has been created and the support team will follow up. Only call escalate_to_human if the user explicitly asks for a human agent AFTER the ticket has already been created. If they insist on human support without a ticket, you MUST first collect their name and email address, call update_contact_profile to save/create their contact profile, and only then call escalate_to_human. Contact creation is strictly mandatory before escalating, with no exception for insistence or urgency.`
        : `Escalation disabled. Don't mention or offer human agents.`;

    return `<escalation enabled="${fallbackToAgent}">
${body}
</escalation>`;
}
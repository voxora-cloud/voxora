import { KnownVisitorDetails } from "../../../chat.types";

export function buildKnownVisitorSection(
    knownVisitorDetails?: KnownVisitorDetails
): string {
    const knownLines = [
        knownVisitorDetails?.name ? `name: ${knownVisitorDetails.name}` : "",
        knownVisitorDetails?.email ? `email: ${knownVisitorDetails.email}` : "",
    ].filter(Boolean);

    if (knownLines.length === 0) return "";

    return `\n<known_visitor>\nVisitor already provided: ${knownLines.join(
        ", "
    )}. Reuse for tickets, don't ask again.\n</known_visitor>`;
}
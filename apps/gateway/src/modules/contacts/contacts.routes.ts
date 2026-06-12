import { Router } from "express";
import {
	authenticate,
	resolveOrganization,
	requireRole,
	validateRequest,
	validateAiSecret,
} from "@shared/security/middleware";
import { ContactsController } from "./contacts.controller";
import { contactsSchema } from "./contacts.schema";

const router = Router();

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ──────────────────────────

// Seek contact by email/phone/name
router.get(
	"/ai/seek",
	validateAiSecret,
	ContactsController.aiSeekContact,
);

// Internal endpoint called by AI tool (authenticated by shared secret header).
router.post(
	"/ai/upsert",
	validateRequest(contactsSchema.upsertFromAI),
	ContactsController.upsertFromAI,
);

// ─── Agent UI Routes (JWT required) ─────────────────────────────────────────

router.use(authenticate);
router.use(resolveOrganization);

router.get(
	"/",
	validateRequest(contactsSchema.listContactsQuery, "query"),
	requireRole("agent"),
	ContactsController.listContacts,
);

export default router;
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

/**
 * @openapi
 * /contacts/ai/seek:
 *   get:
 *     summary: Search for a contact from AI context
 *     tags:
 *       - Contacts
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact details found and returned
 *       404:
 *         description: Contact not found
 */
router.get(
	"/ai/seek",
	validateAiSecret,
	ContactsController.aiSeekContact,
);

// Internal endpoint called by AI tool (authenticated by shared secret header).

/**
 * @openapi
 * /contacts/ai/upsert:
 *   post:
 *     summary: Upsert contact details from AI context
 *     tags:
 *       - Contacts
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact upserted successfully
 */
router.post(
	"/ai/upsert",
	validateRequest(contactsSchema.upsertFromAI),
	ContactsController.upsertFromAI,
);

// ─── Agent UI Routes (JWT required) ─────────────────────────────────────────

router.use(authenticate);
router.use(resolveOrganization);

/**
 * @openapi
 * /contacts:
 *   get:
 *     summary: Retrieve list of contacts for the organization
 *     tags:
 *       - Contacts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved list of contacts
 */
router.get(
	"/",
	validateRequest(contactsSchema.listContactsQuery, "query"),
	requireRole("agent"),
	ContactsController.listContacts,
);

export default router;
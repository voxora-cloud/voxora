import { Router } from "express";
import * as WidgetController from "./widget.controller";
import { validateRequest, authenticateWidget, authenticate, requireRole } from "@shared/security/middleware";
import { widgetSchema } from "./widget.schema";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     WidgetDomain:
 *       type: object
 *       required:
 *         - _id
 *         - domain
 *         - status
 *         - includeSubdomains
 *       properties:
 *         _id:
 *           type: string
 *           description: Domain record identifier. Legacy records use the value legacy.
 *           example: 507f1f77bcf86cd799439011
 *         domain:
 *           type: string
 *           format: hostname
 *           description: Normalized parent domain authorized for the widget.
 *           example: example.com
 *         verificationToken:
 *           type: string
 *           nullable: true
 *           description: DNS TXT value returned while verification is pending.
 *           example: interaone_1234567890abcdef
 *         status:
 *           type: string
 *           enum:
 *             - pending
 *             - verified
 *           example: verified
 *         includeSubdomains:
 *           type: boolean
 *           description: Always true. A verified parent domain automatically authorizes its subdomains.
 *           example: true
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     WidgetDomainResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/WidgetDomain'
 *     WidgetDomainListResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WidgetDomain'
 *     WidgetDomainVerificationResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Domain verified successfully
 *         data:
 *           type: object
 *           required:
 *             - domainVerificationStatus
 *             - verifiedDomain
 *           properties:
 *             domainVerificationStatus:
 *               type: string
 *               enum:
 *                 - verified
 *             verifiedDomain:
 *               type: string
 *               format: hostname
 *               example: example.com
 *     WidgetDomainError:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 */

// Admin widget management

/**
 * @openapi
 * /widget/manage:
 *   post:
 *     summary: Create organization widget settings
 *     tags:
 *       - Widget
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Widget created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/manage",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.createWidget),
  WidgetController.createWidget,
);

/**
 * @openapi
 * /widget/manage:
 *   get:
 *     summary: Get organization widget settings
 *     tags:
 *       - Widget
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Widget configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/manage",
  authenticate,
  requireRole("admin"),
  WidgetController.getWidget,
);

/**
 * @openapi
 * /widget/manage:
 *   put:
 *     summary: Update organization widget settings
 *     tags:
 *       - Widget
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               themeColor:
 *                 type: string
 *               welcomeMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Widget configuration updated successfully
 */
router.put(
  "/manage",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.updateWidget),
  WidgetController.updateWidget,
);

/**
 * @openapi
 * /widget/verify-domain:
 *   post:
 *     summary: Verify organization widget domain using DNS TXT record
 *     tags:
 *       - Widget
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Domain verified successfully
 *       400:
 *         description: DNS TXT verification failed or domain verification not set up
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/verify-domain",
  authenticate,
  requireRole("agent"),
  WidgetController.verifyDomain,
);

/**
 * @openapi
 * /widget/domains:
 *   get:
 *     summary: List configured widget domains
 *     description: >-
 *       Returns every domain configured for the active organization. Verified
 *       parent domains automatically authorize all matching subdomains.
 *     tags:
 *       - Widget Domains
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Widget domains retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainListResponse'
 *       401:
 *         description: Authentication token is missing or invalid
 *       403:
 *         description: Organization administrator access is required
 *       404:
 *         description: Widget configuration was not found
 */
router.get(
  "/domains",
  authenticate,
  requireRole("admin"),
  WidgetController.listDomains,
);

/**
 * @openapi
 * /widget/domains:
 *   post:
 *     summary: Add a widget domain
 *     description: >-
 *       Adds a normalized parent domain to the active organization. Production
 *       domains receive a DNS TXT verification token unless an already verified
 *       parent domain covers the submitted hostname. Subdomains are included
 *       automatically after parent verification.
 *     tags:
 *       - Widget Domains
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *             properties:
 *               domain:
 *                 type: string
 *                 format: hostname
 *                 example: example.com
 *               includeSubdomains:
 *                 type: boolean
 *                 default: true
 *                 deprecated: true
 *                 description: Retained for compatibility. Subdomains are always included.
 *     responses:
 *       201:
 *         description: Widget domain added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainResponse'
 *       400:
 *         description: The submitted domain is invalid
 *       401:
 *         description: Authentication token is missing or invalid
 *       403:
 *         description: Organization administrator access is required
 *       404:
 *         description: Widget configuration was not found
 *       409:
 *         description: The domain is already configured
 */
router.post(
  "/domains",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.addDomain),
  WidgetController.addDomain,
);

/**
 * @openapi
 * /widget/domains/{domainId}:
 *   patch:
 *     summary: Update a widget domain
 *     description: >-
 *       Replaces the hostname for an existing domain record. Changing the
 *       hostname resets DNS verification unless a verified parent domain
 *       already covers the new hostname.
 *     tags:
 *       - Widget Domains
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         description: Domain record identifier or legacy for a migrated record.
 *         schema:
 *           type: string
 *           pattern: '^(legacy|[a-fA-F0-9]{24})$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *                 format: hostname
 *                 example: help.example.com
 *               includeSubdomains:
 *                 type: boolean
 *                 default: true
 *                 deprecated: true
 *                 description: Retained for compatibility. Subdomains are always included.
 *     responses:
 *       200:
 *         description: Widget domain updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainResponse'
 *       400:
 *         description: Request parameters or body are invalid
 *       401:
 *         description: Authentication token is missing or invalid
 *       403:
 *         description: Organization administrator access is required
 *       404:
 *         description: Widget or domain record was not found
 *       409:
 *         description: The replacement domain is already configured
 */
router.patch(
  "/domains/:domainId",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.domainParams, "params"),
  validateRequest(widgetSchema.updateDomain),
  WidgetController.updateDomain,
);

/**
 * @openapi
 * /widget/domains/{domainId}:
 *   delete:
 *     summary: Remove a widget domain
 *     description: >-
 *       Removes the domain and revokes widget authorization for the parent
 *       hostname and all of its subdomains. The response contains the remaining
 *       configured domains.
 *     tags:
 *       - Widget Domains
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         description: Domain record identifier or legacy for a migrated record.
 *         schema:
 *           type: string
 *           pattern: '^(legacy|[a-fA-F0-9]{24})$'
 *     responses:
 *       200:
 *         description: Widget domain removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainListResponse'
 *       400:
 *         description: The domain identifier is invalid
 *       401:
 *         description: Authentication token is missing or invalid
 *       403:
 *         description: Organization administrator access is required
 *       404:
 *         description: Widget or domain record was not found
 */
router.delete(
  "/domains/:domainId",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.domainParams, "params"),
  WidgetController.removeDomain,
);

/**
 * @openapi
 * /widget/domains/{domainId}/verify:
 *   post:
 *     summary: Verify a widget domain using DNS
 *     description: >-
 *       Resolves the domain TXT records and verifies the InteraOne token. A
 *       verified parent domain automatically verifies configured descendants
 *       and authorizes current and future subdomains.
 *     tags:
 *       - Widget Domains
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         description: Domain record identifier or legacy for a migrated record.
 *         schema:
 *           type: string
 *           pattern: '^(legacy|[a-fA-F0-9]{24})$'
 *     responses:
 *       200:
 *         description: Domain verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainVerificationResponse'
 *       400:
 *         description: DNS records are missing, have not propagated, or do not contain the verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WidgetDomainError'
 *       401:
 *         description: Authentication token is missing or invalid
 *       403:
 *         description: Organization agent access or higher is required
 *       404:
 *         description: Widget or domain record was not found
 */
router.post(
  "/domains/:domainId/verify",
  authenticate,
  requireRole("agent"),
  validateRequest(widgetSchema.domainParams, "params"),
  WidgetController.verifyDomainById,
);

// Widget auth

/**
 * @openapi
 * /widget/auth/token:
 *   post:
 *     summary: Generate authentication token for widget session
 *     tags:
 *       - Widget
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - widgetKey
 *             properties:
 *               widgetKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Widget session token generated successfully
 */
router.post("/auth/token", WidgetController.generateWidgetToken);

/**
 * @openapi
 * /widget/auth/validate:
 *   post:
 *     summary: Validate widget session token
 *     tags:
 *       - Widget
 *     parameters:
 *       - in: header
 *         name: x-widget-token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session token is valid
 *       401:
 *         description: Invalid or expired token
 */
router.post("/auth/validate", authenticateWidget, WidgetController.validateWidgetToken);

// Public config fetch for widget rendering on end-user sites

/**
 * @openapi
 * /widget/config:
 *   get:
 *     summary: Fetch public widget settings/configuration by public key
 *     tags:
 *       - Widget
 *     parameters:
 *       - in: query
 *         name: InteraOnePublicKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public widget configuration retrieved successfully
 */
router.get("/config", WidgetController.getWidgetConfig);

// Public QR scan tracking

/**
 * @openapi
 * /widget/qr-scan:
 *   post:
 *     summary: Track public QR code scan events
 *     tags:
 *       - Widget
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrId
 *             properties:
 *               qrId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event tracked successfully
 */
router.post(
  "/qr-scan",
  validateRequest(widgetSchema.qrScan),
  WidgetController.trackQrScan,
);

// Widget conversations

/**
 * @openapi
 * /widget/conversations:
 *   post:
 *     summary: Initialize a new chat conversation session from widget
 *     tags:
 *       - Widget
 *     parameters:
 *       - in: header
 *         name: x-widget-token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation session initialized successfully
 */
router.post(
  "/conversations",
  authenticateWidget,
  validateRequest(widgetSchema.createConversation),
  WidgetController.initConversation,
);

/**
 * @openapi
 * /widget/conversations:
 *   get:
 *     summary: Get conversation history list for current widget session
 *     tags:
 *       - Widget
 *     parameters:
 *       - in: header
 *         name: x-widget-token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation history list retrieved successfully
 */
router.get(
  "/conversations",
  authenticateWidget,
  WidgetController.getWidgetConversations,
);

/**
 * @openapi
 * /widget/conversations/{conversationId}/messages:
 *   get:
 *     summary: Retrieve message history for a specific conversation session
 *     tags:
 *       - Widget
 *     parameters:
 *       - in: header
 *         name: x-widget-token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages history retrieved successfully
 */
router.get(
  "/conversations/:conversationId/messages",
  authenticateWidget,
  WidgetController.getConversationMessages,
);

export default router

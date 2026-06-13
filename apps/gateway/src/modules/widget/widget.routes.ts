import { Router } from "express";
import * as WidgetController from "./widget.controller";
import { validateRequest, authenticateWidget, authenticate, requireRole } from "@shared/security/middleware";
import { widgetSchema } from "./widget.schema";

const router = Router();

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

export default router;
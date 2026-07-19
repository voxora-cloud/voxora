import { Router } from "express";
import {
  authenticate,
  resolveOrganization,
  requireRole,
} from "@shared/security/middleware";
import * as TemplatesController from "./templates.controller";

const router = Router();

router.use(authenticate, resolveOrganization);

/**
 * @openapi
 * /templates:
 *   get:
 *     summary: Get all message templates for the organization
 *     tags:
 *       - Templates
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       shortcut:
 *                         type: string
 *                       category:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/", requireRole("agent"), TemplatesController.getTemplates);

/**
 * @openapi
 * /templates:
 *   post:
 *     summary: Create a new message template
 *     tags:
 *       - Templates
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               shortcut:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid input or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 */
router.post("/", requireRole("admin"), TemplatesController.createTemplate);

/**
 * @openapi
 * /templates/{id}:
 *   patch:
 *     summary: Update an existing message template
 *     tags:
 *       - Templates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               shortcut:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Template not found
 */
router.patch("/:id", requireRole("admin"), TemplatesController.updateTemplate);

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     summary: Delete a message template
 *     tags:
 *       - Templates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Template not found
 */
router.delete("/:id", requireRole("admin"), TemplatesController.deleteTemplate);

export default router;

import { Router } from "express";
import * as controller from "./document.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";

/**
 * Document routes — mounted at /api/v1/documents.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document / scan attachment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Document uploaded }
 */
router.post("/upload", controller.upload);

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document metadata
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Document }
 */
router.get("/:id", controller.getOne);

/**
 * @openapi
 * /documents/{id}/download:
 *   get:
 *     tags: [Documents]
 *     summary: Download document file
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: File stream }
 */
router.get("/:id/download", controller.download);

export default router;

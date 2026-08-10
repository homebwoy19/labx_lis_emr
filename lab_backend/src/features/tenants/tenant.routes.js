import { Router } from "express";
import * as controller from "./tenant.controller.js";
import * as schema from "./tenant.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authLimiter } from "../../middlewares/rateLimit.js";

/**
 * Tenant routes — mounted at /api/v1/tenants.
 *
 * PUBLIC and unauthenticated by design: the login screen must resolve which
 * laboratory a URL points at BEFORE anyone has signed in. Only a minimal,
 * non-sensitive projection is returned. The stricter authLimiter (failed-only,
 * 20/15min) throttles slug guessing/enumeration.
 */
const router = Router();

/**
 * @openapi
 * /tenants/{slug}:
 *   get:
 *     tags: [Tenants]
 *     summary: Resolve a laboratory tenant by its public slug (unauthenticated)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tenant resolved }
 *       404: { description: Laboratory not found }
 */
router.get(
  "/:slug",
  authLimiter,
  validate(schema.resolveTenantSchema),
  controller.resolve,
);

export default router;

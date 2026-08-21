import { Router } from "express";
import * as controller from "./letterhead.controller.js";
import * as schema from "./letterhead.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Letterhead routes — mounted at /api/v1/letterhead.
 *
 * The letterhead is a per-organization singleton used to brand diagnostic
 * reports. Any authenticated tenant user may read it (so report previews work);
 * editing it is a Lab Admin capability (LETTERHEAD_MANAGE). The tenant-scoped
 * client guarantees a caller only ever touches their own laboratory's row.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /letterhead:
 *   get:
 *     tags: [Letterhead]
 *     summary: Get the caller's laboratory letterhead
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Letterhead (null if not yet configured) }
 *   put:
 *     tags: [Letterhead]
 *     summary: Create or update the laboratory letterhead
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Letterhead saved }
 */
router
  .route("/")
  .get(controller.get)
  .put(authorize(P.LETTERHEAD_MANAGE), validate(schema.updateLetterheadSchema), controller.update);

export default router;

import { Router } from "express";
import * as controller from "./sample.controller.js";
import * as schema from "./sample.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Sample routes — mounted at /api/v1/samples.
 *
 * Registering and transitioning specimens is a phlebotomist/lab capability
 * (SAMPLE_COLLECT); everyone in the workflow can read (SAMPLE_READ). Barcodes are
 * generated server-side from the order code.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /samples:
 *   post:
 *     tags: [Samples]
 *     summary: Register a specimen against an order (barcode auto-generated)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Sample registered (PENDING) }
 *       409: { description: Order unpaid or closed }
 *   get:
 *     tags: [Samples]
 *     summary: List samples (filter by status/order, search by barcode)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sample list }
 */
router
  .route("/")
  .post(authorize(P.SAMPLE_COLLECT), validate(schema.createSampleSchema), controller.create)
  .get(authorize(P.SAMPLE_READ), validate(schema.listSamplesSchema), controller.list);

/**
 * @openapi
 * /samples/{id}:
 *   get: { tags: [Samples], summary: Get a sample, security: [{ bearerAuth: [] }], responses: { 200: { description: Sample } } }
 */
router
  .route("/:id")
  .get(authorize(P.SAMPLE_READ), validate(schema.sampleIdParamSchema), controller.getOne);

/**
 * @openapi
 * /samples/{id}/collect:
 *   post: { tags: [Samples], summary: Mark a specimen collected, security: [{ bearerAuth: [] }], responses: { 200: { description: Collected } } }
 * /samples/{id}/receive:
 *   post: { tags: [Samples], summary: Mark a specimen received in the lab, security: [{ bearerAuth: [] }], responses: { 200: { description: Received } } }
 * /samples/{id}/reject:
 *   post: { tags: [Samples], summary: Reject an unusable specimen with a reason, security: [{ bearerAuth: [] }], responses: { 200: { description: Rejected } } }
 */
router.post(
  "/:id/collect",
  authorize(P.SAMPLE_COLLECT),
  validate(schema.collectSampleSchema),
  controller.collect,
);
router.post(
  "/:id/receive",
  authorize(P.SAMPLE_COLLECT),
  validate(schema.sampleIdParamSchema),
  controller.receive,
);
router.post(
  "/:id/reject",
  authorize(P.SAMPLE_COLLECT),
  validate(schema.rejectSampleSchema),
  controller.reject,
);

export default router;

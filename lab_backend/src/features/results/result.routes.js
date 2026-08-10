import { Router } from "express";
import * as controller from "./result.controller.js";
import * as schema from "./result.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Result routes — mounted at /api/v1/results.
 *
 * Entry is a scientist/radiographer capability (RESULT_ENTER); approval/rejection
 * belong to the Lab Admin (RESULT_APPROVE / RESULT_REJECT); release is the front
 * desk handing results to the patient (RESULT_RELEASE). Reads use RESULT_READ.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /results:
 *   post:
 *     tags: [Results]
 *     summary: Enter or re-submit a result for an order item
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Result submitted (PENDING_APPROVAL) }
 *       409: { description: Order locked or item already approved }
 *   get:
 *     tags: [Results]
 *     summary: List results (filter by status/order)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Result list }
 */
router
  .route("/")
  .post(authorize(P.RESULT_ENTER), validate(schema.enterResultSchema), controller.enter)
  .get(authorize(P.RESULT_READ), validate(schema.listResultsSchema), controller.list);

/**
 * @openapi
 * /results/{id}:
 *   get: { tags: [Results], summary: Get a result, security: [{ bearerAuth: [] }], responses: { 200: { description: Result } } }
 */
router
  .route("/:id")
  .get(authorize(P.RESULT_READ), validate(schema.resultIdParamSchema), controller.getOne);

/**
 * @openapi
 * /results/{id}/approve:
 *   post: { tags: [Results], summary: Approve a pending result, security: [{ bearerAuth: [] }], responses: { 200: { description: Approved } } }
 * /results/{id}/reject:
 *   post: { tags: [Results], summary: Reject a pending result with a reason (sent back for correction), security: [{ bearerAuth: [] }], responses: { 200: { description: Rejected } } }
 */
router.post(
  "/:id/approve",
  authorize(P.RESULT_APPROVE),
  validate(schema.resultIdParamSchema),
  controller.approve,
);
router.post(
  "/:id/reject",
  authorize(P.RESULT_REJECT),
  validate(schema.rejectResultSchema),
  controller.reject,
);

/**
 * @openapi
 * /results/orders/{orderId}/release:
 *   post:
 *     tags: [Results]
 *     summary: Release a fully-approved order to the patient
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Released }
 *       409: { description: Order not fully approved }
 */
router.post(
  "/orders/:orderId/release",
  authorize(P.RESULT_RELEASE),
  validate(schema.releaseOrderSchema),
  controller.release,
);

export default router;

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
 * Entry is a scientist/radiographer capability (RESULT_ENTER); the receptionist
 * types/edits the narrative report and submits it (RESULT_PREPARE); approval and
 * rejection belong to the Lab Admin (RESULT_APPROVE / RESULT_REJECT); release is
 * the front desk handing results to the patient (RESULT_RELEASE); sending the
 * approved report to the patient is RESULT_SEND. Reads use RESULT_READ.
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
 * /results/{id}/prepare:
 *   post:
 *     tags: [Results]
 *     summary: Prepare (type/edit) the narrative report and optionally submit it to the Lab Admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Report saved or submitted for approval }
 *       409: { description: Result already approved or was rejected }
 */
router.post(
  "/:id/prepare",
  authorize(P.RESULT_PREPARE),
  validate(schema.prepareResultSchema),
  controller.prepare,
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

/**
 * @openapi
 * /results/orders/{orderId}/pdf:
 *   get:
 *     tags: [Results]
 *     summary: Download official diagnostic lab report PDF
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: PDF Stream }
 *       404: { description: Order not found }
 */
router.get(
  "/orders/:orderId/pdf",
  authorize(P.RESULT_READ),
  validate(schema.releaseOrderSchema),
  controller.downloadOrderPdf,
);

/**
 * @openapi
 * /results/orders/{orderId}/send:
 *   post:
 *     tags: [Results]
 *     summary: Email the approved diagnostic report to the patient
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Report sent (or logged when SMTP is not configured) }
 *       400: { description: No email on file for the patient }
 *       409: { description: Report not yet approved }
 */
router.post(
  "/orders/:orderId/send",
  authorize(P.RESULT_SEND),
  validate(schema.sendOrderReportSchema),
  controller.sendReport,
);

export default router;


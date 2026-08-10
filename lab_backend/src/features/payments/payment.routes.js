import { Router } from "express";
import * as controller from "./payment.controller.js";
import * as schema from "./payment.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Payment routes — mounted at /api/v1/payments.
 *
 * Recording payments is a front-desk capability (PAYMENT_CREATE); the Lab Admin
 * and front desk can read (PAYMENT_READ). Recording a payment re-rolls the
 * order status, so a fully-paid order automatically leaves PENDING_PAYMENT.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment against an order
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Payment recorded (returns updated order balance) }
 *       400: { description: Amount exceeds balance }
 *       409: { description: Order cancelled or already fully paid }
 *   get:
 *     tags: [Payments]
 *     summary: List payments (filter by status/method/order)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Payment list }
 */
router
  .route("/")
  .post(authorize(P.PAYMENT_CREATE), validate(schema.createPaymentSchema), controller.create)
  .get(authorize(P.PAYMENT_READ), validate(schema.listPaymentsSchema), controller.list);

/**
 * @openapi
 * /payments/{id}:
 *   get: { tags: [Payments], summary: Get a payment, security: [{ bearerAuth: [] }], responses: { 200: { description: Payment } } }
 */
router
  .route("/:id")
  .get(authorize(P.PAYMENT_READ), validate(schema.paymentIdParamSchema), controller.getOne);

export default router;

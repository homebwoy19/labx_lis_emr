import { Router } from "express";
import * as controller from "./order.controller.js";
import * as schema from "./order.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Order routes — mounted at /api/v1/orders.
 *
 * Orders are branch-scoped (receptionist context). Creation snapshots catalog
 * prices; the overall status is a server-computed roll-up of item + payment
 * state, so there is no endpoint to set it directly — it advances as samples,
 * results and payments are recorded, or is terminated via /cancel.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order for a patient from selected tests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Order created (PENDING_PAYMENT) }
 *       400: { description: Test unavailable or no branch context }
 *   get:
 *     tags: [Orders]
 *     summary: List orders (filter by status/patient, search by code)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Order list }
 */
router
  .route("/")
  .post(authorize(P.ORDER_CREATE), validate(schema.createOrderSchema), controller.create)
  .get(authorize(P.ORDER_READ), validate(schema.listOrdersSchema), controller.list);

/**
 * @openapi
 * /orders/{id}:
 *   get: { tags: [Orders], summary: Get an order with items and balance, security: [{ bearerAuth: [] }], responses: { 200: { description: Order } } }
 *   patch: { tags: [Orders], summary: Update order notes, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 */
router
  .route("/:id")
  .get(authorize(P.ORDER_READ), validate(schema.orderIdParamSchema), controller.getOne)
  .patch(authorize(P.ORDER_UPDATE), validate(schema.updateOrderSchema), controller.update);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel an order (terminal)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Cancelled }
 *       409: { description: Already cancelled or released }
 */
router.post(
  "/:id/cancel",
  authorize(P.ORDER_CANCEL),
  validate(schema.cancelOrderSchema),
  controller.cancel,
);

export default router;

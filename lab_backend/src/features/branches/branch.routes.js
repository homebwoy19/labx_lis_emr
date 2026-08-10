import { Router } from "express";
import * as controller from "./branch.controller.js";
import * as schema from "./branch.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Branch routes — mounted at /api/v1/branches.
 *
 * Create/read/update are org-scoped (Lab Admin). Approve/reject require the
 * platform BRANCH_APPROVE permission (Super Admin), whose unscoped client can
 * reach pending branches in any laboratory.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /branches:
 *   post:
 *     tags: [Branches]
 *     summary: Request a new branch (created PENDING_APPROVAL)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Branch created, pending approval }
 *   get:
 *     tags: [Branches]
 *     summary: List branches (filter by status for the approval queue)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Branch list }
 */
router
  .route("/")
  .post(authorize(P.BRANCH_CREATE), validate(schema.createBranchSchema), controller.create)
  .get(authorize(P.BRANCH_READ), validate(schema.listBranchesSchema), controller.list);

/**
 * @openapi
 * /branches/{id}:
 *   get:
 *     tags: [Branches]
 *     summary: Get a branch by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Branch }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Branches]
 *     summary: Update branch profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 */
router
  .route("/:id")
  .get(authorize(P.BRANCH_READ), validate(schema.branchIdParamSchema), controller.getOne)
  .patch(authorize(P.BRANCH_UPDATE), validate(schema.updateBranchSchema), controller.update);

/**
 * @openapi
 * /branches/{id}/approve:
 *   post:
 *     tags: [Branches]
 *     summary: Approve a pending branch (Super Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Approved }
 *       409: { description: Not awaiting approval }
 * /branches/{id}/reject:
 *   post:
 *     tags: [Branches]
 *     summary: Reject a pending branch with a reason (Super Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Rejected }
 */
router.post(
  "/:id/approve",
  authorize(P.BRANCH_APPROVE),
  validate(schema.branchIdParamSchema),
  controller.approve,
);
router.post(
  "/:id/reject",
  authorize(P.BRANCH_APPROVE),
  validate(schema.rejectBranchSchema),
  controller.reject,
);

export default router;

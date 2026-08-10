import { Router } from "express";
import * as controller from "./user.controller.js";
import * as schema from "./user.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * User routes — mounted at /api/v1/users.
 *
 * Staff management for a laboratory, performed by a Lab Admin. Role assignment
 * is gated by the dedicated ROLE_MANAGE permission, separate from basic user
 * updates, so the two capabilities can be granted independently.
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /users/roles:
 *   get:
 *     tags: [Users]
 *     summary: List roles assignable within the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role list }
 */
router.get("/roles", authorize(P.USER_READ), controller.listRoles);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a staff account and assign a role
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: User created }
 *   get:
 *     tags: [Users]
 *     summary: List staff (paginated, searchable, filterable by branch/status)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User list }
 */
router
  .route("/")
  .post(authorize(P.USER_CREATE), validate(schema.createUserSchema), controller.create)
  .get(authorize(P.USER_READ), validate(schema.listUsersSchema), controller.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a staff member by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Users]
 *     summary: Update staff profile, branch or status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate (soft-delete) a staff account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deactivated }
 */
router
  .route("/:id")
  .get(authorize(P.USER_READ), validate(schema.userIdParamSchema), controller.getOne)
  .patch(authorize(P.USER_UPDATE), validate(schema.updateUserSchema), controller.update)
  .delete(authorize(P.USER_DELETE), validate(schema.userIdParamSchema), controller.remove);

/**
 * @openapi
 * /users/{id}/roles:
 *   put:
 *     tags: [Users]
 *     summary: Replace a user's role assignments
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles updated }
 */
router.put(
  "/:id/roles",
  authorize(P.ROLE_MANAGE),
  validate(schema.setRolesSchema),
  controller.setRoles,
);

export default router;

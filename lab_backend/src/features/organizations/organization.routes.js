import { Router } from "express";
import * as controller from "./organization.controller.js";
import * as schema from "./organization.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Organization routes — mounted at /api/v1/organizations.
 *
 * This is the platform surface: every route requires Super Admin permissions.
 * A Super Admin's tenant-scoped client is the unscoped base client, so these
 * operations span all laboratories.
 */
const router = Router();

router.use(authenticate, tenantScope);

/**
 * @openapi
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Onboard a new laboratory (Super Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Organization created }
 *   get:
 *     tags: [Organizations]
 *     summary: List laboratories (paginated, searchable)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Organization list }
 */
router
  .route("/")
  .post(
    authorize(P.ORG_CREATE),
    validate(schema.createOrganizationSchema),
    controller.create,
  )
  .get(authorize(P.ORG_READ), validate(schema.listOrganizationsSchema), controller.list);

/**
 * @openapi
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get a laboratory by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Organization }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Organizations]
 *     summary: Update laboratory profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 */
router
  .route("/:id")
  .get(
    authorize(P.ORG_READ),
    validate(schema.organizationIdParamSchema),
    controller.getOne,
  )
  .patch(
    authorize(P.ORG_UPDATE),
    validate(schema.updateOrganizationSchema),
    controller.update,
  );

/**
 * @openapi
 * /organizations/{id}/suspend:
 *   post:
 *     tags: [Organizations]
 *     summary: Suspend a laboratory
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Suspended }
 * /organizations/{id}/activate:
 *   post:
 *     tags: [Organizations]
 *     summary: Reactivate a suspended laboratory
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Activated }
 */
router.post(
  "/:id/suspend",
  authorize(P.ORG_SUSPEND),
  validate(schema.suspendOrganizationSchema),
  controller.suspend,
);
router.post(
  "/:id/activate",
  authorize(P.ORG_SUSPEND),
  validate(schema.organizationIdParamSchema),
  controller.activate,
);
router.get(
  "/:id/domains",
  authorize(P.ORG_READ),
  validate(schema.organizationIdParamSchema),
  controller.listDomains,
);
router.post(
  "/:id/domains",
  authorize(P.ORG_UPDATE),
  validate(schema.domainSchema),
  controller.addDomain,
);
router.delete(
  "/:id/domains/:domainId",
  authorize(P.ORG_UPDATE),
  validate(schema.domainIdSchema),
  controller.removeDomain,
);

export default router;

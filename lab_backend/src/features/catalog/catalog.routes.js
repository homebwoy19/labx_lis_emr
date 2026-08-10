import { Router } from "express";
import * as controller from "./catalog.controller.js";
import * as schema from "./catalog.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Catalog routes — mounted at /api/v1/catalog.
 *
 *   /catalog/categories   test categories
 *   /catalog/tests        tests (priced investigations)
 *
 * Reads require TEST_READ (receptionists build orders from the catalog); writes
 * require the corresponding TEST_* permission (Lab Admin manages the catalog).
 */
const router = Router();

router.use(authenticate, tenantScope, subscriptionGuard);

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /catalog/categories:
 *   post:
 *     tags: [Catalog]
 *     summary: Create a test category
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Category created }
 *   get:
 *     tags: [Catalog]
 *     summary: List test categories
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category list }
 */
router
  .route("/categories")
  .post(authorize(P.TEST_CREATE), validate(schema.createCategorySchema), controller.createCategory)
  .get(authorize(P.TEST_READ), validate(schema.listCategoriesSchema), controller.listCategories);

/**
 * @openapi
 * /catalog/categories/{id}:
 *   get: { tags: [Catalog], summary: Get a category, security: [{ bearerAuth: [] }], responses: { 200: { description: Category } } }
 *   patch: { tags: [Catalog], summary: Update a category, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog], summary: Archive a category, security: [{ bearerAuth: [] }], responses: { 200: { description: Archived } } }
 */
router
  .route("/categories/:id")
  .get(authorize(P.TEST_READ), validate(schema.categoryIdParamSchema), controller.getCategory)
  .patch(authorize(P.TEST_UPDATE), validate(schema.updateCategorySchema), controller.updateCategory)
  .delete(authorize(P.TEST_DELETE), validate(schema.categoryIdParamSchema), controller.removeCategory);

// ── Tests ────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /catalog/tests:
 *   post:
 *     tags: [Catalog]
 *     summary: Create a test (priced investigation)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Test created }
 *   get:
 *     tags: [Catalog]
 *     summary: List tests (filter by type/category, search by name/code)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Test list }
 */
router
  .route("/tests")
  .post(authorize(P.TEST_CREATE), validate(schema.createTestSchema), controller.createTest)
  .get(authorize(P.TEST_READ), validate(schema.listTestsSchema), controller.listTests);

/**
 * @openapi
 * /catalog/tests/{id}:
 *   get: { tags: [Catalog], summary: Get a test, security: [{ bearerAuth: [] }], responses: { 200: { description: Test } } }
 *   patch: { tags: [Catalog], summary: Update a test, security: [{ bearerAuth: [] }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog], summary: Archive a test, security: [{ bearerAuth: [] }], responses: { 200: { description: Archived } } }
 */
router
  .route("/tests/:id")
  .get(authorize(P.TEST_READ), validate(schema.testIdParamSchema), controller.getTest)
  .patch(authorize(P.TEST_UPDATE), validate(schema.updateTestSchema), controller.updateTest)
  .delete(authorize(P.TEST_DELETE), validate(schema.testIdParamSchema), controller.removeTest);

export default router;

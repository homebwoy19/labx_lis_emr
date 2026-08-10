import { Router } from "express";
import * as controller from "./patient.controller.js";
import * as schema from "./patient.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { subscriptionGuard } from "../../middlewares/subscriptionGuard.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Patient routes — mounted at /api/v1/patients.
 *
 * Every route runs the standard protected chain:
 *   authenticate → tenantScope → authorize(permission) → validate → controller
 *
 * authenticate populates req.auth; tenantScope attaches the scoped client
 * (req.db); authorize enforces the permission; validate cleans the input.
 */
const router = Router();

// All patient routes require authentication + tenant scoping.
router.use(authenticate, tenantScope, subscriptionGuard);

/**
 * @openapi
 * /patients:
 *   post:
 *     tags: [Patients]
 *     summary: Register a new patient (auto-assigns patient code)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Patient registered }
 *   get:
 *     tags: [Patients]
 *     summary: List patients (paginated, searchable) within tenant scope
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Patient list }
 */
router
  .route("/")
  .post(authorize(P.PATIENT_CREATE), validate(schema.createPatientSchema), controller.create)
  .get(authorize(P.PATIENT_READ), validate(schema.listPatientsSchema), controller.list);

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Get a single patient by id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Patient }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Patients]
 *     summary: Update patient demographics
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Patients]
 *     summary: Archive (soft-delete) a patient
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Archived }
 */
router
  .route("/:id")
  .get(authorize(P.PATIENT_READ), validate(schema.patientIdParamSchema), controller.getOne)
  .patch(authorize(P.PATIENT_UPDATE), validate(schema.updatePatientSchema), controller.update)
  .delete(authorize(P.PATIENT_DELETE), validate(schema.patientIdParamSchema), controller.remove);

export default router;

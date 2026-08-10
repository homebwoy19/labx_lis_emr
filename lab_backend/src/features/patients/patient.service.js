import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { nextPatientCode } from "../../utils/identifiers.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./patient.repository.js";

/**
 * Patient service — business logic for the patient lifecycle.
 *
 * This module is the reference implementation of the feature pattern:
 *   - receives the tenant-scoped client (`db`) + trusted auth context
 *   - never trusts client-supplied tenant identifiers
 *   - allocates the human-readable patient code atomically
 *   - writes an audit record for every mutation
 */

/**
 * Registers a new patient. The patient code (e.g. MDL-PID-0000001) is allocated
 * inside a transaction so concurrent registrations never collide, and the row is
 * stamped with the caller's organization + branch from the trusted auth context.
 */
export async function createPatient(db, input, auth, reqContext) {
  const { organizationId, branchId, userId } = auth;

  if (!organizationId || !branchId) {
    // Only branch-scoped staff (e.g. receptionists) register patients. A
    // platform/org-level actor has no branch to attach the patient to.
    throw ApiError.badRequest(
      "A branch context is required to register a patient",
      { code: "BRANCH_CONTEXT_REQUIRED" },
    );
  }

  // Atomic: increment the org's patient sequence and create the patient together.
  const patient = await db.$transaction(async (tx) => {
    const patientCode = await nextPatientCode(tx, organizationId);
    return tx.patient.create({
      data: {
        organizationId,
        branchId,
        patientCode,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        createdBy: userId,
      },
      select: repo.PUBLIC_SELECT,
    });
  });

  await writeAudit({
    action: AUDIT_ACTIONS.PATIENT_CREATE,
    organizationId,
    actorId: userId,
    entityType: "Patient",
    entityId: patient.id,
    newValue: { patientCode: patient.patientCode },
    context: reqContext,
  });

  return patient;
}

export async function getPatient(db, id) {
  const patient = await repo.findById(db, id);
  if (!patient) throw ApiError.notFound("Patient not found");
  return patient;
}

export async function listPatients(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });
  const { total, data } = await repo.list(db, { skip, take, sortBy, sortOrder, search });
  return { data, total, page, limit };
}

export async function updatePatient(db, id, input, auth, reqContext) {
  // Ensure the patient exists within the caller's tenant before mutating.
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Patient not found");

  const updated = await repo.update(db, id, {
    ...input,
    updatedBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.PATIENT_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Patient",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    context: reqContext,
  });

  return updated;
}

export async function deletePatient(db, id, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Patient not found");

  await repo.softDelete(db, id, auth.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.PATIENT_DELETE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Patient",
    entityId: id,
    oldValue: existing,
    context: reqContext,
  });
}

export default { createPatient, getPatient, listPatients, updatePatient, deletePatient };

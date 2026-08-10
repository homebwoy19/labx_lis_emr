import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as patientService from "./patient.service.js";

/**
 * Patient controller — HTTP adapter. Reads validated input from req, the scoped
 * client from req.db, and the auth/request context, then delegates to the service.
 */

export const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(
    req.db,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: "Patient registered",
    data: { patient },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await patientService.listPatients(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { patients: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatient(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { patient } });
});

export const update = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Patient updated", data: { patient } });
});

export const remove = asyncHandler(async (req, res) => {
  await patientService.deletePatient(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Patient archived" });
});

export default { create, list, getOne, update, remove };

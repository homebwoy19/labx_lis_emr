import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as branchService from "./branch.service.js";

/**
 * Branch controller — HTTP adapter for branch management and the Super Admin
 * approval workflow.
 */

export const create = asyncHandler(async (req, res) => {
  const branch = await branchService.requestBranch(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Branch created and pending approval",
    data: { branch },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await branchService.listBranches(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { branches: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranch(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { branch } });
});

export const update = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Branch updated", data: { branch } });
});

export const approve = asyncHandler(async (req, res) => {
  const branch = await branchService.approveBranch(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Branch approved", data: { branch } });
});

export const reject = asyncHandler(async (req, res) => {
  const branch = await branchService.rejectBranch(
    req.db,
    req.params.id,
    req.body.reason,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Branch rejected", data: { branch } });
});

export default { create, list, getOne, update, approve, reject };

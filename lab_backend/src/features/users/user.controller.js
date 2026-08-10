import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as userService from "./user.service.js";

/**
 * User controller — HTTP adapter for staff and role management.
 */

export const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "User created", data: { user } });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await userService.listUsers(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { users: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await userService.listAssignableRoles(req.db);
  return sendSuccess(res, { message: "OK", data: { roles } });
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { user } });
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "User updated", data: { user } });
});

export const setRoles = asyncHandler(async (req, res) => {
  const user = await userService.setUserRoles(
    req.db,
    req.params.id,
    req.body.roleKeys,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "User roles updated", data: { user } });
});

export const remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "User deactivated" });
});

export default { create, list, listRoles, getOne, update, setRoles, remove };

import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess } from "../../core/ApiResponse.js";
import { getDashboard } from "./dashboard.service.js";

/**
 * Dashboard controller — single endpoint returning role-scoped live data.
 *
 * The service decides what to include based on the caller's auth context; the
 * controller is a thin HTTP adapter.
 */

export const get = asyncHandler(async (req, res) => {
  const data = await getDashboard(req.db, req.auth);
  return sendSuccess(res, { message: "OK", data: { dashboard: data } });
});

export default { get };

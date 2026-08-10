import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess } from "../../core/ApiResponse.js";
import * as tenantService from "./tenant.service.js";

/**
 * Tenant controller — thin HTTP adapter over the tenant service.
 *
 * The single public endpoint here lets the (unauthenticated) login screen
 * resolve which laboratory it is branding and authenticating against.
 */
export const resolve = asyncHandler(async (req, res) => {
  const tenant = await tenantService.resolveBySlug(req.params.slug);
  return sendSuccess(res, { message: "OK", data: { tenant } });
});

export default { resolve };

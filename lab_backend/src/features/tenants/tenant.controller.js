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

export const resolveCurrent = asyncHandler(async (req, res) => {
  if (!req.tenant) {
    return res
      .status(404)
      .json({
        success: false,
        error: { code: "TENANT_NOT_FOUND", message: "Laboratory not found" },
      });
  }
  return sendSuccess(res, { message: "OK", data: { tenant: req.tenant } });
});

export default { resolve, resolveCurrent };

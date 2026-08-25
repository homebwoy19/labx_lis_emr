import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as organizationService from "./organization.service.js";

/**
 * Organization controller — HTTP adapter for the platform (Super Admin) surface.
 */

export const create = asyncHandler(async (req, res) => {
  const organization = await organizationService.createOrganization(
    req.db,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: "Organization created",
    data: { organization },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await organizationService.listOrganizations(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { organizations: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const organization = await organizationService.getOrganization(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { organization } });
});

export const update = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateOrganization(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Organization updated", data: { organization } });
});

export const suspend = asyncHandler(async (req, res) => {
  const organization = await organizationService.setOrganizationStatus(
    req.db,
    req.params.id,
    "SUSPENDED",
    req.auth,
    req.context,
    req.body.reason,
  );
  return sendSuccess(res, { message: "Organization suspended", data: { organization } });
});

export const activate = asyncHandler(async (req, res) => {
  const organization = await organizationService.setOrganizationStatus(
    req.db,
    req.params.id,
    "ACTIVE",
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Organization activated", data: { organization } });
});

export const listDomains = asyncHandler(async (req, res) => {
  const domains = await organizationService.listDomains(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { domains } });
});

export const addDomain = asyncHandler(async (req, res) => {
  const domain = await organizationService.addDomain(
    req.db,
    req.params.id,
    req.body.hostname,
    req.auth,
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: "Domain connected",
    data: { domain },
  });
});

export const removeDomain = asyncHandler(async (req, res) => {
  await organizationService.removeDomain(req.db, req.params.id, req.params.domainId);
  return sendSuccess(res, { message: "Domain disconnected" });
});

export default {
  create,
  list,
  getOne,
  update,
  suspend,
  activate,
  listDomains,
  addDomain,
  removeDomain,
};

import { ApiError } from "../../core/ApiError.js";
import * as repo from "./tenant.repository.js";

/**
 * Tenant service — resolves a laboratory tenant from its public slug.
 *
 * This is the single source of truth the login flow uses to turn a URL segment
 * (or, later, a subdomain) into a real organization. Laboratory identity is
 * always resolved from the database here — never hard-coded — so adding a new
 * lab is purely a data operation.
 */
export async function resolveBySlug(slug) {
  const tenant = await repo.findActiveBySlug(slug);
  if (!tenant) {
    throw ApiError.notFound("Laboratory not found", { code: "TENANT_NOT_FOUND" });
  }
  return tenant;
}

export async function resolveByHostname(hostname) {
  const tenant = await repo.findActiveByHostname(hostname);
  if (!tenant)
    throw ApiError.notFound("Laboratory not found", { code: "TENANT_NOT_FOUND" });
  return tenant;
}

export default { resolveBySlug, resolveByHostname };

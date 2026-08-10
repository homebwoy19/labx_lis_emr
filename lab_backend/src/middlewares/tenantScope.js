import { forTenant } from "../core/tenantClient.js";

/**
 * Tenant scope middleware — attaches a tenant-scoped Prisma client to req.db.
 *
 * Must run AFTER authenticate so req.auth is populated. Reads the tenant context
 * from req.auth and returns a client extension that auto-filters/stamps queries.
 *
 * Controllers/services use req.db instead of the global prisma singleton to ensure
 * every database operation respects the authenticated user's tenant boundary.
 */
export function tenantScope(req, _res, next) {
  if (!req.auth) {
    // This middleware should only run on authenticated routes; if auth is missing,
    // the authenticate middleware should have already rejected the request. Fail
    // defensively rather than silently passing an unscoped client.
    return next(new Error("tenantScope requires authenticate middleware"));
  }

  const { organizationId, branchId, isSuperAdmin, isOrgAdmin } = req.auth;

  req.db = forTenant({ organizationId, branchId, isSuperAdmin, isOrgAdmin });
  next();
}

export default tenantScope;

import { ApiError } from "../core/ApiError.js";

/**
 * Permission-based authorization guard.
 *
 * Usage:
 *   router.post('/patients', authenticate, authorize('patient:create'), ...)
 *   router.get('/results/:id', authenticate, authorize('result:read'), ...)
 *
 * Checks that req.auth.permissions includes the required permission key.
 * Super Admins bypass this check entirely (platform-wide access).
 *
 * We NEVER check role names directly in middleware or controllers; authorization
 * is always permission-based. This ensures adding/editing roles only requires
 * updating the role-permission mapping in constants, not scattered role checks.
 */
export function authorize(...requiredPermissions) {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    // Super Admin bypasses all permission checks.
    if (req.auth.isSuperAdmin) {
      return next();
    }

    const { permissions } = req.auth;

    for (const perm of requiredPermissions) {
      if (!permissions.has(perm)) {
        return next(ApiError.forbidden("Insufficient permissions"));
      }
    }

    next();
  };
}

export default authorize;

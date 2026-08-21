import { verifyAccessToken } from "../utils/tokens.js";
import { ApiError } from "../core/ApiError.js";
import { prisma } from "../core/prisma.js";
import { ROLE_PERMISSIONS } from "../constants/roles.js";

/**
 * Authenticate middleware — verifies the JWT access token and hydrates req.auth
 * with the authenticated user, their roles, permissions, and tenant context.
 *
 * Attached shape:
 *   req.auth = {
 *     userId, organizationId, branchId,
 *     roles: [{ key, scope, ... }],
 *     permissions: Set<string>,
 *     isSuperAdmin: boolean,
 *     isOrgAdmin: boolean,
 *   }
 *
 * Downstream middleware (tenantScope, authorize) depend on this context.
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed authorization header"));
  }

  const token = authHeader.slice(7);
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Access token expired"));
    }
    return next(ApiError.unauthorized("Invalid access token"));
  }

  // The access token carries userId + tenant scope. We trust it (stateless),
  // but we still load the full user context to check account status and hydrate
  // roles/permissions. This DB hit is unavoidable for secure authorization.
  hydrateUserContext(payload.userId)
    .then((authContext) => {
      req.auth = { ...authContext, sessionId: payload.sid ?? null };
      next();
    })
    .catch(next);
}

async function hydrateUserContext(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      branchId: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              key: true,
              scope: true,
              organizationId: true,
              permissions: {
                select: {
                  permission: { select: { key: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`);
  }

  const rawRoles = user.roles || user.userRoles || [];
  const roles = rawRoles.map((ur) => ur.role || ur);
  const permissionSet = new Set();

  for (const role of roles) {
    if (role.key && ROLE_PERMISSIONS[role.key]) {
      for (const p of ROLE_PERMISSIONS[role.key]) {
        permissionSet.add(p);
      }
    }
    const perms = role.permissions || role.rolePermissions || [];
    for (const rp of perms) {
      if (rp.permission?.key) permissionSet.add(rp.permission.key);
    }
  }

  const isSuperAdmin = roles.some((r) => r.scope === "PLATFORM");
  const isOrgAdmin = roles.some((r) => r.scope === "ORGANIZATION");

  return {
    userId: user.id,
    organizationId: user.organizationId,
    branchId: user.branchId,
    roles,
    permissions: permissionSet,
    isSuperAdmin,
    isOrgAdmin,
  };
}

export default authenticate;

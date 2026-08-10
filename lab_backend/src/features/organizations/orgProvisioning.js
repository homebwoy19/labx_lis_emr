import {
  ROLES,
  ROLE_SCOPE,
  ROLE_METADATA,
  ROLE_PERMISSIONS,
} from "../../constants/roles.js";

/**
 * The roles every laboratory gets its own copy of. SUPER_ADMIN is deliberately
 * excluded — it is a platform-only system role and is never cloned per-tenant.
 */
export const ORG_ROLE_KEYS = [
  ROLES.LAB_ADMIN,
  ROLES.RECEPTIONIST,
  ROLES.PHLEBOTOMIST,
  ROLES.LAB_SCIENTIST,
  ROLES.RADIOGRAPHER,
];

/**
 * Provisions the standard set of org-scoped roles (with their permission grants)
 * for a freshly created organization. Run inside the org-creation transaction so
 * a new laboratory is immediately usable — its Lab Admin can assign staff to real
 * roles without any additional setup.
 *
 * `client` may be the base Prisma client or a transaction handle.
 */
export async function provisionOrganizationRoles(client, organizationId) {
  const permissions = await client.permission.findMany({ select: { id: true, key: true } });
  const permIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const roles = {};
  for (const key of ORG_ROLE_KEYS) {
    const meta = ROLE_METADATA[key];
    const role = await client.role.create({
      data: {
        organizationId,
        key,
        name: meta.name,
        description: meta.description,
        scope: ROLE_SCOPE[key],
        isSystem: false,
      },
    });

    const grants = (ROLE_PERMISSIONS[key] || [])
      .map((permKey) => permIdByKey.get(permKey))
      .filter(Boolean)
      .map((permissionId) => ({ roleId: role.id, permissionId }));

    if (grants.length) {
      await client.rolePermission.createMany({ data: grants, skipDuplicates: true });
    }

    roles[key] = role;
  }

  return roles;
}

export default { provisionOrganizationRoles, ORG_ROLE_KEYS };

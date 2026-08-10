/**
 * User repository.
 *
 * User is a tenant model (organizationId + branchId). A Lab Admin is org-scoped
 * but not branch-scoped, so their `req.db` sees every user across all branches
 * of their laboratory. Lookups use findFirst so the injected filters compose.
 *
 * The password hash is never selected into any response shape.
 */

const ROLE_INCLUDE = {
  roles: {
    select: {
      role: { select: { id: true, key: true, name: true, scope: true } },
    },
  },
};

export const PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  organizationId: true,
  branchId: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  ...ROLE_INCLUDE,
};

/** Flattens the nested roles include into a plain roles array. */
export function shapeUser(user) {
  if (!user) return user;
  const { roles: roleArray, userRoles, ...rest } = user;
  const raw = roleArray || userRoles || [];
  // Convert array of { role: { ... } } into plain roles
  const roles = raw.map((ur) => ur.role || ur);
  return { ...rest, roles };
}

export async function findById(db, id) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: PUBLIC_SELECT,
  });
  return shapeUser(user);
}

export async function list(db, { skip, take, sortBy, sortOrder, search, status, branchId }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (branchId) where.branchId = branchId;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, data] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: PUBLIC_SELECT,
    }),
  ]);

  return { total, data: data.map(shapeUser) };
}

export async function create(db, data) {
  const user = await db.user.create({ data, select: PUBLIC_SELECT });
  return shapeUser(user);
}

export async function update(db, id, data) {
  const user = await db.user.update({ where: { id }, data, select: PUBLIC_SELECT });
  return shapeUser(user);
}

export async function softDelete(db, id, deletedBy) {
  return db.user.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, status: "SUSPENDED" },
    select: { id: true },
  });
}

/** Resolves an org-scoped role by key (returns null if the org lacks it). */
export async function findRoleByKey(db, key) {
  return db.role.findFirst({
    where: { key, deletedAt: null },
    select: { id: true, key: true, name: true, scope: true },
  });
}

export async function listRoles(db) {
  return db.role.findMany({
    where: { deletedAt: null },
    select: { id: true, key: true, name: true, description: true, scope: true },
    orderBy: { name: "asc" },
  });
}

export async function findBranch(db, branchId) {
  return db.branch.findFirst({
    where: { id: branchId, deletedAt: null },
    select: { id: true, status: true },
  });
}

/** Replaces a user's role assignments with the given set of role ids. */
export async function replaceUserRoles(db, userId, roleIds) {
  await db.$transaction([
    db.userRole.deleteMany({ where: { userId } }),
    db.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    }),
  ]);
}

export default {
  PUBLIC_SELECT,
  shapeUser,
  findById,
  list,
  create,
  update,
  softDelete,
  findRoleByKey,
  listRoles,
  findBranch,
  replaceUserRoles,
};

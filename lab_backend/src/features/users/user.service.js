import { ApiError } from "../../core/ApiError.js";
import { prisma } from "../../core/prisma.js";
import { writeAudit } from "../../core/audit.js";
import { hashPassword } from "../../utils/password.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import { assertWithinUserLimit } from "../subscriptions/subscription.service.js";
import * as repo from "./user.repository.js";

/**
 * User service — staff management for a laboratory.
 *
 * Performed by a Lab Admin (org-scoped). Business rules enforced here:
 *   - a role must exist within the caller's organization to be assignable
 *   - branch-scoped roles require a valid, ACTIVE branch; the Lab Admin role is
 *     organization-wide and must not be pinned to a branch
 *   - email is globally unique, so uniqueness is checked against the base client
 *     (the scoped client can only see the caller's own organization)
 */

/** Validates a target branch belongs to the org and is live. Returns its id. */
async function assertUsableBranch(db, branchId) {
  const branch = await repo.findBranch(db, branchId);
  if (!branch) throw ApiError.notFound("Branch not found");
  if (branch.status !== "ACTIVE") {
    throw ApiError.badRequest("Branch is not active", { code: "BRANCH_NOT_ACTIVE" });
  }
  return branch.id;
}

/** Resolves the branchId a user should carry for a given role scope. */
async function resolveBranchForScope(db, scope, branchId) {
  if (scope === "BRANCH") {
    if (!branchId) {
      throw ApiError.badRequest("branchId is required for a branch-scoped role", {
        code: "BRANCH_REQUIRED",
      });
    }
    return assertUsableBranch(db, branchId);
  }
  // Organization-wide roles (Lab Admin) are not tied to a branch.
  return null;
}

export async function createUser(db, input, auth, reqContext) {
  const role = await repo.findRoleByKey(db, input.roleKey);
  if (!role) {
    throw ApiError.notFound("That role is not available in this organization", {
      code: "ROLE_NOT_FOUND",
    });
  }

  const branchId = await resolveBranchForScope(db, role.scope, input.branchId);

  // Global uniqueness — email is unique across the whole platform.
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict("A user with this email already exists", { code: "EMAIL_EXISTS" });
  }

  // Backend-enforced plan seat limit (§5). Hash the password before opening the
  // transaction so the ~expensive Argon2 hash never holds the advisory lock.
  const passwordHash = await hashPassword(input.password);

  // The seat check + create run in ONE transaction, serialized per-organization
  // with a Postgres advisory lock, so two concurrent creates can't both pass the
  // check and exceed the plan. The lock is transaction-scoped (auto-released on
  // commit/rollback) and pgBouncer-safe. We use the base client and stamp
  // organizationId explicitly, so correctness never depends on the tenant
  // extension firing inside the transaction.
  const user = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`user-limit:${auth.organizationId}`}))`;

    await assertWithinUserLimit(tx, auth.organizationId);

    return repo.create(tx, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      organizationId: auth.organizationId,
      branchId,
      createdBy: auth.userId,
      roles: { create: { roleId: role.id } },
    });
  });

  await writeAudit({
    action: AUDIT_ACTIONS.USER_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, role: role.key, branchId },
    context: reqContext,
  });

  return user;
}

export async function getUser(db, id) {
  const user = await repo.findById(db, id);
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

export async function listUsers(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });
  const { total, data } = await repo.list(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    search,
    status: query.status,
    branchId: query.branchId,
  });
  return { data, total, page, limit };
}

export async function listAssignableRoles(db) {
  return repo.listRoles(db);
}

export async function updateUser(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("User not found");

  const data = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.status !== undefined) data.status = input.status;

  if (input.branchId !== undefined) {
    data.branchId = input.branchId === null ? null : await assertUsableBranch(db, input.branchId);
  }

  data.updatedBy = auth.userId;

  // Reactivating a deactivated user consumes a seat again, so it must pass the
  // same race-safe seat check as creation. Ordinary edits skip the transaction.
  const isReactivation = input.status === "ACTIVE" && existing.status !== "ACTIVE";

  let updated;
  if (isReactivation) {
    updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`user-limit:${auth.organizationId}`}))`;
      await assertWithinUserLimit(tx, auth.organizationId);
      return repo.update(tx, id, data);
    });
  } else {
    updated = await repo.update(db, id, data);
  }

  await writeAudit({
    action: AUDIT_ACTIONS.USER_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "User",
    entityId: id,
    oldValue: { status: existing.status, branchId: existing.branchId },
    newValue: { status: updated.status, branchId: updated.branchId },
    context: reqContext,
  });

  return updated;
}

export async function setUserRoles(db, id, roleKeys, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("User not found");

  // Resolve every requested role within the organization.
  const roles = [];
  for (const key of roleKeys) {
    const role = await repo.findRoleByKey(db, key);
    if (!role) {
      throw ApiError.notFound(`Role ${key} is not available in this organization`, {
        code: "ROLE_NOT_FOUND",
      });
    }
    roles.push(role);
  }

  // A branch-scoped role only makes sense for a user attached to a branch.
  const needsBranch = roles.some((r) => r.scope === "BRANCH");
  if (needsBranch && !existing.branchId) {
    throw ApiError.badRequest(
      "This user must be assigned to a branch before receiving a branch-scoped role",
      { code: "BRANCH_REQUIRED" },
    );
  }

  await repo.replaceUserRoles(db, id, roles.map((r) => r.id));

  await writeAudit({
    action: AUDIT_ACTIONS.ROLE_CHANGE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "User",
    entityId: id,
    oldValue: { roles: existing.roles.map((r) => r.key) },
    newValue: { roles: roles.map((r) => r.key) },
    context: reqContext,
  });

  return repo.findById(db, id);
}

export async function deleteUser(db, id, auth, reqContext) {
  if (id === auth.userId) {
    throw ApiError.badRequest("You cannot deactivate your own account", {
      code: "CANNOT_DELETE_SELF",
    });
  }

  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("User not found");

  await repo.deactivate(db, id, auth.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.USER_DELETE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "User",
    entityId: id,
    oldValue: { email: existing.email, status: existing.status },
    context: reqContext,
  });
}

export default {
  createUser,
  getUser,
  listUsers,
  listAssignableRoles,
  updateUser,
  setUserRoles,
  deleteUser,
};

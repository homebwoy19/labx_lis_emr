import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import { assertWithinBranchLimit } from "../subscriptions/subscription.service.js";
import * as repo from "./branch.repository.js";

/**
 * Branch service.
 *
 * Branch creation is a two-party workflow:
 *   1. A Lab Admin requests a branch  -> status PENDING_APPROVAL
 *   2. A Super Admin approves/rejects -> status ACTIVE / REJECTED
 *
 * A pending or rejected branch has no live users or operations; approval is the
 * gate. The org boundary is enforced by the scoped client, so a Lab Admin can
 * only ever create branches inside their own laboratory.
 */

export async function requestBranch(db, input, auth, reqContext) {
  if (!auth.organizationId) {
    // Platform users have no organization to attach a branch to.
    throw ApiError.badRequest("An organization context is required to create a branch", {
      code: "ORGANIZATION_CONTEXT_REQUIRED",
    });
  }

  const clash = await repo.findByCode(db, input.code);
  if (clash) {
    throw ApiError.conflict("A branch with this code already exists", {
      code: "BRANCH_CODE_EXISTS",
    });
  }

  // Backend-enforced plan branch limit (§5). Rejects the request before any write.
  await assertWithinBranchLimit(db, auth.organizationId);

  const branch = await repo.create(db, {
    name: input.name,
    code: input.code,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    status: "PENDING_APPROVAL",
    createdBy: auth.userId,
    managerId: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.BRANCH_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Branch",
    entityId: branch.id,
    newValue: { name: branch.name, code: branch.code, status: branch.status },
    context: reqContext,
  });

  return branch;
}

export async function getBranch(db, id) {
  const branch = await repo.findById(db, id);
  if (!branch) throw ApiError.notFound("Branch not found");
  return branch;
}

export async function listBranches(db, query) {
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
  });
  return { data, total, page, limit };
}

export async function updateBranch(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Branch not found");

  const updated = await repo.update(db, id, { ...input, updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.BRANCH_UPDATE,
    organizationId: existing.organizationId,
    actorId: auth.userId,
    entityType: "Branch",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    context: reqContext,
  });

  return updated;
}

/** Super Admin approval — moves a PENDING_APPROVAL branch to ACTIVE. */
export async function approveBranch(db, id, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Branch not found");

  if (existing.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict(`Branch is not awaiting approval (status: ${existing.status})`, {
      code: "BRANCH_NOT_PENDING",
    });
  }

  const updated = await repo.update(db, id, {
    status: "ACTIVE",
    approvedBy: auth.userId,
    approvedAt: new Date(),
    updatedBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.BRANCH_APPROVE,
    organizationId: existing.organizationId,
    actorId: auth.userId,
    entityType: "Branch",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "ACTIVE" },
    context: reqContext,
  });

  return updated;
}

/** Super Admin rejection — moves a PENDING_APPROVAL branch to REJECTED. */
export async function rejectBranch(db, id, reason, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Branch not found");

  if (existing.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict(`Branch is not awaiting approval (status: ${existing.status})`, {
      code: "BRANCH_NOT_PENDING",
    });
  }

  const updated = await repo.update(db, id, {
    status: "REJECTED",
    updatedBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.BRANCH_REJECT,
    organizationId: existing.organizationId,
    actorId: auth.userId,
    entityType: "Branch",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "REJECTED", reason },
    context: reqContext,
  });

  return updated;
}

export default {
  requestBranch,
  getBranch,
  listBranches,
  updateBranch,
  approveBranch,
  rejectBranch,
};

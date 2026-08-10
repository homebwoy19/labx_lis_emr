import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { hashPassword } from "../../utils/password.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import { ROLES } from "../../constants/roles.js";
import * as repo from "./organization.repository.js";
import { provisionOrganizationRoles } from "./orgProvisioning.js";
import { createInitialSubscription } from "../subscriptions/subscription.service.js";

/**
 * Organization service — platform-level laboratory onboarding and lifecycle.
 *
 * These operations are performed by the Super Admin. A new organization starts
 * ACTIVE (the platform has already vetted it during onboarding); its branches,
 * however, still require per-branch approval (see the branches feature).
 */

export async function createOrganization(db, input, auth, reqContext) {
  const clash = await repo.findByAcronymOrSlug(db, input.acronym, input.slug);
  if (clash) {
    const field = clash.acronym === input.acronym ? "acronym" : "slug";
    throw ApiError.conflict(`An organization with this ${field} already exists`, {
      code: "ORGANIZATION_EXISTS",
    });
  }

  // If a first Lab Admin was requested, make sure the email is free up-front so
  // we fail cleanly instead of aborting the transaction on a unique violation.
  if (input.admin) {
    const existingUser = await db.user.findUnique({
      where: { email: input.admin.email },
      select: { id: true },
    });
    if (existingUser) {
      throw ApiError.conflict("A user with this email already exists", {
        code: "EMAIL_EXISTS",
      });
    }
  }

  const adminPasswordHash = input.admin ? await hashPassword(input.admin.password) : null;

  // Onboard the laboratory atomically: organization + its org-scoped roles +
  // (optionally) its first Lab Admin + (optionally) its initial subscription.
  const { org, admin, subscription } = await db.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: input.name,
        acronym: input.acronym,
        slug: input.slug,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        status: "ACTIVE",
        createdBy: auth.userId,
      },
      select: repo.PUBLIC_SELECT,
    });

    const roles = await provisionOrganizationRoles(tx, created.id);

    let adminUser = null;
    if (input.admin) {
      adminUser = await tx.user.create({
        data: {
          organizationId: created.id,
          branchId: null, // Lab Admin is organization-wide, not tied to a branch
          firstName: input.admin.firstName,
          lastName: input.admin.lastName,
          email: input.admin.email,
          phone: input.admin.phone ?? null,
          passwordHash: adminPasswordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          createdBy: auth.userId,
          roles: { create: { roleId: roles[ROLES.LAB_ADMIN].id } },
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    }

    let initialSub = null;
    if (input.subscription) {
      initialSub = await createInitialSubscription(
        tx,
        {
          organizationId: created.id,
          ...input.subscription,
        },
        auth,
      );
    }

    return { org: created, admin: adminUser, subscription: initialSub };
  });

  await writeAudit({
    action: AUDIT_ACTIONS.ORGANIZATION_CREATE,
    organizationId: org.id,
    actorId: auth.userId,
    entityType: "Organization",
    entityId: org.id,
    newValue: {
      name: org.name,
      acronym: org.acronym,
      adminCreated: Boolean(admin),
      subscriptionPlan: subscription?.plan ?? null,
    },
    context: reqContext,
  });

  return { ...org, admin, subscription };
}

export async function getOrganization(db, id) {
  const org = await repo.findById(db, id);
  if (!org) throw ApiError.notFound("Organization not found");
  return org;
}

export async function listOrganizations(db, query) {
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

export async function updateOrganization(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Organization not found");

  const updated = await repo.update(db, id, { ...input, updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATE,
    organizationId: id,
    actorId: auth.userId,
    entityType: "Organization",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    context: reqContext,
  });

  return updated;
}

/** Suspends or reactivates an organization (platform enforcement action). */
export async function setOrganizationStatus(db, id, status, auth, reqContext, reason) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Organization not found");

  const updated = await repo.update(db, id, { status, updatedBy: auth.userId });

  await writeAudit({
    action:
      status === "SUSPENDED"
        ? AUDIT_ACTIONS.ORGANIZATION_SUSPEND
        : AUDIT_ACTIONS.ORGANIZATION_ACTIVATE,
    organizationId: id,
    actorId: auth.userId,
    entityType: "Organization",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status, reason: reason ?? null },
    context: reqContext,
  });

  return updated;
}

export default {
  createOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
  setOrganizationStatus,
};

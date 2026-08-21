import { ApiError } from "../../core/ApiError.js";
import { prisma } from "../../core/prisma.js";
import { writeAudit } from "../../core/audit.js";
import { logger } from "../../core/logger.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./subscription.repository.js";
import { getPlan, isValidPlan, planCatalog } from "./subscription.plans.js";
import {
  computePeriodEnd,
  computeRenewalPeriod,
  resolveAmountAndLimits,
  resolveStatus,
  graceEndsAt,
  daysUntil,
  msUntil,
  isAccessBlocked,
} from "./subscription.util.js";

/**
 * Subscription service.
 *
 * Owns the subscription lifecycle: creation at lab onboarding, Super-Admin
 * management (plan/amount/limits/grace/status), the renewal decision workflow,
 * and the read surfaces powering the Super-Admin subscription dashboard and the
 * Lab-Admin "my subscription" screen. Also exposes the limit-enforcement and
 * access-state helpers used by the users/branches services and the access guard.
 *
 * Money: `amount` is a Decimal in the DB; it is coerced to a plain number on the
 * way out so the API contract is numeric NGN and the frontend formats it.
 */

/** Coerces Prisma Decimal (or string) money fields to numbers for the API. */
function serialize(sub) {
  if (!sub) return sub;
  const out = { ...sub };
  if (out.amount != null) out.amount = Number(out.amount);
  return out;
}

/** Attaches computed, clock-derived fields the UI needs (status, time left). */
function decorate(sub, now = new Date()) {
  if (!sub) return sub;
  const s = serialize(sub);
  const liveStatus = resolveStatus(s, now);
  const grace = graceEndsAt(s);
  return {
    ...s,
    liveStatus,
    daysRemaining: s.currentPeriodEnd ? daysUntil(s.currentPeriodEnd, now) : null,
    msRemaining: s.currentPeriodEnd ? msUntil(s.currentPeriodEnd, now) : null,
    graceEndsAt: grace,
    isBlocked: isAccessBlocked(s, now),
  };
}

/** Public plan catalog (any authenticated user). */
export function getPlans() {
  return planCatalog();
}

/**
 * Creates the initial subscription for a newly-onboarded laboratory. Runs inside
 * the org-creation transaction, so it receives the transaction client `tx` and
 * must stamp organizationId explicitly (tx is unscoped). Writes the first
 * immutable history record for the opening period.
 */
export async function createInitialSubscription(tx, input, auth) {
  const {
    organizationId,
    plan,
    billingCycle,
    amount,
    maxBranches,
    maxUsers,
    startDate,
    gracePeriodDays = 0,
  } = input;

  if (!isValidPlan(plan)) {
    throw ApiError.badRequest(`Unknown subscription plan: ${plan}`, { code: "INVALID_PLAN" });
  }

  const resolved = resolveAmountAndLimits(plan, billingCycle, {
    amount,
    maxBranches,
    maxUsers,
  });

  const periodStart = startDate ? new Date(startDate) : new Date();
  const periodEnd = computePeriodEnd(periodStart, billingCycle);

  const created = await repo.create(tx, {
    organizationId,
    plan,
    billingCycle,
    status: "ACTIVE",
    amount: resolved.amount,
    currency: "NGN",
    isCustomPricing: resolved.isCustomPricing,
    maxBranches: resolved.maxBranches,
    maxUsers: resolved.maxUsers,
    gracePeriodDays: Number(gracePeriodDays) || 0,
    startedAt: periodStart,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    createdBy: auth.userId,
  });

  await repo.appendHistory(tx, {
    organizationId,
    subscriptionId: created.id,
    plan,
    billingCycle,
    amount: resolved.amount,
    currency: "NGN",
    isCustomPricing: resolved.isCustomPricing,
    maxBranches: resolved.maxBranches,
    maxUsers: resolved.maxUsers,
    periodStart,
    periodEnd,
    status: "ACTIVE",
    previousPeriodEnd: null,
    note: "Initial subscription",
    createdBy: auth.userId,
  });

  return serialize(created);
}

/** §12 — the caller's own laboratory subscription with live counts vs limits. */
export async function getMySubscription(db, auth) {
  if (!auth.organizationId) {
    throw ApiError.badRequest("No organization context", { code: "ORGANIZATION_CONTEXT_REQUIRED" });
  }
  const sub = await repo.findByOrg(db, auth.organizationId);
  if (!sub) {
    throw ApiError.notFound("No subscription found for this organization", {
      code: "SUBSCRIPTION_NOT_FOUND",
    });
  }

  // Seat usage counts ACTIVE users only, matching assertWithinUserLimit — the
  // scoped `db` restricts the count to the caller's own organization.
  const [userCount, branchCount] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.branch.count({ where: { deletedAt: null, status: { not: "REJECTED" } } }),
  ]);

  const decorated = decorate(sub);
  return {
    ...decorated,
    usage: {
      users: { current: userCount, limit: sub.maxUsers },
      branches: { current: branchCount, limit: sub.maxBranches },
    },
  };
}

/** §11 — paginated subscription list for the Super Admin (unscoped). */
export async function listSubscriptions(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "currentPeriodEnd",
  });
  const { total, data } = await repo.list(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    search,
    status: query.status,
    plan: query.plan,
  });
  return { data: data.map((s) => decorate(s)), total, page, limit };
}

/** §11 — aggregate KPIs for the Super Admin subscription dashboard. */
export async function getSubscriptionStats(db) {
  const now = new Date();
  const all = await repo.findAllForScan(db);

  const stats = {
    total: all.length,
    byStatus: {},
    byPlan: {},
    active: 0,
    expiringSoon: 0,
    expired: 0,
    gracePeriod: 0,
    pendingRenewal: 0,
    suspended: 0,
    cancelled: 0,
    customPricing: 0,
    // Recognized recurring revenue from recorded amounts, normalized to a month
    // (annual / 12) and a year (monthly * 12) so both MRR and ARR are truthful.
    mrr: 0,
    arr: 0,
    currency: "NGN",
  };

  for (const raw of all) {
    const s = serialize(raw);
    const live = resolveStatus(s, now);
    stats.byStatus[live] = (stats.byStatus[live] || 0) + 1;
    stats.byPlan[s.plan] = (stats.byPlan[s.plan] || 0) + 1;
    if (s.isCustomPricing) stats.customPricing += 1;

    if (live === "ACTIVE") stats.active += 1;
    else if (live === "EXPIRING_SOON") stats.expiringSoon += 1;
    else if (live === "EXPIRED") stats.expired += 1;
    else if (live === "GRACE_PERIOD") stats.gracePeriod += 1;
    else if (live === "PENDING_RENEWAL") stats.pendingRenewal += 1;
    else if (live === "SUSPENDED") stats.suspended += 1;
    else if (live === "CANCELLED") stats.cancelled += 1;

    // Only count revenue from subscriptions currently generating it.
    const generatesRevenue = ["ACTIVE", "EXPIRING_SOON", "GRACE_PERIOD"].includes(live);
    if (generatesRevenue) {
      const amount = Number(s.amount) || 0;
      if (s.billingCycle === "ANNUAL") {
        stats.arr += amount;
        stats.mrr += amount / 12;
      } else {
        stats.mrr += amount;
        stats.arr += amount * 12;
      }
    }
  }

  stats.mrr = Math.round(stats.mrr * 100) / 100;
  stats.arr = Math.round(stats.arr * 100) / 100;
  return stats;
}

/** Single subscription by id (Super Admin), decorated. */
export async function getSubscription(db, id) {
  const sub = await repo.findById(db, id);
  if (!sub) throw ApiError.notFound("Subscription not found");
  return decorate(sub);
}

/** §10 — immutable per-period history for a subscription. */
export async function getHistory(db, id) {
  const sub = await repo.findById(db, id);
  if (!sub) throw ApiError.notFound("Subscription not found");
  const history = await repo.listHistory(db, { subscriptionId: id });
  return history.map((h) => ({ ...h, amount: Number(h.amount) }));
}

/**
 * Super-Admin update of plan / amount / limits / cycle / grace / status. Pricing
 * and plan changes recompute stored amount+limits (Enterprise keeps the supplied
 * custom amount). Does NOT change period dates — that is what renewal is for.
 */
export async function updateSubscription(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Subscription not found");

  const data = { updatedBy: auth.userId };

  const nextPlan = input.plan ?? existing.plan;
  const nextCycle = input.billingCycle ?? existing.billingCycle;

  // Recompute amount/limits when plan, cycle, amount, or limits are touched.
  const pricingTouched =
    input.plan !== undefined ||
    input.billingCycle !== undefined ||
    input.amount !== undefined ||
    input.maxBranches !== undefined ||
    input.maxUsers !== undefined;

  if (pricingTouched) {
    if (!isValidPlan(nextPlan)) {
      throw ApiError.badRequest(`Unknown subscription plan: ${nextPlan}`, { code: "INVALID_PLAN" });
    }
    const resolved = resolveAmountAndLimits(nextPlan, nextCycle, {
      amount: input.amount ?? (getPlan(nextPlan).isCustom ? Number(existing.amount) : undefined),
      maxBranches: input.maxBranches,
      maxUsers: input.maxUsers,
    });
    data.plan = nextPlan;
    data.billingCycle = nextCycle;
    data.amount = resolved.amount;
    data.isCustomPricing = resolved.isCustomPricing;
    data.maxBranches = resolved.maxBranches;
    data.maxUsers = resolved.maxUsers;

    // Always recalculate period end when billing cycle is explicitly provided
    if (input.billingCycle !== undefined) {
      const periodStart = existing.currentPeriodStart || existing.startedAt || new Date();
      data.currentPeriodEnd = computePeriodEnd(new Date(periodStart), nextCycle);
    }
  }

  if (input.gracePeriodDays !== undefined) {
    data.gracePeriodDays = Number(input.gracePeriodDays) || 0;
  }
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "CANCELLED") data.cancelledAt = new Date();
  }

  const updated = await repo.update(db, id, data);

  await writeAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATE,
    organizationId: existing.organizationId,
    actorId: auth.userId,
    entityType: "Subscription",
    entityId: id,
    oldValue: {
      plan: existing.plan,
      billingCycle: existing.billingCycle,
      amount: Number(existing.amount),
      status: existing.status,
      gracePeriodDays: existing.gracePeriodDays,
    },
    newValue: data,
    context: reqContext,
  });

  return decorate(updated);
}

/**
 * §7 — records the Super Admin's answer to "Has this laboratory renewed?".
 *
 *   decision = "YES": open a new contiguous period (start = previous end), write
 *              an immutable history row for it, and set status ACTIVE. An amount
 *              may be supplied (e.g. a re-negotiated Enterprise price).
 *   decision = "NO":  mark the subscription PENDING_RENEWAL. The period end and
 *              any grace window still govern access via the guard.
 */
export async function recordRenewalDecision(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Subscription not found");

  const { decision } = input;

  if (decision === "NO") {
    const updated = await repo.update(db, id, {
      status: "PENDING_RENEWAL",
      updatedBy: auth.userId,
    });
    await writeAudit({
      action: AUDIT_ACTIONS.SUBSCRIPTION_RENEWAL_PENDING,
      organizationId: existing.organizationId,
      actorId: auth.userId,
      entityType: "Subscription",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "PENDING_RENEWAL" },
      context: reqContext,
    });
    return decorate(updated);
  }

  // decision === "YES" — open a new contiguous period.
  const cycle = input.billingCycle ?? existing.billingCycle;
  const previousPeriodEnd = existing.currentPeriodEnd
    ? new Date(existing.currentPeriodEnd)
    : new Date();

  // If a renewalDate was supplied, honor it as the new period start; otherwise
  // the new period is contiguous from the previous end.
  const start = input.renewalDate ? new Date(input.renewalDate) : previousPeriodEnd;
  const end = input.renewalDate
    ? computePeriodEnd(start, cycle)
    : computeRenewalPeriod(previousPeriodEnd, cycle).end;

  const resolved = resolveAmountAndLimits(existing.plan, cycle, {
    amount:
      input.amount ??
      (getPlan(existing.plan).isCustom ? Number(existing.amount) : undefined),
    maxBranches: existing.maxBranches,
    maxUsers: existing.maxUsers,
  });

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const sub = await repo.update(tx, id, {
      status: "ACTIVE",
      billingCycle: cycle,
      amount: resolved.amount,
      isCustomPricing: resolved.isCustomPricing,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      renewedAt: now,
      renewedBy: auth.userId,
      updatedBy: auth.userId,
    });

    await repo.appendHistory(tx, {
      organizationId: existing.organizationId,
      subscriptionId: id,
      plan: existing.plan,
      billingCycle: cycle,
      amount: resolved.amount,
      currency: existing.currency,
      isCustomPricing: resolved.isCustomPricing,
      maxBranches: resolved.maxBranches,
      maxUsers: resolved.maxUsers,
      periodStart: start,
      periodEnd: end,
      status: "ACTIVE",
      renewedAt: now,
      renewedBy: auth.userId,
      previousPeriodEnd,
      note: input.note ?? "Renewal",
      createdBy: auth.userId,
    });

    return sub;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.SUBSCRIPTION_RENEW,
    organizationId: existing.organizationId,
    actorId: auth.userId,
    entityType: "Subscription",
    entityId: id,
    oldValue: { periodEnd: existing.currentPeriodEnd, status: existing.status },
    newValue: { periodStart: start, periodEnd: end, status: "ACTIVE" },
    context: reqContext,
  });

  return decorate(updated);
}

// ---------------------------------------------------------------------------
// Enforcement helpers (called by users/branches services + the access guard)
// ---------------------------------------------------------------------------

/**
 * Throws 403 USER_LIMIT_REACHED if adding one more user would exceed the plan's
 * seat limit. No subscription => no enforceable limit (fail-open, logged) so
 * legacy orgs are never bricked; new/seeded orgs always have one.
 */
export async function assertWithinUserLimit(db, organizationId) {
  const sub = await repo.findByOrg(db, organizationId);
  if (!sub) {
    logger.warn({ organizationId }, "user-limit check skipped: no subscription");
    return;
  }
  // Only ACTIVE users consume a seat. Deactivated (SUSPENDED) staff are retained
  // for their historical records but free their slot. organizationId is passed
  // explicitly so the count is correct even on an unscoped/transaction client.
  const current = await db.user.count({
    where: { organizationId, status: "ACTIVE", deletedAt: null },
  });
  if (current >= sub.maxUsers) {
    throw ApiError.forbidden("User limit reached for your current plan", {
      code: "USER_LIMIT_REACHED",
      details: { limit: sub.maxUsers, current, plan: sub.plan },
    });
  }
}

/** Throws 403 BRANCH_LIMIT_REACHED if adding one more branch would exceed the plan. */
export async function assertWithinBranchLimit(db, organizationId) {
  const sub = await repo.findByOrg(db, organizationId);
  if (!sub) {
    logger.warn({ organizationId }, "branch-limit check skipped: no subscription");
    return;
  }
  const current = await db.branch.count({
    where: { deletedAt: null, status: { not: "REJECTED" } },
  });
  if (current >= sub.maxBranches) {
    throw ApiError.forbidden("Branch limit reached for your current plan", {
      code: "BRANCH_LIMIT_REACHED",
      details: { limit: sub.maxBranches, current, plan: sub.plan },
    });
  }
}

/**
 * Access state for the subscription guard middleware. Uses the base client so it
 * works regardless of the caller's scope. Returns { hasSubscription, blocked,
 * status }. A missing subscription is treated as NOT blocked (fail-open) to
 * avoid locking out orgs that predate the subscription system.
 */
export async function getAccessStateForOrg(organizationId) {
  if (!organizationId) return { hasSubscription: false, blocked: false, status: null };
  const sub = await repo.findByOrg(prisma, organizationId);
  if (!sub) {
    logger.warn({ organizationId }, "access check: no subscription (allowing)");
    return { hasSubscription: false, blocked: false, status: null };
  }
  const now = new Date();
  return {
    hasSubscription: true,
    blocked: isAccessBlocked(sub, now),
    status: resolveStatus(sub, now),
  };
}

export default {
  getPlans,
  createInitialSubscription,
  getMySubscription,
  listSubscriptions,
  getSubscriptionStats,
  getSubscription,
  getHistory,
  updateSubscription,
  recordRenewalDecision,
  assertWithinUserLimit,
  assertWithinBranchLimit,
  getAccessStateForOrg,
};

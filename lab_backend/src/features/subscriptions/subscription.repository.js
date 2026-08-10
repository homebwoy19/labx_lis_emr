/**
 * Subscription repository.
 *
 * Every function takes an explicit Prisma client as its first argument so the
 * same queries compose with a tenant-scoped `req.db` (Lab Admin reading their
 * own subscription), the unscoped base client (Super Admin management + the
 * background scan across all orgs), or a `$transaction` client (lab creation +
 * renewal).
 *
 * Subscription is a tenant model (organizationId), so a scoped client only ever
 * sees the caller's own laboratory — cross-tenant reads are impossible even if a
 * where clause is forgotten.
 */

export const PUBLIC_SELECT = {
  id: true,
  organizationId: true,
  plan: true,
  billingCycle: true,
  status: true,
  amount: true,
  currency: true,
  isCustomPricing: true,
  maxBranches: true,
  maxUsers: true,
  gracePeriodDays: true,
  startedAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  renewedAt: true,
  renewedBy: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
};

const WITH_ORG_SELECT = {
  ...PUBLIC_SELECT,
  organization: { select: { id: true, name: true, acronym: true, slug: true, status: true } },
};

export async function findById(client, id) {
  return client.subscription.findFirst({ where: { id }, select: WITH_ORG_SELECT });
}

/** The single subscription belonging to an organization (one per lab). */
export async function findByOrg(client, organizationId) {
  return client.subscription.findFirst({
    where: { organizationId },
    select: PUBLIC_SELECT,
  });
}

/** Alias used by enforcement/guard code for readability. */
export const getActiveForOrg = findByOrg;

export async function create(client, data) {
  return client.subscription.create({ data, select: PUBLIC_SELECT });
}

export async function update(client, id, data) {
  return client.subscription.update({ where: { id }, data, select: PUBLIC_SELECT });
}

/** Appends an immutable period record. Never updates existing history rows. */
export async function appendHistory(client, data) {
  return client.subscriptionHistory.create({ data });
}

export async function listHistory(client, { organizationId, subscriptionId }) {
  const where = {};
  if (organizationId) where.organizationId = organizationId;
  if (subscriptionId) where.subscriptionId = subscriptionId;
  return client.subscriptionHistory.findMany({
    where,
    orderBy: { periodStart: "desc" },
  });
}

export async function list(client, { skip, take, sortBy, sortOrder, search, status, plan }) {
  const where = {};
  if (status) where.status = status;
  if (plan) where.plan = plan;
  if (search) {
    where.organization = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { acronym: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, data] = await Promise.all([
    client.subscription.count({ where }),
    client.subscription.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: WITH_ORG_SELECT,
    }),
  ]);

  return { total, data };
}

/** All subscriptions with their org — used by the background scan (base client). */
export async function findAllForScan(client) {
  return client.subscription.findMany({ select: WITH_ORG_SELECT });
}

/** Plan distribution (count of subscriptions per plan). */
export async function groupByPlan(client) {
  return client.subscription.groupBy({ by: ["plan"], _count: { _all: true } });
}

export default {
  PUBLIC_SELECT,
  findById,
  findByOrg,
  getActiveForOrg,
  create,
  update,
  appendHistory,
  listHistory,
  list,
  findAllForScan,
  groupByPlan,
};

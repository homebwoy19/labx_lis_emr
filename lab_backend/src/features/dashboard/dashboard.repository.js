import { prisma } from "../../core/prisma.js";

/**
 * Dashboard repository — aggregation queries for live dashboard data.
 *
 * Every function takes an explicit Prisma client as its first argument. For
 * Super Admin the client is the unscoped base client (platform-wide). For Lab
 * Admin / branch users the client is tenant-scoped, so every query automatically
 * respects org/branch boundaries — no manual organizationId filters needed.
 *
 * The base (unscoped) `prisma` import is used only for cross-tenant platform
 * queries (e.g. counting organizations). Tenant-data queries always go through
 * the `db` parameter.
 */

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Super Admin / Platform
// ---------------------------------------------------------------------------

/** Counts + high-level aggregates across all tenants. */
export async function platformStats() {
  const [
    totalOrgs,
    activeOrgs,
    suspendedOrgs,
    pendingOrgs,
    totalBranches,
    pendingBranches,
    totalUsers,
    totalPatients,
    totalOrders,
  ] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organization.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.organization.count({ where: { status: "SUSPENDED", deletedAt: null } }),
    prisma.organization.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.branch.count({ where: { deletedAt: null, status: { not: "REJECTED" } } }),
    prisma.branch.count({ where: { status: "PENDING_APPROVAL", deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.testOrder.count({ where: { deletedAt: null } }),
  ]);

  return {
    totalOrgs,
    activeOrgs,
    suspendedOrgs,
    pendingOrgs,
    totalBranches,
    pendingBranches,
    totalUsers,
    totalPatients,
    totalOrders,
  };
}

/** Monthly new-lab-onboarding + org counts for platform growth charts. */
export async function platformGrowth(months = 6) {
  const since = new Date(Date.now() - months * 30 * DAY_MS);
  const orgs = await prisma.organization.findMany({
    where: { createdAt: { gte: since }, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = {};
  for (const o of orgs) {
    const key = `${o.createdAt.getUTCFullYear()}-${String(o.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    result.push({ month: monthNames[d.getMonth()], year: d.getFullYear(), newLabs: buckets[key] || 0 });
  }
  return result;
}

/** Recent platform-level audit entries (Super Admin). */
export async function platformActivity(limit = 10) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      ipAddress: true,
      actor: { select: { id: true, firstName: true, lastName: true } },
      organization: { select: { id: true, name: true } },
    },
  });
}

/** Pending branch requests across all tenants (Super Admin). */
export async function pendingBranchRequests(limit = 20) {
  return prisma.branch.findMany({
    where: { status: "PENDING_APPROVAL", deletedAt: null },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      phone: true,
      address: true,
      createdAt: true,
      organization: { select: { id: true, name: true, acronym: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Organization (Lab Admin) and Branch (Employee) — tenant-scoped via `db`
// ---------------------------------------------------------------------------

/**
 * Core dashboard stats. The `db` client is tenant-scoped, so all counts are
 * automatically limited to the caller's organization (and branch, for non-admins).
 */
export async function orgStats(db) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPatients,
    newPatientsThisMonth,
    totalOrders,
    ordersThisMonth,
    pendingOrders,
    completedOrdersThisMonth,
    totalBranches,
    activeBranches,
    totalStaff,
  ] = await Promise.all([
    db.patient.count({ where: { deletedAt: null } }),
    db.patient.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
    db.testOrder.count({ where: { deletedAt: null } }),
    db.testOrder.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
    db.testOrder.count({
      where: {
        deletedAt: null,
        status: { in: ["PENDING_PAYMENT", "AWAITING_SAMPLE", "SAMPLE_COLLECTED", "IN_PROGRESS"] },
      },
    }),
    db.testOrder.count({
      where: {
        deletedAt: null,
        status: { in: ["APPROVED", "RELEASED"] },
        updatedAt: { gte: startOfMonth },
      },
    }),
    db.branch.count({ where: { deletedAt: null, status: { not: "REJECTED" } } }),
    db.branch.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.user.count({ where: { deletedAt: null } }),
  ]);

  // Revenue aggregates
  const [revenueAll, revenueToday, revenueMonth] = await Promise.all([
    db.payment.aggregate({ where: { deletedAt: null, status: "PAID" }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { deletedAt: null, status: "PAID", paidAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { deletedAt: null, status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalPatients,
    newPatientsThisMonth,
    totalOrders,
    ordersThisMonth,
    pendingOrders,
    completedOrdersThisMonth,
    totalBranches,
    activeBranches,
    totalStaff,
    totalRevenue: Number(revenueAll._sum.amount ?? 0),
    todayRevenue: Number(revenueToday._sum.amount ?? 0),
    monthRevenue: Number(revenueMonth._sum.amount ?? 0),
  };
}

/** Monthly revenue per branch (last N months) for charts. */
export async function revenueByMonth(db, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const payments = await db.payment.findMany({
    where: { deletedAt: null, status: "PAID", paidAt: { gte: since } },
    select: {
      amount: true,
      paidAt: true,
      branchId: true,
    },
  });

  // Also fetch branch names for labeling
  const branches = await db.branch.findMany({
    where: { deletedAt: null, status: { not: "REJECTED" } },
    select: { id: true, name: true },
  });
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // Build monthly buckets per branch
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const buckets = {};
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = `${p.paidAt.getUTCFullYear()}-${String(p.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bName = branchMap.get(p.branchId) || "Unknown";
    if (!buckets[key]) buckets[key] = {};
    buckets[key][bName] = (buckets[key][bName] || 0) + Number(p.amount);
  }

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: monthNames[d.getMonth()], ...(buckets[key] || {}) });
  }

  return { chartData: result, branches: branches.map((b) => b.name) };
}

/** Tests grouped by category for pie chart. */
export async function testsByCategory(db) {
  const items = await db.testOrderItem.groupBy({
    by: ["testName"],
    _count: { _all: true },
  });

  // Attempt a join with test categories through Test model
  const tests = await db.test.findMany({
    where: { deletedAt: null },
    select: { name: true, category: { select: { name: true } } },
  });
  const categoryByTest = new Map(tests.map((t) => [t.name, t.category?.name || "Uncategorized"]));

  const catMap = {};
  for (const item of items) {
    const cat = categoryByTest.get(item.testName) || "Uncategorized";
    catMap[cat] = (catMap[cat] || 0) + item._count._all;
  }

  return Object.entries(catMap).map(([name, value]) => ({ name, value }));
}

/** Daily test order item count (last 7 days) for bar charts. */
export async function testsByDay(db, days = 7) {
  const since = new Date(Date.now() - days * DAY_MS);
  const items = await db.testOrderItem.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = {};
  for (const item of items) {
    const dayName = dayNames[item.createdAt.getDay()];
    buckets[dayName] = (buckets[dayName] || 0) + 1;
  }

  // Return an ordered list starting from 7 days ago
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const dayName = dayNames[d.getDay()];
    result.push({ day: dayName, tests: buckets[dayName] || 0 });
  }
  return result;
}

/** Recent orders for a dashboard table. */
export async function recentOrders(db, limit = 10) {
  return db.testOrder.findMany({
    where: { deletedAt: null },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderCode: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
      branch: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });
}

/** Recent audit entries (tenant-scoped). */
export async function recentActivity(db, limit = 10) {
  return db.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export default {
  platformStats,
  platformGrowth,
  platformActivity,
  pendingBranchRequests,
  orgStats,
  revenueByMonth,
  testsByCategory,
  testsByDay,
  recentOrders,
  recentActivity,
};

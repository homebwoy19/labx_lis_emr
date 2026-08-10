import { logger } from "../../core/logger.js";
import * as repo from "./dashboard.repository.js";
import { getSubscriptionStats } from "../subscriptions/subscription.service.js";

/**
 * Dashboard service — role-aware orchestrator for live dashboard data.
 *
 * The shape of the response varies by the caller's role:
 *   • Super Admin  → platform-wide stats + subscription KPIs + growth charts
 *   • Lab Admin    → organization-wide stats + charts + recent activity
 *   • Branch user  → branch-scoped stats + recent activity (filtered by
 *                    the tenant client extension automatically)
 *
 * The tenant-scoped `db` is passed through from req.db so every downstream
 * query respects the authenticated user's org/branch boundary.
 */

export async function getDashboard(db, auth) {
  if (auth.isSuperAdmin) {
    return getSuperAdminDashboard(db);
  }

  if (auth.isOrgAdmin) {
    return getOrgAdminDashboard(db);
  }

  return getBranchDashboard(db);
}

// ---------------------------------------------------------------------------
// Super Admin
// ---------------------------------------------------------------------------

async function getSuperAdminDashboard(db) {
  const [stats, growth, activity, pendingBranches, subscriptionStats] = await Promise.all([
    repo.platformStats(),
    repo.platformGrowth(6),
    repo.platformActivity(15),
    repo.pendingBranchRequests(10),
    safeSubscriptionStats(db),
  ]);

  return {
    role: "super_admin",
    stats,
    growth,
    activity: activity.map(formatActivity),
    pendingBranches,
    subscriptionStats,
  };
}

// ---------------------------------------------------------------------------
// Lab Admin (organization-wide)
// ---------------------------------------------------------------------------

async function getOrgAdminDashboard(db) {
  const [stats, revenue, categories, dailyTests, orders, activity] = await Promise.all([
    repo.orgStats(db),
    repo.revenueByMonth(db, 6),
    repo.testsByCategory(db),
    repo.testsByDay(db, 7),
    repo.recentOrders(db, 10),
    repo.recentActivity(db, 10),
  ]);

  return {
    role: "org_admin",
    stats,
    revenueChart: revenue,
    testsByCategory: categories,
    testsByDay: dailyTests,
    recentOrders: orders.map(formatOrder),
    activity: activity.map(formatActivity),
  };
}

// ---------------------------------------------------------------------------
// Branch user (employee)
// ---------------------------------------------------------------------------

async function getBranchDashboard(db) {
  const [stats, dailyTests, orders, activity] = await Promise.all([
    repo.orgStats(db), // tenant client filters by branchId automatically
    repo.testsByDay(db, 7),
    repo.recentOrders(db, 10),
    repo.recentActivity(db, 10),
  ]);

  return {
    role: "branch",
    stats,
    testsByDay: dailyTests,
    recentOrders: orders.map(formatOrder),
    activity: activity.map(formatActivity),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatOrder(o) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount ?? 0),
    patientName: o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : "—",
    patientCode: o.patient?.patientCode ?? "—",
    branchName: o.branch?.name ?? "—",
    itemCount: o._count?.items ?? 0,
  };
}

function formatActivity(a) {
  return {
    ...a,
    actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : "System",
    orgName: a.organization?.name ?? null,
  };
}

/** Subscription stats that never throw into the dashboard. */
async function safeSubscriptionStats(db) {
  try {
    return await getSubscriptionStats(db);
  } catch (err) {
    logger.warn({ err }, "dashboard: subscription stats unavailable");
    return null;
  }
}

export default { getDashboard };

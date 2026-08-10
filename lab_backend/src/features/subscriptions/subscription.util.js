import { getPlan, planAmount, planLimits, isCustomPlan } from "./subscription.plans.js";

/**
 * Pure, database-free subscription math.
 *
 * Every function here is deterministic given its inputs — no Prisma, no I/O — so
 * the billing-date logic, status transitions and limit resolution are covered by
 * fast unit tests (subscription.util.test.js) and can be reasoned about in
 * isolation.
 *
 * Billing model (standard SaaS, Stripe-style): periods are calendar-anchored and
 * contiguous, [start, end). Monthly end = start + 1 calendar month; Annual end =
 * start + 1 year. Day-of-month is clamped to the target month's length (e.g.
 * Jan 31 + 1 month -> Feb 28/29). A renewal's new start is the previous period's
 * end, so there is never a gap or overlap between periods.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Last day (28-31) of a given UTC year/month (month is 0-based). */
function daysInUtcMonth(year, month) {
  // Day 0 of next month == last day of this month.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Adds a whole number of calendar months in UTC, clamping the day-of-month to
 * the target month's length. Returns a new Date; input is not mutated.
 */
export function addCalendarMonths(date, months) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInUtcMonth(targetYear, normalizedMonth));

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      clampedDay,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

/** Adds whole calendar years in UTC (month-end clamp handles Feb 29). */
export function addCalendarYears(date, years) {
  return addCalendarMonths(date, years * 12);
}

/** Computes the exclusive period end for a start date + billing cycle. */
export function computePeriodEnd(start, billingCycle) {
  const startDate = new Date(start);
  if (billingCycle === "ANNUAL") return addCalendarYears(startDate, 1);
  // Default to MONTHLY for any non-annual cycle.
  return addCalendarMonths(startDate, 1);
}

/**
 * Computes the next contiguous period from a subscription's current period.
 * The new period starts exactly when the previous one ended (no gap/overlap).
 * Returns { start, end }.
 */
export function computeRenewalPeriod(previousPeriodEnd, billingCycle) {
  const start = new Date(previousPeriodEnd);
  return { start, end: computePeriodEnd(start, billingCycle) };
}

/** ms remaining until period end; negative once expired. */
export function msUntil(periodEnd, now) {
  return new Date(periodEnd).getTime() - new Date(now).getTime();
}

/** Whole days remaining until period end (floored); negative once expired. */
export function daysUntil(periodEnd, now) {
  return Math.floor(msUntil(periodEnd, now) / DAY_MS);
}

/**
 * The instant access is finally blocked: period end plus any granted grace days.
 * Returns a Date, or null if the subscription has no end date.
 */
export function graceEndsAt(sub) {
  if (!sub?.currentPeriodEnd) return null;
  const grace = Number(sub.gracePeriodDays ?? 0);
  const end = new Date(sub.currentPeriodEnd);
  if (!grace) return end;
  return new Date(end.getTime() + grace * DAY_MS);
}

/** Threshold (days before end) at which a period is considered EXPIRING_SOON. */
const EXPIRING_SOON_DAYS = 7;

/**
 * Derives the live status of a subscription from its dates + grace window.
 * Terminal states set explicitly by an admin (SUSPENDED, CANCELLED) are honored
 * as-is; everything else is computed from the clock so the value is always
 * truthful without a background job having run yet.
 */
export function resolveStatus(sub, now) {
  if (!sub) return "EXPIRED";
  if (sub.status === "SUSPENDED") return "SUSPENDED";
  if (sub.status === "CANCELLED") return "CANCELLED";
  if (sub.status === "PENDING_RENEWAL") return "PENDING_RENEWAL";

  if (!sub.currentPeriodEnd) return sub.status || "ACTIVE";

  const nowMs = new Date(now).getTime();
  const endMs = new Date(sub.currentPeriodEnd).getTime();
  const graceEnd = graceEndsAt(sub);
  const graceEndMs = graceEnd ? graceEnd.getTime() : endMs;

  if (nowMs < endMs) {
    const daysLeft = Math.floor((endMs - nowMs) / DAY_MS);
    return daysLeft <= EXPIRING_SOON_DAYS ? "EXPIRING_SOON" : "ACTIVE";
  }
  // Period has ended.
  if (nowMs < graceEndMs) return "GRACE_PERIOD";
  return "EXPIRED";
}

/**
 * Whether backend access should be blocked for this subscription right now.
 * Blocked once the period end + grace window has fully elapsed, or when an admin
 * has SUSPENDED/CANCELLED the lab. A PENDING_RENEWAL lab whose grace has elapsed
 * is also blocked. Super Admin bypass is enforced in the guard, not here.
 */
export function isAccessBlocked(sub, now) {
  if (!sub) return true;
  if (sub.status === "SUSPENDED" || sub.status === "CANCELLED") return true;

  const status = resolveStatus(sub, now);
  return status === "EXPIRED";
}

/**
 * Resolves the amount + limits to persist for a (plan, cycle) pair, honoring
 * Enterprise custom pricing/limits. `custom` may carry { amount, maxBranches,
 * maxUsers } supplied by the Super Admin.
 *
 * Non-custom plans ignore any supplied amount/limits (pricing is fixed). Custom
 * (Enterprise) plans REQUIRE an explicit amount and use supplied limits when
 * given, falling back to the plan's minimums.
 */
export function resolveAmountAndLimits(planKey, billingCycle, custom = {}) {
  const plan = getPlan(planKey);
  if (!plan) {
    throw new Error(`Unknown plan: ${planKey}`);
  }

  const isCustom = isCustomPlan(planKey);
  const baseLimits = planLimits(planKey);

  if (!isCustom) {
    return {
      isCustomPricing: false,
      amount: planAmount(planKey, billingCycle),
      maxBranches: baseLimits.maxBranches,
      maxUsers: baseLimits.maxUsers,
    };
  }

  // Enterprise / custom pricing.
  const amount = custom.amount;
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    throw new Error("A custom amount is required for the Enterprise plan");
  }

  return {
    isCustomPricing: true,
    amount: Number(amount),
    maxBranches:
      custom.maxBranches != null ? Number(custom.maxBranches) : baseLimits.maxBranches,
    maxUsers: custom.maxUsers != null ? Number(custom.maxUsers) : baseLimits.maxUsers,
  };
}

export default {
  addCalendarMonths,
  addCalendarYears,
  computePeriodEnd,
  computeRenewalPeriod,
  msUntil,
  daysUntil,
  graceEndsAt,
  resolveStatus,
  isAccessBlocked,
  resolveAmountAndLimits,
  EXPIRING_SOON_DAYS,
};

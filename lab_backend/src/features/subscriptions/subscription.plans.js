/**
 * Subscription plan catalog — the single source of truth for pricing and limits.
 *
 * Kept as a constants module (not a DB table) because it is fixed business
 * configuration; changing a price is a deploy, not a data edit. Enterprise uses
 * CUSTOM pricing: the amounts below are floors/hints only — the Super Admin
 * enters the exact negotiated amount at lab creation, which is stored on the
 * subscription and used verbatim (never overwritten with a catalog default).
 *
 * Amounts are in NGN (whole naira). Served to the frontend via
 * GET /subscriptions/plans so the onboarding UI and pricing stay in lockstep.
 */

export const BILLING_CYCLES = ["MONTHLY", "ANNUAL"];

export const PLANS = {
  BASIC: {
    key: "BASIC",
    name: "Basic",
    isCustom: false,
    price: { ANNUAL: 720000, MONTHLY: 62500 },
    limits: { maxBranches: 1, maxUsers: 5 },
  },
  STARTER: {
    key: "STARTER",
    name: "Starter",
    isCustom: false,
    price: { ANNUAL: 850000, MONTHLY: 75000 },
    limits: { maxBranches: 2, maxUsers: 15 },
  },
  GROWTH: {
    key: "GROWTH",
    name: "Growth",
    isCustom: false,
    price: { ANNUAL: 2000000, MONTHLY: 180000 },
    limits: { maxBranches: 5, maxUsers: 50 },
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    isCustom: true,
    // Floors / starting points only — the real amount is Super-Admin supplied.
    price: { ANNUAL: 5000000, MONTHLY: 450000 },
    limits: { maxBranches: 20, maxUsers: 250 },
  },
};

export const PLAN_KEYS = Object.keys(PLANS);

/** Returns the plan definition or throws-friendly undefined for unknown keys. */
export function getPlan(key) {
  return PLANS[key];
}

export function isValidPlan(key) {
  return Object.prototype.hasOwnProperty.call(PLANS, key);
}

/** Base limits for a plan (Enterprise limits are minimums, overridable). */
export function planLimits(key) {
  const plan = PLANS[key];
  if (!plan) return null;
  return { ...plan.limits };
}

/** Catalog amount for a plan + cycle. For Enterprise this is the floor only. */
export function planAmount(key, cycle) {
  const plan = PLANS[key];
  if (!plan) return null;
  return plan.price[cycle] ?? null;
}

export function isCustomPlan(key) {
  return Boolean(PLANS[key]?.isCustom);
}

/** Public catalog shape returned by GET /subscriptions/plans. */
export function planCatalog() {
  return PLAN_KEYS.map((key) => {
    const p = PLANS[key];
    return {
      key: p.key,
      name: p.name,
      isCustom: p.isCustom,
      billingCycles: BILLING_CYCLES,
      price: { ...p.price },
      limits: { ...p.limits },
    };
  });
}

export default PLANS;

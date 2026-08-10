import { z } from "zod";
import { PLAN_KEYS } from "./subscription.plans.js";

/**
 * Subscription request schemas.
 *
 * Pricing and plan are business-controlled: only a Super Admin (SUBSCRIPTION_MANAGE)
 * can change them. A Lab Admin can read its own subscription but never mutate
 * pricing/plan — so there is no "update my subscription" body here at all.
 */

const planEnum = z.enum(PLAN_KEYS);
const cycleEnum = z.enum(["MONTHLY", "ANNUAL"]);
const statusEnum = z.enum([
  "TRIALING",
  "ACTIVE",
  "EXPIRING_SOON",
  "PAST_DUE",
  "GRACE_PERIOD",
  "PENDING_RENEWAL",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
]);

const money = z.coerce.number().nonnegative().max(1_000_000_000);

export const listSubscriptionsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: statusEnum.optional(),
    plan: planEnum.optional(),
    sortBy: z.enum(["currentPeriodEnd", "currentPeriodStart", "createdAt", "amount", "plan"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export const subscriptionIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid subscription id") }),
};

export const updateSubscriptionSchema = {
  params: z.object({ id: z.string().uuid("Invalid subscription id") }),
  body: z
    .object({
      plan: planEnum.optional(),
      billingCycle: cycleEnum.optional(),
      amount: money.optional(),
      maxBranches: z.coerce.number().int().positive().max(100000).optional(),
      maxUsers: z.coerce.number().int().positive().max(1000000).optional(),
      gracePeriodDays: z.coerce.number().int().min(0).max(365).optional(),
      status: statusEnum.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const renewalDecisionSchema = {
  params: z.object({ id: z.string().uuid("Invalid subscription id") }),
  body: z
    .object({
      decision: z.enum(["YES", "NO"]),
      // Optional overrides for a YES renewal.
      billingCycle: cycleEnum.optional(),
      amount: money.optional(),
      renewalDate: z.coerce.date().optional(),
      note: z.string().trim().max(500).optional(),
    })
    .refine(
      (d) => d.decision === "YES" || (d.amount === undefined && d.renewalDate === undefined),
      "amount and renewalDate only apply when decision is YES",
    ),
};

export default {
  listSubscriptionsSchema,
  subscriptionIdParamSchema,
  updateSubscriptionSchema,
  renewalDecisionSchema,
};

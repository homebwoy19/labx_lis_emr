import { z } from "zod";
import { passwordSchema } from "../../utils/passwordPolicy.js";
import { PLAN_KEYS } from "../subscriptions/subscription.plans.js";

/**
 * Organization (laboratory) request schemas — platform / Super Admin surface.
 *
 * The acronym is used to build patient codes (e.g. AGD -> AGD-PID-0000001), so
 * it is constrained to a short uppercase token and is immutable after creation.
 */

/**
 * Optional first Lab Admin provisioned alongside the organization. Supplying it
 * makes the new laboratory immediately usable — its owner can sign in and start
 * inviting staff without a second setup step.
 */
const initialAdmin = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().max(30).optional(),
    password: passwordSchema,
  })
  .optional();

const acronym = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Acronym must be at least 2 characters")
  .max(6, "Acronym must be at most 6 characters")
  .regex(/^[A-Z0-9]+$/, "Acronym may only contain letters and numbers");

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes");

/**
 * Optional subscription provisioned alongside the organization. When provided,
 * the system creates the initial subscription and history record atomically
 * inside the org-creation transaction.
 */
const initialSubscription = z
  .object({
    plan: z.enum(PLAN_KEYS),
    billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
    amount: z.coerce.number().nonnegative().max(1_000_000_000).optional(),
    startDate: z.coerce.date().optional(),
    gracePeriodDays: z.coerce.number().int().min(0).max(365).optional(),
    maxBranches: z.coerce.number().int().positive().max(100000).optional(),
    maxUsers: z.coerce.number().int().positive().max(1000000).optional(),
  })
  .optional();

export const createOrganizationSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Name is required").max(150),
    acronym,
    slug,
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(500).optional(),
    admin: initialAdmin,
    subscription: initialSubscription,
  }),
};

export const updateOrganizationSchema = {
  params: z.object({ id: z.string().uuid("Invalid organization id") }),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().max(500).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const organizationIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid organization id") }),
};

export const suspendOrganizationSchema = {
  params: z.object({ id: z.string().uuid("Invalid organization id") }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
};

export const listOrganizationsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
    sortBy: z.enum(["createdAt", "name", "acronym"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdParamSchema,
  suspendOrganizationSchema,
  listOrganizationsSchema,
};

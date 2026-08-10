import { z } from "zod";

/**
 * Branch request schemas.
 *
 * organizationId is never accepted from the client — it comes from the Lab
 * Admin's authenticated tenant context. New branches are created in
 * PENDING_APPROVAL and must be approved by a Super Admin before they go live.
 */

const code = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "Branch code is required")
  .max(12)
  .regex(/^[A-Z0-9-]+$/, "Code may only contain letters, numbers and dashes");

export const createBranchSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Name is required").max(150),
    code,
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(500).optional(),
  }),
};

export const updateBranchSchema = {
  params: z.object({ id: z.string().uuid("Invalid branch id") }),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().max(500).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const branchIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid branch id") }),
};

export const rejectBranchSchema = {
  params: z.object({ id: z.string().uuid("Invalid branch id") }),
  body: z.object({
    reason: z.string().trim().min(1, "A rejection reason is required").max(500),
  }),
};

export const listBranchesSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
    sortBy: z.enum(["createdAt", "name", "code"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createBranchSchema,
  updateBranchSchema,
  branchIdParamSchema,
  rejectBranchSchema,
  listBranchesSchema,
};

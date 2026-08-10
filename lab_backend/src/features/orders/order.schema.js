import { z } from "zod";

/**
 * Test order schemas.
 *
 * A receptionist builds an order by choosing a patient and a set of tests from
 * the catalog. organizationId/branchId are never accepted from the client — they
 * come from the authenticated tenant context. Prices are NOT accepted either:
 * the server snapshots the catalog price at order time so later price changes
 * never rewrite history.
 */

const orderStatus = z.enum([
  "PENDING_PAYMENT",
  "AWAITING_SAMPLE",
  "SAMPLE_COLLECTED",
  "IN_PROGRESS",
  "RESULT_ENTERED",
  "PENDING_APPROVAL",
  "APPROVED",
  "RELEASED",
  "REJECTED",
  "CANCELLED",
]);

export const createOrderSchema = {
  body: z.object({
    patientId: z.string().uuid("Invalid patient id"),
    testIds: z
      .array(z.string().uuid("Invalid test id"))
      .min(1, "At least one test is required")
      .max(50, "Too many tests in a single order"),
    notes: z.string().trim().max(1000).optional(),
  }),
};

export const updateOrderSchema = {
  params: z.object({ id: z.string().uuid("Invalid order id") }),
  body: z
    .object({
      notes: z.string().trim().max(1000).nullable().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const cancelOrderSchema = {
  params: z.object({ id: z.string().uuid("Invalid order id") }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
};

export const orderIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid order id") }),
};

export const listOrdersSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: orderStatus.optional(),
    patientId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "orderCode", "status", "totalAmount"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema,
  orderIdParamSchema,
  listOrdersSchema,
};

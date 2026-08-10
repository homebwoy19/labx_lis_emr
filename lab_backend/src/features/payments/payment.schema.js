import { z } from "zod";

/**
 * Payment schemas.
 *
 * Payments are manual records of money received against an order (cash, card,
 * transfer, mobile, or a waiver). The gateway fields on the model are reserved
 * for a future online-payment integration and are not accepted here.
 * organizationId/branchId come from the tenant context.
 */

const paymentMethod = z.enum(["CASH", "CARD", "TRANSFER", "MOBILE", "WAIVER"]);

const amount = z
  .number({ invalid_type_error: "Amount must be a number" })
  .nonnegative("Amount cannot be negative")
  .or(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid figure")
      .transform(Number),
  );

export const createPaymentSchema = {
  body: z.object({
    orderId: z.string().uuid("Invalid order id"),
    amount,
    method: paymentMethod.default("CASH"),
    reference: z.string().trim().max(120).optional(),
  }),
};

export const paymentIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid payment id") }),
};

export const listPaymentsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"]).optional(),
    method: paymentMethod.optional(),
    orderId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "amount"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createPaymentSchema,
  paymentIdParamSchema,
  listPaymentsSchema,
};

import { z } from "zod";

/**
 * Sample schemas.
 *
 * A sample is an accession drawn against an order. The barcode is generated
 * server-side from the order code (never client-supplied); organizationId /
 * branchId come from the tenant context.
 */

const sampleStatus = z.enum(["PENDING", "COLLECTED", "RECEIVED", "REJECTED"]);

export const createSampleSchema = {
  body: z.object({
    orderId: z.string().uuid("Invalid order id"),
    sampleType: z.string().trim().max(80).optional(),
  }),
};

export const collectSampleSchema = {
  params: z.object({ id: z.string().uuid("Invalid sample id") }),
  body: z.object({
    sampleType: z.string().trim().max(80).optional(),
  }),
};

export const rejectSampleSchema = {
  params: z.object({ id: z.string().uuid("Invalid sample id") }),
  body: z.object({
    reason: z.string().trim().min(1, "A rejection reason is required").max(500),
  }),
};

export const sampleIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid sample id") }),
};

export const listSamplesSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: sampleStatus.optional(),
    orderId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "barcode", "status"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createSampleSchema,
  collectSampleSchema,
  rejectSampleSchema,
  sampleIdParamSchema,
  listSamplesSchema,
};

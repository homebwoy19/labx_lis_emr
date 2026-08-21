import { z } from "zod";

/**
 * Result schemas.
 *
 * A result belongs to exactly one order item. STRUCTURED results carry a JSON
 * `data` payload (analyte → value/unit/flag); UPLOADED results reference a
 * stored document instead. organizationId/branchId come from the tenant context.
 */

const resultType = z.enum(["STRUCTURED", "UPLOADED"]);

// Permissive structured payload — the shape is guided by the test's template.
const resultData = z.record(z.string(), z.any()).or(z.array(z.any()));

export const enterResultSchema = {
  body: z
    .object({
      orderItemId: z.string().uuid("Invalid order item id"),
      type: resultType.default("STRUCTURED"),
      data: resultData.optional(),
      interpretation: z.string().trim().max(5000).optional(),
      documentId: z.string().uuid("Invalid document id").optional(),
    })
    .refine((d) => d.type !== "STRUCTURED" || d.data !== undefined, {
      message: "Structured results require a data payload",
      path: ["data"],
    })
    .refine((d) => d.type !== "UPLOADED" || d.documentId !== undefined, {
      message: "Uploaded results require a documentId",
      path: ["documentId"],
    }),
};

export const rejectResultSchema = {
  params: z.object({ id: z.string().uuid("Invalid result id") }),
  body: z.object({
    reason: z.string().trim().min(1, "A rejection reason is required").max(500),
  }),
};

export const prepareResultSchema = {
  params: z.object({ id: z.string().uuid("Invalid result id") }),
  body: z.object({
    // The narrative report the receptionist types/edits onto the letterhead.
    preparedReport: z.string().trim().max(20000).optional(),
    // true → submit to the Lab Admin for approval (DRAFT → PENDING_APPROVAL).
    submit: z.boolean().optional().default(false),
  }),
};

export const sendOrderReportSchema = {
  params: z.object({ orderId: z.string().uuid("Invalid order id") }),
};

export const resultIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid result id") }),
};

export const releaseOrderSchema = {
  params: z.object({ orderId: z.string().uuid("Invalid order id") }),
};

export const listResultsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
    orderId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "status"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  enterResultSchema,
  rejectResultSchema,
  prepareResultSchema,
  sendOrderReportSchema,
  resultIdParamSchema,
  releaseOrderSchema,
  listResultsSchema,
};

import { z } from "zod";

/**
 * Test catalog schemas — test categories and tests.
 *
 * organizationId is never accepted from the client; it comes from the Lab
 * Admin's tenant context. Prices are validated as non-negative money values.
 */

const testType = z.enum(["LABORATORY", "RADIOLOGY"]);

// A permissive JSON template describing structured result fields (analytes,
// units, reference ranges). Shape is validated when a result is entered.
const resultTemplate = z.record(z.string(), z.any()).or(z.array(z.any())).optional();

const price = z
  .number({ invalid_type_error: "Price must be a number" })
  .nonnegative("Price cannot be negative")
  .or(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid amount")
      .transform(Number),
  );

// ── Categories ───────────────────────────────────────────────────────────────

export const createCategorySchema = {
  body: z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(500).optional(),
  }),
};

export const updateCategorySchema = {
  params: z.object({ id: z.string().uuid("Invalid category id") }),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      description: z.string().trim().max(500).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const categoryIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid category id") }),
};

export const listCategoriesSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(["createdAt", "name"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

// ── Tests ────────────────────────────────────────────────────────────────────

export const createTestSchema = {
  body: z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Code is required")
      .max(20)
      .regex(/^[A-Z0-9-]+$/, "Code may only contain letters, numbers and dashes"),
    name: z.string().trim().min(1, "Name is required").max(150),
    type: testType.default("LABORATORY"),
    price,
    turnaroundHrs: z.coerce.number().int().positive().max(8760).optional(),
    categoryId: z.string().uuid("Invalid category id").optional(),
    resultTemplate,
  }),
};

export const updateTestSchema = {
  params: z.object({ id: z.string().uuid("Invalid test id") }),
  body: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      type: testType.optional(),
      price: price.optional(),
      turnaroundHrs: z.coerce.number().int().positive().max(8760).nullable().optional(),
      categoryId: z.string().uuid("Invalid category id").nullable().optional(),
      resultTemplate,
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const testIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid test id") }),
};

export const listTestsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    type: testType.optional(),
    categoryId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "name", "code", "price"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesSchema,
  createTestSchema,
  updateTestSchema,
  testIdParamSchema,
  listTestsSchema,
};

import { z } from "zod";

/**
 * Patient request schemas.
 *
 * organizationId is NEVER accepted from the client — it is derived from the
 * authenticated tenant context and stamped server-side. `branchId` is accepted
 * ONLY as an optional hint so an organization-scoped Lab Admin (who has no
 * implicit branch) can choose which of THEIR OWN branches to register a patient
 * under; it is always authorized server-side against the caller's organization,
 * and is ignored for branch-scoped staff (who always use their own branch). A
 * caller can never register a patient into another lab/branch.
 */

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]);

// Accepts YYYY-MM-DD or full ISO; coerces to Date. Rejects future dates.
const dateOfBirth = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"))
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid date")
  .refine((d) => d <= new Date(), "Date of birth cannot be in the future")
  .optional();

export const createPatientSchema = {
  body: z.object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    gender: genderEnum.default("UNKNOWN"),
    dateOfBirth,
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    address: z.string().trim().max(500).optional(),
    // Optional; only honored for org-scoped admins. Authorized server-side.
    branchId: z.string().uuid("Invalid branch id").optional(),
  }),
};

export const updatePatientSchema = {
  params: z.object({ id: z.string().uuid("Invalid patient id") }),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      gender: genderEnum.optional(),
      dateOfBirth,
      phone: z.string().trim().max(30).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      address: z.string().trim().max(500).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const patientIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid patient id") }),
};

export const listPatientsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(["createdAt", "lastName", "firstName", "patientCode"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createPatientSchema,
  updatePatientSchema,
  patientIdParamSchema,
  listPatientsSchema,
};

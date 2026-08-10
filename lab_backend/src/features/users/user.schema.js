import { z } from "zod";
import { passwordSchema } from "../../utils/passwordPolicy.js";
import { ROLES } from "../../constants/roles.js";

/**
 * User & role-management request schemas.
 *
 * A Lab Admin manages staff within their own laboratory. organizationId is never
 * accepted from the client — it is taken from the admin's authenticated context.
 * SUPER_ADMIN is intentionally not assignable here: it is a platform-only role.
 */

// Roles a Lab Admin may assign to staff (everything except the platform role).
const assignableRoleKeys = Object.values(ROLES).filter((k) => k !== ROLES.SUPER_ADMIN);
const roleKey = z.enum(assignableRoleKeys);

export const createUserSchema = {
  body: z.object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().trim().toLowerCase().email("A valid email is required"),
    phone: z.string().trim().max(30).optional(),
    password: passwordSchema,
    roleKey,
    // Required for branch-scoped roles; ignored for the organization-wide Lab Admin.
    branchId: z.string().uuid("Invalid branch id").optional(),
  }),
};

export const updateUserSchema = {
  params: z.object({ id: z.string().uuid("Invalid user id") }),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      branchId: z.string().uuid("Invalid branch id").nullable().optional(),
      status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "At least one field must be provided"),
};

export const setRolesSchema = {
  params: z.object({ id: z.string().uuid("Invalid user id") }),
  body: z.object({
    roleKeys: z
      .array(roleKey)
      .min(1, "At least one role is required")
      .max(assignableRoleKeys.length),
  }),
};

export const userIdParamSchema = {
  params: z.object({ id: z.string().uuid("Invalid user id") }),
};

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "LOCKED"]).optional(),
    branchId: z.string().uuid().optional(),
    sortBy: z.enum(["createdAt", "lastName", "firstName", "email"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
};

export default {
  createUserSchema,
  updateUserSchema,
  setRolesSchema,
  userIdParamSchema,
  listUsersSchema,
};

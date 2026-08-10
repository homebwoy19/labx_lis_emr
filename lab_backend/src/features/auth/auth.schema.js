import { z } from "zod";
import { passwordSchema } from "../../utils/passwordPolicy.js";

/**
 * Auth request schemas (Zod).
 *
 * These define the trusted shape of every auth endpoint's input. The validate
 * middleware replaces req.body with the parsed result, so controllers work with
 * clean, coerced data only.
 */

const email = z.string().trim().toLowerCase().email("A valid email is required");

export const loginSchema = {
  body: z.object({
    email,
    password: z.string().min(1, "Password is required"),
    // Tenant the credentials are being presented to. Present for laboratory
    // logins (`/foundation`, `/medlab`); omitted for the platform Super Admin
    // login (`/super-admin`). `.nullish()` accepts both absent and explicit null.
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/)
      .nullish(),
    deviceId: z.string().trim().min(1).max(128).optional(),
    deviceName: z.string().trim().max(128).optional(),
  }),
};

export const refreshSchema = {
  // Refresh token comes from the HttpOnly cookie; body is empty.
  body: z.object({}).passthrough(),
};

export const logoutSchema = {
  body: z.object({}).passthrough(),
};

export const forgotPasswordSchema = {
  body: z.object({ email }),
};

export const resetPasswordSchema = {
  body: z
    .object({
      token: z.string().min(1, "Reset token is required"),
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};

export default {
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};

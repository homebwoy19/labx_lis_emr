import { z } from "zod";

/**
 * Tenant request schemas (Zod).
 *
 * The slug is the public tenant identifier used in URLs (`/foundation`) and,
 * later, subdomains (`foundation.lis.com`). It mirrors the Organization.slug
 * constraint: lowercase alphanumerics and dashes.
 */
export const resolveTenantSchema = {
  params: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Invalid laboratory")
      .max(60, "Invalid laboratory")
      .regex(/^[a-z0-9-]+$/, "Invalid laboratory"),
  }),
};

export default { resolveTenantSchema };

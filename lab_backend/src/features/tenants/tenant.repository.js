import { prisma } from "../../core/prisma.js";

/**
 * Tenant repository — public, pre-authentication tenant (laboratory) resolution.
 *
 * Uses the UNSCOPED base client on purpose: tenant resolution happens BEFORE any
 * user is authenticated (the login page needs to resolve `/foundation` -> the
 * Foundation organization to brand itself and to tell the backend which tenant
 * the credentials are being presented to). Only a minimal, non-sensitive
 * projection is ever returned to unauthenticated callers.
 */

/** The safe, public-facing shape of a tenant. Never expose internal columns here. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  acronym: true,
  status: true,
};

/**
 * Resolves an ACTIVE, non-deleted organization by its URL slug.
 * Returns null when no such active tenant exists (unknown/suspended/deleted).
 */
export async function findActiveBySlug(slug) {
  return prisma.organization.findFirst({
    where: { slug: slug.toLowerCase(), deletedAt: null },
    select: PUBLIC_SELECT,
  });
}

export default { findActiveBySlug, PUBLIC_SELECT };

/**
 * Role mapping + tenant-slug resolution.
 *
 * The backend speaks canonical role KEYS (SUPER_ADMIN, LAB_ADMIN, …); the
 * existing frontend dashboards are keyed off legacy role STRINGS (super_admin,
 * admin, lab_tech, …). This module is the single translation layer between them,
 * so the dashboards stay untouched.
 */

/** Backend role key → frontend role string used by the dashboards. */
export const BACKEND_TO_FRONTEND_ROLE = {
  SUPER_ADMIN: "super_admin",
  LAB_ADMIN: "admin",
  RECEPTIONIST: "receptionist",
  PHLEBOTOMIST: "phlebotomist",
  LAB_SCIENTIST: "lab_tech",
  RADIOGRAPHER: "radiographer",
};

// Higher scope wins when a user carries more than one role.
const SCOPE_RANK = { PLATFORM: 3, ORGANIZATION: 2, BRANCH: 1 };

/**
 * Derives the primary frontend role string from an authenticated user's roles.
 * Picks the highest-scoped role, then maps its key. Returns null if unmappable.
 */
export function primaryFrontendRole(user) {
  const roles = user?.roles ?? [];
  if (!roles.length) return null;
  const top = [...roles].sort(
    (a, b) => (SCOPE_RANK[b.scope] || 0) - (SCOPE_RANK[a.scope] || 0),
  )[0];
  return BACKEND_TO_FRONTEND_ROLE[top.key] ?? null;
}

/** True when the user is the platform Super Admin (no tenant). */
export function isPlatformUser(user) {
  return primaryFrontendRole(user) === "super_admin";
}

/** URL segments that are NOT tenant slugs (reserved by the app). */
export const RESERVED_SLUGS = new Set(["super-admin", "app"]);

/**
 * Resolves the active tenant slug from the current location.
 *
 * Path-based today (`/foundation`, `/medlab`) via the router param; also supports
 * subdomains (`foundation.lis.com`) for the future cutover — whichever is
 * present. Returns null for the platform / no-tenant context.
 */
export function resolveTenantSlug(paramSlug) {
  const sub = subdomainSlug();
  if (sub) return sub;
  if (paramSlug && !RESERVED_SLUGS.has(paramSlug)) return paramSlug;
  return null;
}

/**
 * Extracts a tenant slug from a production subdomain, ignoring localhost, bare
 * IPs, apex domains, and platform/preview hosts (www, app, vercel.app previews).
 */
function subdomainSlug() {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split(".");
  // Need at least sub.domain.tld to have a subdomain.
  if (parts.length < 3) return null;

  const first = parts[0];
  // vercel.app previews look like "project-hash.vercel.app" — 3 parts but the
  // first segment is the project, not a tenant. Treat *.vercel.app as no tenant.
  if (host.endsWith("vercel.app")) return null;
  if (["www", "app", "admin"].includes(first)) return null;

  return first.toLowerCase();
}

export default {
  BACKEND_TO_FRONTEND_ROLE,
  primaryFrontendRole,
  isPlatformUser,
  resolveTenantSlug,
  RESERVED_SLUGS,
};

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
 * The platform (Super Admin) apex domain, e.g. `labx.com.ng`. Configurable per
 * deployment via `VITE_PLATFORM_DOMAIN` (baked at build time); defaults to the
 * production apex. Every host check below is derived from this single value, so
 * the domain is never hard-coded in more than one place.
 */
export const PLATFORM_DOMAIN = (
  import.meta.env.VITE_PLATFORM_DOMAIN || "labx.com.ng"
)
  .trim()
  .toLowerCase();

// Subdomains that are the platform itself or infrastructure — never a tenant.
// Mirrors the backend's IGNORED_SUBDOMAINS so both ends agree.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api"]);

/** Current hostname, lower-cased; "" when there is no DOM (SSR/tests). */
function currentHost() {
  if (typeof window === "undefined") return "";
  return (window.location.hostname || "").toLowerCase();
}

/** True on the platform apex host itself (e.g. labx.com.ng) — the Super Admin surface. */
export function isPlatformHost() {
  return currentHost() === PLATFORM_DOMAIN;
}

/**
 * The tenant label from a platform subdomain (foundation.labx.com.ng →
 * "foundation"), or null when the host isn't a tenant-bearing platform
 * subdomain. Ignores the apex, reserved/infra subdomains, and multi-level labels.
 */
function platformSubdomainLabel() {
  const host = currentHost();
  if (!host || !host.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const label = host.slice(0, -(PLATFORM_DOMAIN.length + 1));
  if (!label || label.includes(".") || RESERVED_SUBDOMAINS.has(label)) {
    return null;
  }
  return label;
}

/**
 * True on a fully custom domain (foundationlab.com.ng) — a real host that is
 * neither localhost, a bare IP, a preview deploy, nor anything under the
 * platform domain. The tenant is resolved from the host by the backend.
 */
function isCustomDomainHost() {
  const host = currentHost();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }
  if (host === PLATFORM_DOMAIN || host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return false;
  }
  // Preview deploys (project-hash.vercel.app) are not tenants — fall back to
  // path-based routing there so previews stay usable.
  if (host === "vercel.app" || host.endsWith(".vercel.app")) return false;
  return true;
}

/** Public form of the custom-domain test (used by the host-redirect guard). */
export function isOnCustomDomain() {
  return isCustomDomainHost();
}

/**
 * The tenant slug carried by the CURRENT host, or null. Only platform subdomains
 * embed the slug in the host (foundation.labx.com.ng → "foundation"); custom
 * domains resolve server-side, so this returns null for them (and for the apex,
 * localhost, and path-based hosts). The redirect guard uses this to compare the
 * current host against the signed-in user's own tenant synchronously.
 */
export function currentHostTenantSlug() {
  return platformSubdomainLabel();
}

/**
 * Absolute URL of a tenant's canonical platform host (its subdomain), e.g.
 * tenantHostUrl("foundation") → "https://foundation.labx.com.ng/app". Used to
 * bounce a user to their assigned laboratory host across origins. Preserves the
 * current scheme/port so subdomain-based local dev (e.g. *.lvh.me:5173) works;
 * in production this yields a clean https URL with no port.
 */
export function tenantHostUrl(slug, path = "/app") {
  const host = `${slug}.${PLATFORM_DOMAIN}`;
  if (typeof window === "undefined") return `https://${host}${path}`;
  const scheme = window.location.protocol === "http:" ? "http:" : "https:";
  const portPart = window.location.port ? `:${window.location.port}` : "";
  return `${scheme}//${host}${portPart}${path}`;
}

/**
 * True when the tenant is carried by the HOST rather than a path segment —
 * either a platform subdomain (foundation.labx.com.ng) or a custom domain
 * (foundationlab.com.ng). In both cases the login lives at "/" and the
 * dashboards at "/app/*", and the backend resolves the tenant from the request
 * host (the api client sends it as the `X-Tenant-Host` hint).
 */
export function isHostTenant() {
  return platformSubdomainLabel() !== null || isCustomDomainHost();
}

/**
 * Back-compat alias. This historically meant "a fully custom domain"; host-based
 * routing now also covers platform subdomains, so it maps to `isHostTenant()`.
 */
export const isCustomTenantHost = isHostTenant;

/**
 * Resolves the active tenant slug from the current location: a platform
 * subdomain wins, otherwise the router path param (unless it is a reserved
 * segment). Returns null for the platform / no-tenant context. Custom domains
 * resolve server-side (the slug is not derivable from the host), so this
 * returns null for them.
 */
export function resolveTenantSlug(paramSlug) {
  const sub = platformSubdomainLabel();
  if (sub) return sub;
  if (paramSlug && !RESERVED_SLUGS.has(paramSlug)) return paramSlug;
  return null;
}

export default {
  BACKEND_TO_FRONTEND_ROLE,
  primaryFrontendRole,
  isPlatformUser,
  resolveTenantSlug,
  isHostTenant,
  isCustomTenantHost,
  isOnCustomDomain,
  currentHostTenantSlug,
  tenantHostUrl,
  isPlatformHost,
  PLATFORM_DOMAIN,
  RESERVED_SLUGS,
};

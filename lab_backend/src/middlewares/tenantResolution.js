import { config } from "../config/index.js";
import { prisma } from "../core/prisma.js";

const IGNORED_SUBDOMAINS = new Set(["www", "api", "app", "admin"]);

function normalizedHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

/** Resolves the public tenant before authentication without granting access. */
export async function resolveTenant(req, _res, next) {
  try {
    const requestHost = normalizedHost(req.hostname || req.headers.host);
    const hintedHost = normalizedHost(req.headers["x-tenant-host"]);
    const host = hintedHost || requestHost;
    const platformDomain = config.platformDomain;
    let tenant = null;

    if (host && host.endsWith(`.${platformDomain}`)) {
      const subdomain = host.slice(0, -(platformDomain.length + 1));
      if (subdomain && !subdomain.includes(".") && !IGNORED_SUBDOMAINS.has(subdomain)) {
        tenant = await prisma.organization.findFirst({
          where: { slug: subdomain, status: "ACTIVE", deletedAt: null },
          select: { id: true, name: true, slug: true, acronym: true, status: true },
        });
      }
    } else if (host && host !== platformDomain && host !== "localhost") {
      tenant = await prisma.organizationDomain
        .findFirst({
          where: {
            hostname: host,
            status: "ACTIVE",
            organization: { status: "ACTIVE", deletedAt: null },
          },
          select: {
            organization: {
              select: { id: true, name: true, slug: true, acronym: true, status: true },
            },
          },
        })
        .then((record) => record?.organization ?? null);
    }

    // A centralized API host cannot see the browser's custom domain. The
    // frontend supplies this routing hint; login still verifies organizationId.
    const hintedSlug = String(req.headers["x-tenant-slug"] || "")
      .trim()
      .toLowerCase();
    if (!tenant && /^[a-z0-9-]{2,60}$/.test(hintedSlug)) {
      tenant = await prisma.organization.findFirst({
        where: { slug: hintedSlug, status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true, slug: true, acronym: true, status: true },
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
}

export default resolveTenant;

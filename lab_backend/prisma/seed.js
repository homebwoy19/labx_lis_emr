/* eslint-disable no-console */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";
import { ALL_PERMISSIONS } from "../src/constants/permissions.js";

import {
  ROLES,
  ROLE_SCOPE,
  ROLE_METADATA,
  ROLE_PERMISSIONS,
} from "../src/constants/roles.js";

/**
 * Database seed.
 *
 * Idempotent — safe to run repeatedly. It provisions the minimum needed to
 * start using the platform; it does NOT seed demo staff, patients, orders, or a
 * test catalog — the Lab Admin creates those through the app.
 *   1. The full permission catalog.
 *   2. System role TEMPLATES (organizationId = null) with their grants.
 *   3. A platform Super Admin user.
 *   4. The Foundation laboratory (tenant): organization, head-office branch,
 *      org-scoped role clones, a GROWTH subscription, and ONLY its Lab Admin
 *      user, so `/foundation` login works and the Lab Admin can create the rest
 *      of the organisation's users themselves.
 *
 * Credentials come from the environment and are REQUIRED. There are NO default
 * or fallback credentials: if any of these is missing the seed fails fast,
 * before touching the database. Set them (e.g. in lab_backend/.env) first:
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SEED_PASSWORD
 * Secret values are never printed — only WHERE to log in is shown.
 */
const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const DEMO_PASSWORD = process.env.SEED_PASSWORD;

/**
 * Fail fast BEFORE any DB write if a seed credential is missing. No defaults,
 * no fallbacks — a missing/blank var is a hard error naming exactly what to set.
 */
function requireSeedCredentials() {
  const missing = [
    ["SUPER_ADMIN_EMAIL", SUPER_ADMIN_EMAIL],
    ["SUPER_ADMIN_PASSWORD", SUPER_ADMIN_PASSWORD],
    ["SEED_PASSWORD", DEMO_PASSWORD],
  ]
    .filter(([, value]) => !value || !String(value).trim())
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Seed aborted: missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them before seeding — no default credentials are provided.",
    );
  }
}

/**
 * The Foundation laboratory. Tenant identity (slug/acronym) lives in the DB and
 * is resolved at login time — never hard-coded in the app. Only the Lab Admin is
 * seeded; that admin creates the rest of the organisation's staff through the
 * app, so the real create/seat/role code path is exercised.
 */
const TENANTS = [
  {
    name: "Foundation Medical Diagnostic Lab",
    acronym: "FMDL",
    slug: "foundation",
    email: "info@foundationlab.com",
    domain: "foundationlab.com",
    branch: { name: "Ikeja Main Laboratory", code: "IKJ" },
    subscription: { plan: "GROWTH", billingCycle: "MONTHLY" },
    users: {
      [ROLES.LAB_ADMIN]: { local: "admin", firstName: "Judith", lastName: "Obiorah" },
    },
  },
];

async function main() {
  // Validate required credentials FIRST — before any destructive cleanup — so a
  // missing var can never leave the database half-wiped.
  requireSeedCredentials();

  console.log("Seeding database… Cleaning existing demo data…");

  // Clean demo data using valid Prisma model names
  // await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.sample.deleteMany({});
  await prisma.testOrderItem.deleteMany({});
  await prisma.testOrder.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.testCategory.deleteMany({});
  await prisma.letterhead.deleteMany({});
  await prisma.subscriptionHistory.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({ where: { organizationId: { not: null } } });
  await prisma.branch.deleteMany({});
  await prisma.organization.deleteMany({});

  const permByKey = await seedPermissions();
  await seedSystemRoles(permByKey);
  await seedSuperAdmin();

  for (const t of TENANTS) {
    await seedTenant(t, permByKey);
  }

  console.log("\nSeed complete. Environment initialized.\n");
  console.log("Super Admin: log in at /super-admin using the SUPER_ADMIN_EMAIL");
  console.log("and SUPER_ADMIN_PASSWORD you configured in the environment.");
  console.log("\nFoundation Lab Admin: log in at /foundation as");
  console.log("admin@foundationlab.com using your configured SEED_PASSWORD.");
  console.log("  (Credentials come from the environment and are never printed here.)");
  console.log("  (Create the rest of the organisation's users from the Users screen.)\n");
}

/** Upserts every permission from the catalog; returns a key -> record map. */
async function seedPermissions() {
  const map = new Map();
  for (const key of ALL_PERMISSIONS) {
    const [resource, ...rest] = key.split(":");
    const action = rest.join(":");
    const perm = await prisma.permission.upsert({
      where: { key },
      update: { resource, action },
      create: { key, resource, action },
    });
    map.set(key, perm);
  }
  console.log(`  ✓ ${map.size} permissions`);
  return map;
}

/** Creates system role templates (org = null) and grants their permissions. */
async function seedSystemRoles(permByKey) {
  for (const key of Object.values(ROLES)) {
    const role = await ensureRole({
      organizationId: null,
      key,
      scope: ROLE_SCOPE[key],
      isSystem: true,
    });
    await grantPermissions(role.id, ROLE_PERMISSIONS[key] || [], permByKey);
  }
  console.log(`  ✓ ${Object.keys(ROLES).length} system role templates`);
}

async function seedSuperAdmin() {
  const role = await prisma.role.findFirst({
    where: { organizationId: null, key: ROLES.SUPER_ADMIN },
  });
  await ensureUser({
    email: SUPER_ADMIN_EMAIL,
    firstName: "Home",
    lastName: "Bwoy",
    organizationId: null,
    branchId: null,
    roleId: role.id,
    password: SUPER_ADMIN_PASSWORD,
  });
  console.log("  ✓ Super Admin user");
}

/**
 * Provisions one laboratory tenant end-to-end: organization, head-office branch,
 * org-scoped role clones, one user per role, and a demo catalog. Idempotent.
 *
 * The Lab Admin is organization-wide (no branch); all other staff are scoped to
 * the head-office branch, mirroring how the app assigns them.
 */
async function seedTenant(tenant, permByKey) {
  // Organization
  const org = await ensureOrganization({
    name: tenant.name,
    acronym: tenant.acronym,
    slug: tenant.slug,
    email: tenant.email,
  });

  // Head-office branch
  const branch = await ensureBranch({
    organizationId: org.id,
    name: tenant.branch.name,
    code: tenant.branch.code,
    isHeadOffice: true,
  });

  // Org-scoped roles (clones of the templates for this tenant)
  const orgRoles = {};
  for (const key of [
    ROLES.LAB_ADMIN,
    ROLES.RECEPTIONIST,
    ROLES.PHLEBOTOMIST,
    ROLES.LAB_SCIENTIST,
    ROLES.RADIOGRAPHER,
  ]) {
    const role = await ensureRole({
      organizationId: org.id,
      key,
      scope: ROLE_SCOPE[key],
      isSystem: false,
    });
    await grantPermissions(role.id, ROLE_PERMISSIONS[key] || [], permByKey);
    orgRoles[key] = role;
  }

  // Seed ONLY the Lab Admin (org-wide, no branch). Every other staff member is
  // created by the Lab Admin through the app, so the real create/seat path runs.
  for (const [roleKey, u] of Object.entries(tenant.users)) {
    await ensureUser({
      email: `${u.local}@${tenant.domain}`,
      firstName: u.firstName,
      lastName: u.lastName,
      organizationId: org.id,
      branchId: roleKey === ROLES.LAB_ADMIN ? null : branch.id,
      roleId: orgRoles[roleKey].id,
      password: DEMO_PASSWORD,
    });
  }

  // Initial subscription
  if (tenant.subscription) {
    await ensureSubscription(org.id, tenant.subscription);
  }

  console.log(
    `  ✓ ${tenant.name}: organization, branch, subscription, roles, and Lab Admin`,
  );
}

async function ensureSubscription(organizationId, { plan, billingCycle }) {
  const existing = await prisma.subscription.findFirst({ where: { organizationId } });
  if (existing) return existing;

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === "ANNUAL") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const amounts = { BASIC: 30000, STARTER: 75000, GROWTH: 180000, ENTERPRISE: 420000 };
  const branchLimits = { BASIC: 1, STARTER: 2, GROWTH: 5, ENTERPRISE: 25 };
  const userLimits = { BASIC: 5, STARTER: 15, GROWTH: 50, ENTERPRISE: 250 };

  const sub = await prisma.subscription.create({
    data: {
      organizationId,
      plan,
      billingCycle,
      status: "ACTIVE",
      amount: amounts[plan] || 180000,
      currency: "NGN",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      maxBranches: branchLimits[plan] || 5,
      maxUsers: userLimits[plan] || 50,
      gracePeriodDays: 0,
    },
  });

  await prisma.subscriptionHistory.create({
    data: {
      subscriptionId: sub.id,
      organizationId,
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      amount: sub.amount,
      currency: sub.currency,
      maxBranches: sub.maxBranches,
      maxUsers: sub.maxUsers,
      periodStart: now,
      periodEnd: periodEnd,
      status: sub.status,
      note: "INITIAL_PROVISION",
    },
  });

  return sub;
}

// ── helpers ────────────────────────────────────────────────────────────────

async function ensureRole({ organizationId, key, scope, isSystem }) {
  const existing = await prisma.role.findFirst({ where: { organizationId, key } });
  if (existing) return existing;
  const meta = ROLE_METADATA[key];
  return prisma.role.create({
    data: {
      organizationId,
      key,
      name: meta.name,
      description: meta.description,
      scope,
      isSystem,
    },
  });
}

async function grantPermissions(roleId, keys, permByKey) {
  for (const key of keys) {
    const perm = permByKey.get(key);
    if (!perm) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: perm.id } },
      update: {},
      create: { roleId, permissionId: perm.id },
    });
  }
}

async function ensureUser({
  email,
  firstName,
  lastName,
  organizationId,
  branchId,
  roleId,
  password,
}) {
  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: existing.id, roleId } },
      update: {},
      create: { userId: existing.id, roleId },
    });
    return existing;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: lower,
      firstName,
      lastName,
      organizationId,
      branchId,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId } });
  return user;
}

async function ensureOrganization({ name, acronym, slug, email }) {
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.organization.create({
    data: { name, acronym, slug, email, status: "ACTIVE" },
  });
}

async function ensureBranch({ organizationId, name, code, isHeadOffice }) {
  const existing = await prisma.branch.findFirst({ where: { organizationId, code } });
  if (existing) return existing;
  return prisma.branch.create({
    data: {
      organizationId,
      name,
      code,
      isHeadOffice,
      status: "ACTIVE",
      approvedAt: new Date(),
    },
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

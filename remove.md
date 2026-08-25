# remove.md — Teardown & Reset Guide

> **This is a reference document. Nothing here runs automatically.**
> Every database step is written for **you** to run against your live Supabase
> database (SQL Editor or `psql`), and every code step is an edit you apply and
> redeploy yourself. Read a section fully before running any of it.
>
> **Before touching the database, take a backup.** In Supabase:
> _Project → Database → Backups_ (or run a `pg_dump`). These operations delete
> rows permanently and cannot be undone without a backup.

This guide has two independent parts:

- **[Part A](#part-a)** — Remove the **Lab Admin** role and everything that makes
  it up (role rows, its user accounts, its permission grants, and its code).
  _You said you want to keep Lab Admin for now — treat Part A as a future
  procedure, not something to run today._
- **[Part B](#part-b)** — Erase all **test data** so you can start fresh:
  delete every laboratory, branch, and their users, leaving **only the Super
  Admin** account. Roles, permissions, and plans are preserved.

---

<a name="part-a"></a>

## Part A — Remove the "Lab Admin" role completely

### A.0 — Understand what "Lab Admin" is made of

The Lab Admin isn't a single row. It exists across four layers:

| Layer | Where | What it is |
|-------|-------|-----------|
| **Role definition** | `lab_backend/src/constants/roles.js` | The `LAB_ADMIN` key, its scope, metadata, and its **permission list** |
| **Provisioning** | `lab_backend/src/features/organizations/orgProvisioning.js` + `prisma/seed.js` | Code that **creates a `LAB_ADMIN` role copy for every new lab** |
| **Database rows** | `roles`, `role_permissions`, `user_roles`, `users` | One system **template** (`"organizationId" IS NULL`) + one **copy per lab** (`"organizationId" = <lab>`), plus the admin **user accounts** assigned to them |
| **Frontend** | `lab_frontend/src/app/auth/roleMap.js` + `App.jsx` + `components/Admin.jsx` | Maps `LAB_ADMIN → "admin"` and renders the entire Lab Admin dashboard |

### A.1 — ⚠️ Critical consequence — read before you remove anything

The Lab Admin currently holds **all of a laboratory's management permissions**
(see `ROLE_PERMISSIONS[LAB_ADMIN]` in `roles.js`):

- `branch:create/read/update`, `user:create/read/update/delete`, `role:manage`
- `test:create/update/delete`, `settings:manage`, `letterhead:manage`, `audit:read`
- `result:approve`, `result:reject`, `result:release`

No other role has these. **If you remove Lab Admin without reassigning these
permissions, no one in a laboratory will be able to** create staff, build the
test catalog, approve/reject results, manage branches, or edit settings — the
lab becomes read-mostly and only the Super Admin can administer it.

**Before removing Lab Admin, decide who inherits its permissions**, e.g.:

- Create a replacement role (say `LAB_MANAGER`) with the same permission list, **or**
- Fold the needed permissions into an existing role (e.g. give `RECEPTIONIST`
  the management permissions), **or**
- Deliberately move all lab administration to the Super Admin.

Do that migration **first**, confirm the replacement works, and only then run the
removal below.

### A.2 — Backend code edits

**1. `lab_backend/src/constants/roles.js`** — delete every `LAB_ADMIN` entry:

- Remove `LAB_ADMIN: "LAB_ADMIN",` from `ROLES`.
- Remove the `[ROLES.LAB_ADMIN]: "ORGANIZATION",` line from `ROLE_SCOPE`.
- Remove `admin: ROLES.LAB_ADMIN,` from `FRONTEND_ROLE_MAP`.
- Remove the `[ROLES.LAB_ADMIN]: { … }` line from `ROLE_METADATA`.
- Remove the whole `[ROLES.LAB_ADMIN]: [ … ]` block from `ROLE_PERMISSIONS`
  (or move those permissions to the replacement role from A.1).

**2. `lab_backend/src/features/organizations/orgProvisioning.js`** — stop cloning
it into new labs:

- Remove `ROLES.LAB_ADMIN,` from the `ORG_ROLE_KEYS` array.

**3. `lab_backend/prisma/seed.js`** — stop seeding it:

- In `TENANTS`, remove the `[ROLES.LAB_ADMIN]: { local: "admin", … }` entry from
  the tenant's `users` (or replace it with your new admin role).
- In `seedTenant`, remove `ROLES.LAB_ADMIN,` from the org-scoped role clone loop.
- `seedSystemRoles` iterates `Object.values(ROLES)`, so removing it from `ROLES`
  (step 1) already drops the template — no extra edit needed there.

> There are **no hard-coded `if role === LAB_ADMIN` checks** anywhere in the
> backend — authorization is entirely permission-based (see the note at the top
> of `roles.js`). So once the permission grants move, no controller/route logic
> needs editing. Confirm with a search (A.5).

### A.3 — Frontend code edits

**1. `lab_frontend/src/app/auth/roleMap.js`**

- Remove `LAB_ADMIN: "admin",` from `BACKEND_TO_FRONTEND_ROLE`.

**2. `lab_frontend/src/app/App.jsx`** (the Lab Admin dashboard is the `"admin"` role)

- Remove the `import … from "./components/Admin";` block (around line 42).
- Remove the entire **`{role === "admin" && ( … )}`** dashboard route block
  (around lines 733–749).
- Remove the **"Admin Nav"** items block (around lines 599–601) and the admin
  branch of the screen-deriving switch (the `default: return "dashboard"` path
  around line 464 — repoint or drop as fits your replacement role).

**3. `lab_frontend/src/app/components/Admin.jsx`**

- Delete this file once nothing imports it (it _is_ the Lab Admin dashboard).

### A.4 — Database removal

Run in the Supabase SQL Editor **after** the code is deployed and after you've
migrated permissions (A.1). This removes the Lab Admin **users** and the
`LAB_ADMIN` **roles** (both the null-org template and every per-lab copy).
`role_permissions` and `user_roles` are removed automatically by cascade.

> **Column names must stay double-quoted.** Prisma maps _table_ names to
> snake_case (`user_roles`, `roles`) but leaves _column_ names camelCase
> (`"userId"`, `"roleId"`, `"organizationId"`). In raw Postgres SQL a
> camelCase identifier only matches when double-quoted — don't "correct" them
> to `user_id` etc. or the query will error with _column does not exist_.

```sql
BEGIN;

-- 1. Remove the user accounts that are Lab Admins.
--    (Deleting a user cascades their sessions, refresh tokens, user_roles,
--     and notifications.)
DELETE FROM users
WHERE id IN (
  SELECT ur."userId"
  FROM user_roles ur
  JOIN roles r ON r.id = ur."roleId"
  WHERE r.key = 'LAB_ADMIN'
);

-- 2. Remove every LAB_ADMIN role row (template + per-lab copies).
--    (Cascades role_permissions and any remaining user_roles.)
DELETE FROM roles WHERE key = 'LAB_ADMIN';

-- Verify: both queries should return 0.
SELECT count(*) AS lab_admin_roles FROM roles WHERE key = 'LAB_ADMIN';
SELECT count(*) AS orphaned_admin_links FROM user_roles ur
  LEFT JOIN roles r ON r.id = ur."roleId" WHERE r.id IS NULL;

COMMIT;   -- or ROLLBACK; if the counts look wrong
```

> **If you only want to remove a Lab Admin _user_ but keep the role**, skip step 2
> and instead reassign that user to another role (insert a `user_roles` row) or
> deactivate them from the Users screen in the app.

### A.5 — Verify nothing still references it

From the repo root, search for leftovers (should return only comments/docs):

```bash
grep -rniE "LAB_ADMIN|['\"]admin['\"]|lab.?admin" lab_backend/src lab_frontend/src
```

Then rebuild/redeploy both apps and re-run the seed if you use it
(`pnpm prisma db seed` in `lab_backend`).

---

<a name="part-b"></a>

## Part B — Erase test data (keep only the Super Admin)

**Goal:** delete **all laboratories (organizations), all branches, and all their
users** — the Foundation lab and any labs/branches you added while testing —
leaving **only your Super Admin account**. **Roles, permissions, and plans are
untouched.**

### B.1 — What is kept vs. deleted

| Kept ✅ | Deleted ❌ |
|--------|-----------|
| Super Admin user (`users` where `"organizationId" IS NULL`) | Every other user (`"organizationId" IS NOT NULL`) |
| **System roles** — `roles` where `"organizationId" IS NULL` (SUPER_ADMIN + the 5 templates) and their `role_permissions` | **Per-lab role copies** — `roles` where `"organizationId" IS NOT NULL` |
| All `permissions` | All organizations, branches |
| `system_configurations` (platform config) | All patients, tests, categories, orders, order items, samples, results, payments |
| The Super Admin's own sessions & platform notifications | All subscriptions + subscription history, letterheads, documents, org settings, org domains |
| **Plan catalog** (defined in code/config — see note) | Org-scoped notifications & audit logs |

**About "plans":** there is **no `plans` table** — the plan catalog (BASIC /
STARTER / GROWTH / ENTERPRISE prices and limits) lives in **code**, not the
database (e.g. `prisma/seed.js` and the subscriptions feature). Individual
`subscriptions` rows are per-lab and _are_ deleted with their labs; the catalog
itself is never touched by this wipe.

**About per-lab role copies:** each laboratory gets its own `LAB_ADMIN`,
`RECEPTIONIST`, etc. copies (`"organizationId" = <lab>`), created automatically
when the lab is onboarded. Deleting them here is required to remove the lab, and
they are **re-created automatically** the next time you onboard a lab — so your
system role templates and permissions remain the single source of truth.

### B.2 — Option 1: SQL (recommended — run in Supabase SQL Editor)

Ordered so foreign keys never block a delete. Wrapped in a transaction with a
verification step before you commit.

> **Column names must stay double-quoted.** Prisma maps _tables_ to snake_case
> but leaves _columns_ camelCase — write `"organizationId"` / `"userId"` /
> `"roleId"` exactly as shown; unquoted or snake_cased versions will error.

```sql
BEGIN;

-- ── Deeply nested tenant data (every row belongs to a lab — safe to clear all)
DELETE FROM results;
DELETE FROM samples;
DELETE FROM test_order_items;
DELETE FROM test_orders;
DELETE FROM payments;
DELETE FROM patients;
DELETE FROM tests;
DELETE FROM test_categories;
DELETE FROM letterheads;
DELETE FROM documents;
DELETE FROM subscription_history;
DELETE FROM subscriptions;
DELETE FROM organization_settings;
DELETE FROM organization_domains;

-- ── Org-scoped notifications & audit logs (keep the Super Admin's platform ones)
DELETE FROM notifications WHERE "organizationId" IS NOT NULL;
DELETE FROM audit_logs    WHERE "organizationId" IS NOT NULL;

-- ── Sessions / tokens belonging to organization (non-platform) users
DELETE FROM refresh_tokens      WHERE "userId" IN (SELECT id FROM users WHERE "organizationId" IS NOT NULL);
DELETE FROM sessions            WHERE "userId" IN (SELECT id FROM users WHERE "organizationId" IS NOT NULL);
DELETE FROM verification_tokens WHERE "userId" IN (SELECT id FROM users WHERE "organizationId" IS NOT NULL);
DELETE FROM user_roles          WHERE "userId" IN (SELECT id FROM users WHERE "organizationId" IS NOT NULL);

-- ── Organization users (the Super Admin has "organizationId" IS NULL and is kept)
DELETE FROM users WHERE "organizationId" IS NOT NULL;

-- ── Per-lab role COPIES (system templates have "organizationId" IS NULL — kept)
DELETE FROM role_permissions WHERE "roleId" IN (SELECT id FROM roles WHERE "organizationId" IS NOT NULL);
DELETE FROM roles            WHERE "organizationId" IS NOT NULL;

-- ── Finally the branches and the organizations themselves
DELETE FROM branches;
DELETE FROM organizations;

-- ── Verify BEFORE committing — expected: 1 user (you), 0 orgs, 0 branches,
--    0 org-scoped roles, and your system roles + permissions intact.
SELECT 'users (keep = your Super Admin)'      AS what, count(*) AS n FROM users
UNION ALL SELECT 'organizations (expect 0)',           count(*) FROM organizations
UNION ALL SELECT 'branches (expect 0)',                count(*) FROM branches
UNION ALL SELECT 'org-scoped roles (expect 0)',        count(*) FROM roles WHERE "organizationId" IS NOT NULL
UNION ALL SELECT 'system roles (kept)',                count(*) FROM roles WHERE "organizationId" IS NULL
UNION ALL SELECT 'permissions (kept)',                 count(*) FROM permissions;

COMMIT;   -- looks right? commit.  Otherwise: ROLLBACK;
```

If the verification row for `users` shows more than 1 and you expected exactly
one Super Admin, `ROLLBACK` and check whether you have more than one platform
user (`SELECT email FROM users WHERE "organizationId" IS NULL;`).

### B.3 — Option 2: Prisma script (run from `lab_backend`)

If you prefer Node over raw SQL, save this as
`lab_backend/prisma/reset-to-superadmin.mjs` and run
`node prisma/reset-to-superadmin.mjs`. It performs the same deletions, in the
same order, inside one transaction.

```js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const orgUsers = { organizationId: { not: null } };

async function main() {
  console.log("Resetting database to Super-Admin-only…");
  await prisma.$transaction([
    prisma.result.deleteMany({}),
    prisma.sample.deleteMany({}),
    prisma.testOrderItem.deleteMany({}),
    prisma.testOrder.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.patient.deleteMany({}),
    prisma.test.deleteMany({}),
    prisma.testCategory.deleteMany({}),
    prisma.letterhead.deleteMany({}),
    prisma.document.deleteMany({}),
    prisma.subscriptionHistory.deleteMany({}),
    prisma.subscription.deleteMany({}),
    prisma.organizationSetting.deleteMany({}),
    prisma.organizationDomain.deleteMany({}),
    prisma.notification.deleteMany({ where: { organizationId: { not: null } } }),
    prisma.auditLog.deleteMany({ where: { organizationId: { not: null } } }),
    // sessions / refresh tokens / user_roles / notifications for these users
    // cascade automatically when the users are deleted:
    prisma.user.deleteMany({ where: orgUsers }),
    prisma.role.deleteMany({ where: { organizationId: { not: null } } }),
    prisma.branch.deleteMany({}),
    prisma.organization.deleteMany({}),
  ]);

  const [users, orgs, orgRoles, sysRoles, perms] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.role.count({ where: { organizationId: { not: null } } }),
    prisma.role.count({ where: { organizationId: null } }),
    prisma.permission.count(),
  ]);
  console.log({ users, orgs, orgRoles, sysRoles, perms });
  console.log("Done. Expected: users=1, orgs=0, orgRoles=0, sysRoles/perms intact.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

> ⚠️ **Do not just re-run `pnpm prisma db seed`** expecting an empty slate — the
> seed **re-creates the Foundation lab and its Lab Admin**. If you want the seed
> to leave only the Super Admin, first empty the `TENANTS` array in
> `prisma/seed.js`; otherwise use the wipe above and create labs yourself
> through the app.

### B.4 — After the wipe

1. Log in as the Super Admin (`/super-admin`).
2. Onboard a fresh laboratory from the platform dashboard — this recreates that
   lab's organization, head-office branch, and its role copies automatically.
3. Each new lab is independent test data you can wipe again with Part B anytime.

# Foundation Lab — Laboratory Information System (LIS) Backend

A cloud-based, **multi-tenant Laboratory Information System** built to run as a real commercial product: secure, modular, and maintainable for the long haul. This document is the architectural reference for the engineering team.

> Stack: **Node.js (LTS) · Express · JavaScript (ES Modules) · PostgreSQL (Supabase) · Prisma · JWT (access + refresh rotation) · Argon2 · Zod · Redis · BullMQ · Swagger/OpenAPI · Jest/Supertest · Pino · Docker**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [Database Design](#3-database-design)
4. [Entity Relationship Diagram](#4-entity-relationship-diagram-erd)
5. [Feature Breakdown](#5-feature-breakdown)
6. [Authentication](#6-authentication)
7. [Authorization (RBAC + Permissions)](#7-authorization-rbac--permissions)
8. [Middleware Stack](#8-middleware-stack)
9. [Security](#9-security)
10. [File Upload & Storage](#10-file-upload--storage)
11. [Redis](#11-redis)
12. [Background Queues](#12-background-queues)
13. [API Structure](#13-api-structure)
14. [Coding Standards](#14-coding-standards)
15. [Roadmap](#15-roadmap)
16. [Folder Tree](#16-folder-tree)
17. [Folder Rationale](#17-folder-rationale)
18. [Service Responsibilities](#18-service-responsibilities)
19. [Request Lifecycle](#19-request-lifecycle)
20. [Scaling](#20-scaling)
- [Getting Started](#getting-started)

---

## 1. Architecture Overview

The backend follows **feature-based clean architecture**. Each feature is a self-contained vertical slice with a strict, one-directional dependency flow:

```
        HTTP
         │
   ┌─────▼──────┐   validates & shapes I/O, no business logic
   │ Controller │
   └─────┬──────┘
         │
   ┌─────▼──────┐   ALL business rules, orchestration, transactions
   │  Service   │
   └─────┬──────┘
         │
   ┌─────▼──────┐   data access only (Prisma), no business rules
   │ Repository │
   └─────┬──────┘
         │
   ┌─────▼──────┐   tenant-scoped Prisma client
   │  Database  │
   └────────────┘
```

**Guiding principles**

- **Separation of concerns** — controllers never contain business logic; repositories never contain business rules; services never touch `req`/`res`.
- **Multi-tenancy is enforced structurally**, not by convention. A Prisma client extension auto-injects `organizationId` / `branchId` filters, so a forgotten `where` clause cannot leak cross-tenant data (defense-in-depth).
- **Permission-based authorization** — the code never branches on role *names*. Roles are bags of permissions; middleware checks permissions. Adding a role is a data change, not a code change.
- **Fail-fast configuration** — the process refuses to boot with invalid env (Zod-validated at startup).
- **Consistent contracts** — every response is `{ success, message, data, meta }`; every error is `{ success: false, error: { code, message, details }, requestId }`.
- **Everything is auditable** — mutations write append-only audit records with actor, IP, and request id.

---

## 2. Folder Structure

```
src/
├── config/          Environment loading + Zod validation (single source of truth)
├── core/            Cross-cutting infrastructure (prisma, logger, errors, audit, mailer…)
├── constants/       Roles, permissions, audit actions (the RBAC catalog)
├── middlewares/     Express middleware (auth, authorize, tenantScope, validate, errors…)
├── utils/           Pure, reusable helpers (password, tokens, cookies, pagination, ids…)
├── features/        Vertical feature slices (auth, patients, …)
│   └── <feature>/
│       ├── <f>.routes.js       route table + OpenAPI annotations
│       ├── <f>.controller.js   HTTP adapter
│       ├── <f>.service.js      business logic
│       ├── <f>.repository.js   data access
│       └── <f>.schema.js       Zod request schemas
├── routes/          API version routers (v1) that mount feature routers
├── docs/            Swagger/OpenAPI assembly
├── app.js           Express app factory (middleware chain)
└── server.js        Bootstrap (DB connect, listen, graceful shutdown)
```

See [§16](#16-folder-tree) for the full tree and [§17](#17-folder-rationale) for why each folder exists.

---

## 3. Database Design

PostgreSQL via Prisma. The model is **fully normalized** and every tenant table carries the columns that make multi-tenancy, soft deletes, and auditing uniform.

**Conventions applied to every tenant table**

| Concern        | Columns |
|----------------|---------|
| Tenancy        | `organizationId`, `branchId` (where applicable) |
| Soft delete    | `deletedAt`, `deletedBy`, `status` |
| Audit trail    | `createdBy`, `updatedBy`, `createdAt`, `updatedAt` |
| Identity       | `id` (UUID v4) |

**Domain groups**

- **Platform / Tenancy** — `Organization`, `Branch` (branch creation requires Super Admin approval).
- **Identity / RBAC** — `User`, `Role`, `Permission`, `RolePermission`, `UserRole`.
- **Sessions / Tokens** — `Session` (device-bound), `RefreshToken` (hashed, rotation chain), `VerificationToken` (email verify / password reset).
- **Patients** — `Patient` (human-readable `patientCode`, unique per lab).
- **Test Catalog** — `TestCategory`, `Test` (price snapshot fields, structured `resultTemplate`).
- **Workflow** — `TestOrder`, `TestOrderItem`, `Sample`, `Result` (structured **or** uploaded PDF, with approval/release lifecycle).
- **Billing** — `Payment` (record-only today, gateway-ready fields reserved), `Subscription`.
- **Branding / Docs** — `Letterhead`, `Document` (Supabase Storage keys).
- **Config / Ops** — `OrganizationSetting`, `SystemConfiguration`, `Notification`, `AuditLog`.

**Sequential human IDs** — `patientCode` (`AGD-PID-0000001`) and `orderCode` (`ORD-2026-0001`) are allocated by an **atomic increment** of a counter on the `Organization` row *inside a transaction*, so concurrent registrations never collide. See [identifiers.js](src/utils/identifiers.js).

---

## 4. Entity Relationship Diagram (ERD)

```
Organization 1───* Branch
Organization 1───* User            Branch 1───* User
Organization 1───* Role            Role  *───* Permission   (via RolePermission)
User         *───* Role            (via UserRole)
User         1───* Session         Session 1───* RefreshToken
User         1───* RefreshToken    RefreshToken 1──1 RefreshToken (replacedBy: rotation chain)

Organization 1───* Patient         Branch 1───* Patient
Patient      1───* TestOrder
TestOrder    1───* TestOrderItem   TestOrderItem *──1 Test
TestOrder    1───* Sample
TestOrder    1───* Result          TestOrderItem 1──1 Result
Result       *──1 Document         (generated or uploaded PDF)
TestOrder    1───* Payment

Organization 1──1 Letterhead
Organization 1───* Document · Subscription · OrganizationSetting · Notification · AuditLog
TestCategory 1───* Test
```

The authoritative schema (indexes, enums, constraints) lives in [prisma/schema.prisma](prisma/schema.prisma).

---

## 5. Feature Breakdown

**Implemented**

- **Auth** ([src/features/auth](src/features/auth)) — login, refresh-token rotation with reuse detection, logout, device cap, account lockout, idle timeout, password reset, change password, `/me`.
- **Patients** ([src/features/patients](src/features/patients)) — the reference CRUD feature: tenant scoping, atomic patient-code allocation, pagination/search, soft delete, full audit. Use it as the template for every new feature.

**Planned (structure is ready — see [§15](#15-roadmap))**

Users & role management · Branches (+ Super Admin approval) · Test catalog · Orders · Samples (barcode/collection) · Results (structured entry, PDF generation, approval/release) · Payments · Letterhead/branding · Notifications · Platform (Super Admin) module.

Every new feature follows the same five-file pattern, so the shape is predictable and reviewable.

---

## 6. Authentication

**Tokens**

- **Access token** — short-lived JWT (`15m`), stateless, carries `{ userId, organizationId, branchId, sid }`. Sent in `Authorization: Bearer`.
- **Refresh token** — opaque 48-byte random string. Only a **SHA-256 hash** is stored; the raw value lives solely in an **HttpOnly, SameSite=Strict, Secure** cookie.

**Refresh rotation with reuse detection**

On each refresh the old token is revoked and linked (`replacedById`) to a freshly issued one. Presenting an **already-revoked** token signals theft/replay → the entire session's token chain and the session itself are revoked. See [auth.service.js](src/features/auth/auth.service.js).

**Session controls**

- **Device cap** — max active devices (default **2**); logging in on a new device beyond the cap evicts the least-recently-active session.
- **Idle timeout** — sessions inactive beyond the window (default **15m**) are killed on next refresh.
- **Lockout** — after N failed attempts (default **5**) the account is locked for a cooldown (default **15m**); successful login resets the counter.
- **Enumeration-safe** — unknown email and wrong password return the *same* generic error.

**Password policy** — min 10 chars with upper, lower, number, and special. Enforced by [passwordPolicy.js](src/utils/passwordPolicy.js) and applied at the API boundary via Zod.

**Password storage** — **Argon2id** (memory-hard), OWASP-tuned parameters. See [password.js](src/utils/password.js).

---

## 7. Authorization (RBAC + Permissions)

Two layers:

1. **RBAC** — users have roles; roles have permissions. Roles are seeded from [constants/roles.js](src/constants/roles.js); the permission catalog is [constants/permissions.js](src/constants/permissions.js).
2. **Tenant scope** — a Super Admin (PLATFORM) sees everything; a Lab Admin (ORGANIZATION) sees all branches in their lab; operational staff (BRANCH) see one branch. Enforced by the Prisma extension in [core/tenantClient.js](src/core/tenantClient.js).

**The rule:** middleware and controllers check **permissions**, never role names.

```js
router.post("/patients",
  authenticate,                 // who are you? (loads user, roles, permissions)
  tenantScope,                  // attaches req.db (scoped Prisma client)
  authorize(P.PATIENT_CREATE),  // may you? (permission check)
  validate(schema.create),      // is the input well-formed?
  controller.create);
```

Adding a role or capability is a **data + catalog** change (edit constants, reseed) — no scattered `if (role === "ADMIN")` branches anywhere.

---

## 8. Middleware Stack

| Middleware | Responsibility |
|---|---|
| [requestContext](src/middlewares/requestContext.js) | Assigns `req.id`, captures IP/UA for logs + audit, echoes `X-Request-Id`. |
| [authenticate](src/middlewares/authenticate.js) | Verifies the access token, loads the user, hydrates `req.auth` (roles, permissions, tenant, `sessionId`). |
| [authorize](src/middlewares/authorize.js) | Permission guard (`authorize(...perms)`); Super Admin bypasses. |
| [tenantScope](src/middlewares/tenantScope.js) | Attaches the tenant-scoped Prisma client as `req.db`. |
| [validate](src/middlewares/validate.js) | Zod validation of `body`/`query`/`params`; replaces raw input with parsed values. |
| [rateLimit](src/middlewares/rateLimit.js) | Global `apiLimiter` + stricter `authLimiter` for auth endpoints. |
| [notFound](src/middlewares/notFound.js) | Terminal 404 for unmatched routes. |
| [errorHandler](src/middlewares/errorHandler.js) | Central error → envelope mapper (ApiError, ZodError, Prisma errors); never leaks stack traces in prod. |

---

## 9. Security

- **Transport/headers** — `helmet`, CORS locked to configured origins with credentials, HTTPS-only cookies in prod.
- **Auth** — Argon2id hashing, short-lived JWTs, hashed rotating refresh tokens, reuse detection, device cap, lockout, idle timeout.
- **Input** — Zod validation on every endpoint; `hpp` against parameter pollution; hard body-size cap.
- **Isolation** — application-layer tenant filtering on every tenant model (defense-in-depth).
- **Abuse** — global + auth-specific rate limiting.
- **Secrets & logs** — Pino redacts `authorization`, `cookie`, `password`, `token` fields; stack traces are never returned in production.
- **Least privilege** — permission-based access; Super Admin scope is explicit and audited.
- **Traceability** — every mutation is audited with actor, entity, before/after, IP, UA, and request id.

---

## 10. File Upload & Storage

- **Store:** Supabase Storage (S3-compatible). Files are referenced by the `Document` table (`storageKey`, `mimeType`, `sizeBytes`, `checksum`); the DB never holds binaries.
- **Result PDFs:** generated from branded HTML via **Puppeteer** (headless Chromium), or uploaded directly for scanned/external results (`ResultType.UPLOADED`).
- **Branding:** `Letterhead` links logo/letterhead/signature documents so generated reports carry per-lab branding.
- **Limits:** upload size capped via `MAX_UPLOAD_SIZE_MB`; the container ships Chromium so PDF rendering works out of the box (see [Dockerfile](Dockerfile)).

---

## 11. Redis

Configured via `REDIS_URL` (`ioredis`). Roles:

- **Cache** — hot reference data (test catalog, permission sets) to cut DB load.
- **Queue backend** — durable job store for BullMQ ([§12](#12-background-queues)).
- **Ephemeral counters** — a natural home for distributed rate-limit and lockout state as the fleet scales beyond one node.

---

## 12. Background Queues

**BullMQ** (Redis-backed) offloads slow/retriable work from the request path:

- **PDF generation** — render result reports asynchronously.
- **Email** — verification, password reset, result-ready notifications.
- **Notifications** — in-app/SMS fan-out.
- **Housekeeping** — prune expired tokens/sessions, scheduled reports.

Jobs are retriable with backoff; failures are logged and inspectable. Workers run as separate processes so they scale independently of the API.

---

## 13. API Structure

- **Versioned** under `API_PREFIX` (default `/api/v1`); adding `v2` is a new router, leaving `v1` untouched.
- **Consistent envelopes** — success `{ success, message, data, meta }`; error `{ success:false, error:{ code, message, details }, requestId }`.
- **Pagination** — list endpoints accept `page`, `limit`, `search`, `sortBy`, `sortOrder`; responses carry `meta.pagination`.
- **Self-documenting** — OpenAPI assembled from route JSDoc, served at `/api/v1/docs` (JSON at `/api/v1/docs.json`).
- **Health** — `/api/v1/health` for probes.

Current endpoints:

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password
GET    /api/v1/auth/me
GET    /api/v1/patients
POST   /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id
DELETE /api/v1/patients/:id
```

---

## 14. Coding Standards

- **ES Modules** throughout; Node ≥ 20.
- **ESLint + Prettier** enforced (`pnpm lint`, `pnpm format`).
- **Layer discipline** — controllers thin, services own logic, repositories own data access.
- **No secrets in code** — everything via validated env.
- **Errors** — throw `ApiError` for expected conditions; unexpected errors are caught centrally and logged, never leaked.
- **Async safety** — all async handlers wrapped by `asyncHandler` so rejections reach the error middleware.
- **Tests** — Jest + Supertest; pure logic is unit-tested (`*.test.js`).
- **Naming** — features use `<feature>.<layer>.js`; permissions are `resource:action`.

---

## 15. Roadmap

**Phase 1 — Foundation (done)**
Config, schema, core infra, RBAC catalog, middleware stack, **Auth**, **Patients** reference feature, Swagger, Docker, CI, seed.

**Phase 2 — Core LIS workflow**
Users & role management · Branches + Super Admin approval · Test catalog · Orders · Samples (barcode/collection) · Results (structured entry + PDF + approval/release) · Payments.

**Phase 3 — Platform & operations**
Super Admin **frontend** (a dedicated frontend *is* required — this backend exposes a `/platform` module for it) · Subscriptions/billing · Letterhead management · Notifications · BullMQ workers · Redis caching.

**Phase 4 — Scale & compliance**
Payment gateway integration (interface reserved) · Analytics/reporting · Observability (metrics/tracing) · Data retention & compliance hardening.

---

## 16. Folder Tree

```
lab_backend/
├── prisma/
│   ├── schema.prisma           Full data model
│   └── seed.js                 Idempotent seed (permissions, roles, super admin, demo tenant)
├── src/
│   ├── app.js                  Express app factory (middleware chain)
│   ├── server.js               Bootstrap + graceful shutdown
│   ├── config/
│   │   └── index.js            Zod-validated env → config object
│   ├── constants/
│   │   ├── auditActions.js
│   │   ├── permissions.js      Permission catalog (resource:action)
│   │   └── roles.js            Roles, scopes, per-role permission grants
│   ├── core/
│   │   ├── ApiError.js         Operational error + factories
│   │   ├── ApiResponse.js      Success envelope + pagination meta
│   │   ├── asyncHandler.js     Async route wrapper
│   │   ├── audit.js            Append-only audit writer
│   │   ├── logger.js           Pino (redaction, pretty in dev)
│   │   ├── mailer.js           Nodemailer (log-stub fallback)
│   │   ├── prisma.js           Base (unscoped) client + connect/disconnect
│   │   └── tenantClient.js     forTenant() scoped-client extension
│   ├── docs/
│   │   └── swagger.js          OpenAPI assembly
│   ├── middlewares/
│   │   ├── authenticate.js authorize.js tenantScope.js
│   │   ├── validate.js rateLimit.js requestContext.js
│   │   ├── errorHandler.js notFound.js index.js
│   ├── features/
│   │   ├── auth/               controller · service · repository · routes · schema
│   │   └── patients/           controller · service · repository · routes · schema
│   ├── routes/
│   │   └── v1.js               Mounts feature routers + health
│   └── utils/
│       ├── password.js tokens.js cookies.js pagination.js
│       ├── identifiers.js duration.js passwordPolicy.js
│       └── *.test.js
├── tests/
│   └── setup.js                Test env bootstrap
├── .github/workflows/ci.yml    (repo root) Lint · Test · Docker build
├── Dockerfile · docker-compose.yml · .dockerignore
├── eslint.config.js · .prettierrc.json
├── .env.example
└── package.json
```

---

## 17. Folder Rationale

| Folder | Why it exists |
|---|---|
| `config/` | One validated place for all environment input. Fail-fast on boot; nothing else reads `process.env`. |
| `core/` | Cross-cutting infrastructure shared by every feature (DB, logging, errors, audit, mail). Keeps features free of plumbing. |
| `constants/` | The RBAC source of truth. Centralizing roles/permissions is what lets us avoid role-name branching. |
| `middlewares/` | Reusable request-pipeline concerns, composable per route. |
| `utils/` | Pure, dependency-light helpers — trivially unit-testable. |
| `features/` | Vertical slices. Everything about a domain lives together, so features are added/removed/reviewed in isolation. |
| `routes/` | API versioning boundary; mounts features without them knowing about each other. |
| `docs/` | Keeps OpenAPI assembly out of app wiring. |
| `prisma/` | Schema + seed: the database's single source of truth. |
| `tests/` | Shared test bootstrap; unit tests live beside the code they cover. |

---

## 18. Service Responsibilities

| Layer | Does | Does **not** |
|---|---|---|
| **Controller** | Read validated input + context, call a service, shape the HTTP response (status, cookies, envelope). | Contain business rules or touch the DB. |
| **Service** | All business logic: orchestration, transactions, invariants, audit, cross-entity coordination. | Touch `req`/`res` or format HTTP. |
| **Repository** | Data access via the scoped Prisma client; query composition. | Contain business rules or authorization. |
| **Schema (Zod)** | Define and coerce the trusted shape of input; reject bad requests early. | Contain business logic. |
| **Routes** | Declare the endpoint table + middleware chain + OpenAPI docs. | Contain logic. |

Cross-cutting services in `core/` — `audit.writeAudit()`, `mailer.sendMail()`, `logger`, `ApiError`, `tenantClient.forTenant()` — are shared by all features.

---

## 19. Request Lifecycle

Example: `POST /api/v1/patients`

```
1.  helmet / cors / body-parser / cookie-parser / compression / hpp   (app-level)
2.  requestContext   → req.id, req.context {ip, ua, requestId}
3.  pino-http        → structured request log
4.  apiLimiter       → global rate limit
5.  authenticate     → verify JWT, load user, build req.auth {roles, permissions, tenant, sessionId}
6.  tenantScope      → req.db = forTenant(req.auth)   (auto-scoped Prisma client)
7.  authorize(P.PATIENT_CREATE)  → permission check (Super Admin bypasses)
8.  validate(createPatientSchema)→ parse/replace req.body
9.  controller.create → calls patientService.createPatient(req.db, req.body, req.auth, req.context)
10. service          → tx: allocate patientCode + create patient; writeAudit(PATIENT_CREATE)
11. repository       → scoped Prisma writes (organizationId/branchId stamped)
12. controller       → sendSuccess(201, { patient })   → { success, message, data }
     └─ on throw → errorHandler → { success:false, error:{code,message}, requestId }
```

Every state-changing request thus passes identity → tenant isolation → permission → validation → logic → audit, in that order.

---

## 20. Scaling

**Stateless API, horizontal scale.** Access tokens are stateless and session/refresh state lives in Postgres + Redis, so API instances are interchangeable behind a load balancer — add nodes to add capacity. `trust proxy` is set for correct client IPs and secure cookies behind a proxy/CDN.

**Database.** Runtime uses Supabase's **pooled (pgBouncer)** connection string with a low per-instance `connection_limit`; migrations use the **direct** URL. Heavy read paths cache in Redis. The schema is indexed on tenant keys and common filters.

**Work offloading.** Slow/retriable work (PDFs, email, notifications) runs in **BullMQ workers** as separate processes that scale independently of the API — a spike in report generation never degrades request latency.

**Tenant isolation at scale.** Application-layer scoping keeps tenants separated on shared infrastructure today; the model leaves room to graduate large tenants to dedicated schemas/databases without changing feature code (only the client-resolution layer).

**Operability.** Structured JSON logs with request ids (aggregation-ready), health endpoint for orchestrator probes, graceful shutdown for zero-drop deploys, and a container image that runs anywhere (Render/Railway/K8s).

---

## Getting Started

**Prerequisites:** Node ≥ 20, **pnpm**, and either Docker or a local Postgres + Redis.

```bash
cd lab_backend
pnpm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, etc.

pnpm prisma generate        # generate the typed client
pnpm prisma migrate dev     # create the schema (needs a reachable DB)
pnpm db:seed                # permissions, roles, super admin, demo tenant

pnpm dev                    # http://localhost:4000  (docs at /api/v1/docs)
```

**Or the whole stack with Docker:**

```bash
docker compose up --build
docker compose exec api pnpm prisma migrate deploy
docker compose exec api pnpm db:seed
```

**Quality gates**

```bash
pnpm lint        # ESLint
pnpm test        # Jest unit tests
pnpm format      # Prettier
```

**Seeded demo accounts** (password `ChangeMe@12345`, super admin `SuperAdmin@12345`):

| Role | Email |
|---|---|
| Super Admin | `superadmin@foundationlab.com` |
| Lab Admin | `judith.obiorah@agudalab.com` |
| Receptionist | `grace.anyaoba@agudalab.com` |

> Change all seeded credentials before any non-local deployment.

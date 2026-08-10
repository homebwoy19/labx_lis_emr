# Foundation Lab LIS — Comprehensive Project Guide

Comprehensive technical reference manual for developers, maintainers, and system administrators working on the **Foundation Lab Laboratory Information System (LIS)**.

---

## 1. High-Level Architecture & Overview

Foundation Lab LIS is a cloud-based, multi-tenant Laboratory Information System designed for diagnostic centers and medical testing facilities.

```
                  ┌─────────────────────────────────────────┐
                  │          React Single-Page App          │
                  │   (Vite + React Router + Tailwind CSS)  │
                  └────────────────────┬────────────────────┘
                                       │ HTTPS / JSON REST
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Express.js API Node           │
                  │ (tenantScope + subscriptionGuard + RBAC)│
                  └──────┬─────────────┬─────────────┬──────┘
                         │             │             │
                         ▼             ▼             ▼
               ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
               │  Supabase    │ │ Redis Cache │ │  Supabase    │
               │ PostgreSQL DB│ │  & BullMQ   │ │ Storage S3   │
               └──────────────┘ └─────────────┘ └──────────────┘
```

### Core Architecture Principles
- **Multi-Tenancy**: Complete logical isolation per laboratory organization via Prisma Client Extensions (`lab_backend/src/core/tenantClient.js`).
- **Role-Based Access Control (RBAC)**: Fine-grained permission grants attached to custom tenant-scoped roles (`lab_backend/src/constants/permissions.js`).
- **Subscription Lifecycle Management**: Built-in tiered pricing, branch & user seat limits, grace periods, and expiration scanning (`lab_backend/src/features/subscriptions/`).
- **Single-Path Authentication**: Uniform JWT-based authentication using HttpOnly refresh cookies and short-lived access tokens (`lab_backend/src/features/auth/`).

---

## 2. Multi-Tenancy Architecture

### Structural Isolation Model
Data is isolated at the database level using `organizationId` (for organization-wide data) and `branchId` (for branch-specific operational data).

#### `TENANT_MODELS` Mapping
The following database models enforce tenant boundary scoping:
- `Branch`, `Role`, `TestCategory`, `Test`, `Document`, `OrganizationSetting`, `Notification`, `AuditLog`, `Subscription`, `SubscriptionHistory` (Scoped by `organizationId`)
- `User`, `Patient`, `TestOrder`, `Sample`, `Result`, `Payment` (Scoped by `organizationId` AND `branchId`)

### Prisma Extension Scoping (`tenantClient.js`)
When a request passes through `tenantScope` middleware, a tenant-aware Prisma client is attached to `req.db`.

```js
// How scoping works inside forTenant(context):
// 1. Super Admin (isSuperAdmin = true) -> Returns base unscoped client.
// 2. Lab Admin (isOrgAdmin = true) -> Injects { where: { organizationId } }.
// 3. Staff Member (non-admin) -> Injects { where: { organizationId, branchId } }.
// 4. Writes automatically stamp organizationId and branchId on created rows.
```

---

## 3. Subscription Management & Pricing Rules

Subscriptions control tenant access and operational boundaries.

### Catalog Plans
- **Basic**: ₦30,000 / month · Limit: 1 Branch · 5 Users
- **Starter**: ₦75,000 / month · Limit: 2 Branches · 15 Users
- **Growth**: ₦180,000 / month · Limit: 5 Branches · 50 Users
- **Enterprise**: ₦420,000 / month (or custom manual price) · Limit: 25 Branches · 250 Users (or custom limits)

### Status Matrix & Access Control
- `ACTIVE`: Normal operational state. All features accessible.
- `EXPIRING_SOON`: Within notice threshold. Access granted, banner shown.
- `PAST_DUE`: Current period end passed, but within `gracePeriodDays`. Access granted, warnings shown.
- `EXPIRED`: Grace period lapsed or canceled. `isAccessBlocked = true`. Backend middleware returns `402 SUBSCRIPTION_INACTIVE`.
- `CANCELLED`: Subscription deactivated by Super Admin. `isAccessBlocked = true`.

### Limit Enforcement Guards
Backend limits are enforced before writes:
- `assertWithinBranchLimit(db, organizationId)`: Checked before `requestBranch`.
- `assertWithinUserLimit(db, organizationId)`: Checked before `createUser`.

---

## 4. Authentication & Authorization Workflow

### Session Lifecycle
1. User logs in via POST `/api/v1/auth/login` (supplying `email`, `password`, and optional tenant `slug`).
2. Server validates credentials against Argon2 hash, issues an HttpOnly refresh cookie (7-day TTL), and returns a short-lived JWT access token (15-minute TTL).
3. Client stores access token in memory and mirrors to `localStorage`.
4. Subsequent API requests attach `Authorization: Bearer <token>`.
5. When access token expires, `api.js` client intercepts the `401` status, calls `POST /api/v1/auth/refresh` using the HttpOnly cookie, receives a new access token, and retries the original request seamlessly.

---

## 5. Background Jobs & Notification Scheduler

### Background Job Driver (`scheduler.js`)
- Supports `BullMQ` (Redis-backed) for production and `setInterval` for development.
- Configured via `SCHEDULER_DRIVER=auto` (tries BullMQ, falls back to interval).

### Expiration Scanning & Deduplication
- Scans active subscriptions at interval `SUBSCRIPTION_SCAN_INTERVAL_MINUTES` (default 60m).
- 1 Day before expiration (Monthly) or 7 Days before expiration (Annual): Sends notification to all `LAB_ADMIN` users for that lab.
- 12 Hours before expiration: Sends notification to all Super Admin (`PLATFORM` scope) users.
- **Deduplication**: Notifications carry a `dedupeKey` (e.g. `sub_monthly_1d_<subId>_<periodEnd>_<userId>`). Unique constraint on database table ensures duplicate scans skip without creating extra notifications.

---

## 6. Live Dashboard API & Data Pipeline

The backend exposes a unified `GET /api/v1/dashboard` endpoint that returns role-appropriate live metrics:

- **Super Admin (`isSuperAdmin`)**: Returns platform-wide stats (total labs, active/suspended orgs, total branches, users, patients, pending branch requests, monthly MRR growth chart data).
- **Lab Admin (`isOrgAdmin`)**: Returns lab-wide stats (total revenue, today's revenue, patient count, test completion counts, monthly revenue per branch, test category pie breakdown, daily test bar chart, recent activity log).
- **Employee (Branch User)**: Returns branch-scoped stats (filtered automatically by `tenantClient`).

---

## 7. Frontend Integration Strategy

The React frontend (`lab_frontend/src/app`) connects to the backend through a single API client (`lab_frontend/src/app/lib/api.js`).

- **No hardcoded static mock data**: Frontend dashboards consume live API endpoints via React `useEffect` + `useState`.
- **Branding Resolution**: Laboratory logins resolve the tenant by slug via `api.resolveTenant(slug)` to load real laboratory branding dynamically.
- **Header Notification Bell**: Polls `api.notificationUnreadCount()` every 30 seconds and shows unread badge. Opening bell modal fetches notification list and allows marking all as read.

---

## 8. Directory & Project Structure

```
Foundation_Lab/
├── docs/
│   ├── ENVIRONMENT_AND_SETUP.md
│   └── PROJECT_GUIDE.md
├── lab_backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/             # Zod environment schema
│   │   ├── constants/          # Roles, permissions, audit actions
│   │   ├── core/               # Prisma, tenantClient, scheduler, mailer, audit
│   │   ├── features/
│   │   │   ├── auth/           # Auth controllers & routes
│   │   │   ├── branches/       # Branch request & approval workflow
│   │   │   ├── dashboard/      # Role-based dashboard aggregations
│   │   │   ├── notifications/  # Notification CRUD & deduplication
│   │   │   ├── organizations/  # Lab onboarding & lifecycle
│   │   │   ├── patients/       # Patient records & patient code seq
│   │   │   ├── subscriptions/  # Subscriptions, plans, limits, math
│   │   │   └── users/          # User management & role assignment
│   │   ├── middlewares/        # authenticate, tenantScope, subscriptionGuard
│   │   ├── routes/             # v1 router registration
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
└── lab_frontend/
    ├── src/
    │   ├── app/
    │   │   ├── auth/           # AuthContext & role mapping
    │   │   ├── components/     # SuperAdmin, Admin, Receptionist, UIComponents
    │   │   ├── lib/            # api.js API client
    │   │   └── App.jsx         # App shell & router
    └── package.json
```

---

## 9. Developer Verification Workflow

```bash
# Backend unit tests
cd lab_backend
npm run test

# Linter checks
npm run lint

# DB Migration & Seed test
npm run prisma:generate
npm run db:seed
```

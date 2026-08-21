# Environment and Setup Guide

Comprehensive documentation for all environment variables, external services, deployment prerequisites, and production readiness checklists for the **Foundation Lab Laboratory Information System (LIS)**.

---

## 1. Complete Environment Variable Catalog prisma:generate, db:seed

This section documents **every single environment variable** recognized by the backend application schema (`lab_backend/src/config/index.js`).

### Application Core

| Variable Name  | Purpose                                       | Source / Value Type                     | Req / Opt        | Secret? | Example Format                                     | Fail-safe Behavior / Impact if Missing                                                    |
| :------------- | :-------------------------------------------- | :-------------------------------------- | :--------------- | :------ | :------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `NODE_ENV`     | Application runtime environment               | `development` \| `production` \| `test` | Optional         | No      | `development`                                      | Defaults to `development`. Controls log formatting and Prisma dev mode.                   |
| `PORT`         | HTTP server listening port                    | Integer                                 | Optional         | No      | `4000`                                             | Defaults to `4000`.                                                                       |
| `API_PREFIX`   | Base prefix for all v1 REST routes            | String                                  | Optional         | No      | `/api/v1`                                          | Defaults to `/api/v1`.                                                                    |
| `APP_NAME`     | Display name for server logs & system headers | String                                  | Optional         | No      | `"Foundation Lab LIS"`                             | Defaults to `"Foundation Lab LIS"`.                                                       |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins      | String list                             | Required in Prod | No      | `http://localhost:5173,https://lab.yourdomain.com` | Defaults to `http://localhost:5173`. Cross-origin browser requests fail if misconfigured. |

---

### Database (Supabase PostgreSQL)

| Variable Name  | Purpose                                                            | Source / Value Type | Req / Opt    | Secret? | Example Format                                                | Fail-safe Behavior / Impact if Missing                                   |
| :------------- | :----------------------------------------------------------------- | :------------------ | :----------- | :------ | :------------------------------------------------------------ | :----------------------------------------------------------------------- |
| `DATABASE_URL` | Pooled connection string (pgBouncer port 6543) for runtime queries | PostgreSQL URI      | **Required** | **YES** | `postgresql://postgres:pwd@host:6543/postgres?pgbouncer=true` | Server boot throws Zod validation error; process terminates immediately. |
| `DIRECT_URL`   | Direct connection string (port 5432) for Prisma migrations         | PostgreSQL URI      | **Required** | **YES** | `postgresql://postgres:pwd@host:5432/postgres`                | Prisma migration commands fail (`npx prisma migrate`).                   |

---

### Authentication & Session Management

| Variable Name              | Purpose                                               | Source / Value Type         | Req / Opt    | Secret? | Example Format                                    | Fail-safe Behavior / Impact if Missing                                                           |
| :------------------------- | :---------------------------------------------------- | :-------------------------- | :----------- | :------ | :------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`        | Secret key used to sign access tokens (min 32 chars)  | Random String               | **Required** | **YES** | `super_long_random_string_at_least_32_chars_long` | Server boot throws Zod error; process terminates.                                                |
| `JWT_REFRESH_SECRET`       | Secret key used to sign refresh tokens (min 32 chars) | Random String               | **Required** | **YES** | `another_long_random_string_min_32_characters`    | Server boot throws Zod error; process terminates.                                                |
| `JWT_ACCESS_TTL`           | Access token lifespan                                 | Duration string             | Optional     | No      | `15m`                                             | Defaults to `15m`.                                                                               |
| `JWT_REFRESH_TTL`          | Refresh token lifespan                                | Duration string             | Optional     | No      | `7d`                                              | Defaults to `7d`.                                                                                |
| `SESSION_IDLE_TIMEOUT_MIN` | Inactivity session timeout                            | Integer (minutes)           | Optional     | No      | `15`                                              | Defaults to `15`.                                                                                |
| `MAX_ACTIVE_DEVICES`       | Maximum concurrent logged-in devices per user         | Integer                     | Optional     | No      | `2`                                               | Defaults to `2`. Older sessions are invalidated.                                                 |
| `MAX_LOGIN_ATTEMPTS`       | Failed login attempt threshold before lockout         | Integer                     | Optional     | No      | `5`                                               | Defaults to `5`.                                                                                 |
| `LOCKOUT_DURATION_MIN`     | Lockout duration following failed attempts            | Integer (minutes)           | Optional     | No      | `15`                                              | Defaults to `15`.                                                                                |
| `COOKIE_DOMAIN`            | Domain for the refresh cookie                         | Domain string               | Optional     | No      | `localhost`                                       | Defaults to `localhost`. Set to `.yourdomain.com` for cross-subdomain sharing.                   |
| `COOKIE_SECURE`            | HTTPS-only cookie flag                                | Boolean                     | Optional     | No      | `false`                                           | Defaults to `false` in dev, `true` in prod. Set `true` in HTTPS environments.                    |
| `COOKIE_SAMESITE`          | Cookie SameSite policy                                | `strict` \| `lax` \| `none` | Optional     | No      | `strict`                                          | Defaults to `strict`. Set to `none` if frontend and backend are hosted on separate root domains. |

---

### Redis (Caching & Job Scheduler)

| Variable Name | Purpose                                  | Source / Value Type | Req / Opt | Secret? | Example Format           | Fail-safe Behavior / Impact if Missing                                                                   |
| :------------ | :--------------------------------------- | :------------------ | :-------- | :------ | :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `REDIS_URL`   | Connection URL for Redis / Upstash Redis | Redis URI           | Optional  | **YES** | `redis://localhost:6379` | Defaults to `redis://localhost:6379`. If unavailable, scheduler falls back to in-memory interval driver. |

---

### Background Scheduler

| Variable Name                        | Purpose                                    | Source / Value Type              | Req / Opt | Secret? | Example Format | Fail-safe Behavior / Impact if Missing                                  |
| :----------------------------------- | :----------------------------------------- | :------------------------------- | :-------- | :------ | :------------- | :---------------------------------------------------------------------- |
| `SCHEDULER_ENABLED`                  | Toggle background subscription scanner     | Boolean                          | Optional  | No      | `true`         | Defaults to `true`.                                                     |
| `SCHEDULER_DRIVER`                   | Queue driver implementation                | `auto` \| `bullmq` \| `interval` | Optional  | No      | `auto`         | Defaults to `auto` (attempts BullMQ via Redis, falls back to interval). |
| `SUBSCRIPTION_SCAN_INTERVAL_MINUTES` | Frequency of subscription expiration scans | Integer (minutes)                | Optional  | No      | `60`           | Defaults to `60`.                                                       |

---

### Storage (Supabase Buckets)

| Variable Name               | Purpose                                    | Source / Value Type | Req / Opt | Secret? | Example Format             | Fail-safe Behavior / Impact if Missing                       |
| :-------------------------- | :----------------------------------------- | :------------------ | :-------- | :------ | :------------------------- | :----------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase API endpoint                      | HTTPS URL           | Optional  | No      | `https://xxxx.supabase.co` | Uploads fall back to local disk storage (`storage/uploads`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin file operations | String              | Optional  | **YES** | `eyJhbGciOi...`            | Supabase storage operations fail if missing.                 |
| `SUPABASE_STORAGE_BUCKET`   | Target bucket for result PDFs & uploads    | String              | Optional  | No      | `lab-documents`            | Defaults to `lab-documents`.                                 |

---

### Email Delivery (SMTP / Nodemailer)

| Variable Name   | Purpose                     | Source / Value Type | Req / Opt | Secret? | Example Format                                  | Fail-safe Behavior / Impact if Missing                                            |
| :-------------- | :-------------------------- | :------------------ | :-------- | :------ | :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `SMTP_HOST`     | Hostname of mail server     | Domain              | Optional  | No      | `smtp.mailgun.org`                              | If unconfigured, mailer falls back to logging emails to stdout (`[mailer:stub]`). |
| `SMTP_PORT`     | Port of mail server         | Integer             | Optional  | No      | `587`                                           | Defaults to `587`.                                                                |
| `SMTP_SECURE`   | Enable TLS/SSL connection   | Boolean             | Optional  | No      | `false`                                         | Defaults to `false`.                                                              |
| `SMTP_USER`     | SMTP username               | String              | Optional  | **YES** | `postmaster@domain.com`                         | Mailer stub mode if empty.                                                        |
| `SMTP_PASSWORD` | SMTP password               | String              | Optional  | **YES** | `password123`                                   | Mailer stub mode if empty.                                                        |
| `MAIL_FROM`     | Default sender email header | Email format        | Optional  | No      | `"Foundation Lab <no-reply@foundationlab.com>"` | Defaults to `no-reply@foundationlab.com`.                                         |

---

### File Upload Constraints

| Variable Name        | Purpose                              | Source / Value Type | Req / Opt | Secret? | Example Format | Fail-safe Behavior / Impact if Missing                                  |
| :------------------- | :----------------------------------- | :------------------ | :-------- | :------ | :------------- | :---------------------------------------------------------------------- |
| `MAX_UPLOAD_SIZE_MB` | Upper limit for file upload payloads | Integer (MB)        | Optional  | No      | `15`           | Defaults to `15`. Uploads exceeding limit return 413 Payload Too Large. |

---

### Frontend Environment (`lab_frontend/.env`)

| Variable Name       | Purpose                                 | Source / Value Type | Req / Opt    | Secret? | Example Format                 | Fail-safe Behavior / Impact if Missing                                                         |
| :------------------ | :-------------------------------------- | :------------------ | :----------- | :------ | :----------------------------- | :--------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base API URL including `/api/v1` prefix | HTTPS URL           | **Required** | No      | `http://localhost:4000/api/v1` | Defaults to `http://localhost:4000/api/v1`. Frontend cannot communicate with API if incorrect. |

---

Lab Administrator Judith Obiorah judith.obiorah@foundationlab.com
Receptionist Grace Anyaoba grace.anyaoba@foundationlab.com
Phlebotomist Peter Okafor peter.okafor@foundationlab.com
Laboratory Scientist Amina Bello amina.bello@foundationlab.com
Radiographer Samuel Eze samuel.eze@foundationlab.com

Lab Administrator Daniel Adeyemi daniel.adeyemi@medlab.com
Receptionist Ngozi Chukwu ngozi.chukwu@medlab.com
Phlebotomist Ibrahim Sani ibrahim.sani@medlab.com
Laboratory Scientist Funke Ogunleye funke.ogunleye@medlab.com
Radiographer Tunde Balogun tunde.balogun@medlab.com

## 2. Production Checklist ("Before Going Live")

### Required Configuration Changes

1. [ ] **Environment File Protection**: Verify `.env` is listed in `.gitignore` and has **never** been committed to version control.
2. [ ] **JWT Secrets**: Generate 64+ character cryptographically strong random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
3. [ ] **Database Connection Pools**: Configure `DATABASE_URL` with transaction pooling enabled (`pgbouncer=true&connection_limit=10`) and `DIRECT_URL` pointing directly to port 5432 for migration scripts.
4. [ ] **CORS Configuration**: Set `CORS_ORIGINS` to match the exact frontend production domain(s) (e.g. `https://app.foundationlab.ng`).
5. [ ] **Cookie Security**: In HTTPS environments, ensure `COOKIE_SECURE=true`. If frontend and backend are hosted on separate root domains, set `COOKIE_SAMESITE=none`.
6. [ ] **Node Environment**: Set `NODE_ENV=production`.
7. [ ] **Database Migrations**: Run `npm run prisma:deploy` to apply schema changes without dev resets.
8. [ ] **Seed System Administrator**: Execute `npm run db:seed` or create the primary Super Admin user using unique, strong credentials (`SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`).

### Recommended External Infrastructure

1. [ ] **Redis Connection**: Deploy a managed Redis server (e.g., Upstash, Redis Enterprise, Render Redis) and set `REDIS_URL` for production BullMQ background jobs.
2. [ ] **Supabase Bucket**: Provision a private bucket in Supabase Storage named `lab-documents` and configure `SUPABASE_SERVICE_ROLE_KEY`.
3. [ ] **Production SMTP Mailer**: Configure transactional email service (SendGrid, Mailgun, AWS SES, Resend) via `SMTP_*` variables for password reset notifications and reports.

---

## 3. Local Development Setup

```bash
# 1. Clone & Enter Backend
cd lab_backend

# 2. Install dependencies
npm install

# 3. Setup local environment
cp .env.example .env

# 4. Generate Prisma Client & Migrate
npx prisma generate
npx prisma migrate dev

# 5. Seed database with initial permissions, roles, and Super Admin
npm run db:seed

# 6. Start backend development server
npm run dev
```

In a separate terminal:

```bash
# 1. Enter Frontend
cd lab_frontend

# 2. Install dependencies
npm install

# 3. Setup frontend env
cp .env.example .env

# 4. Start frontend Vite server
npm run dev
```

Visit `http://localhost:5173/super-admin` to sign in as Super Admin.

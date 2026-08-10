import { createHash } from "node:crypto";
import { config } from "../../config/index.js";
import { ApiError } from "../../core/ApiError.js";
import { logger } from "../../core/logger.js";
import { writeAudit } from "../../core/audit.js";
import { sendMail } from "../../core/mailer.js";
import { verifyPassword, hashPassword } from "../../utils/password.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  generateVerificationToken,
} from "../../utils/tokens.js";
import { durationToMs } from "../../utils/duration.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./auth.repository.js";
import * as tenantRepo from "../tenants/tenant.repository.js";

const REFRESH_TTL_MS = durationToMs(config.jwt.refreshTtl);
const VERIFY_TTL_MS = 60 * 60 * 1000; // 1 hour for reset/verify tokens

/**
 * Auth service — all authentication business logic lives here. Controllers stay
 * thin: they translate HTTP <-> service calls. Nothing here touches req/res.
 */

/**
 * Derives a stable device identifier. The client SHOULD send an explicit
 * deviceId (persisted in the browser); we fall back to a hash of UA+IP so the
 * device cap still functions if it doesn't.
 */
function resolveDeviceId(explicitId, context) {
  if (explicitId) return explicitId;
  return createHash("sha256")
    .update(`${context.userAgent || ""}|${context.ipAddress || ""}`)
    .digest("hex")
    .slice(0, 32);
}

/** Flattens a user's roles + permissions from either flattened shape (user.roles) or nested Prisma include shape. */
function extractRolesAndPermissions(user) {
  const rawRoles = user.roles || user.userRoles || [];
  const roles = rawRoles.map((r) => r.role || r);

  const permissions = new Set();
  for (const role of roles) {
    const rolePerms = role.permissions || role.rolePermissions || [];
    for (const rp of rolePerms) {
      const key = rp.permission?.key || (typeof rp.permission === "string" ? rp.permission : rp.key);
      if (key && typeof key === "string") {
        permissions.add(key);
      }
    }
  }
  return { roles, permissions };
}

/** Builds the sanitized user object returned to clients (never the hash). */
function toPublicUser(user, roles, permissions = []) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    organizationId: user.organizationId,
    branchId: user.branchId,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    roles: roles.map((r) => ({ key: r.key, name: r.name, scope: r.scope })),
    // Flat, de-duplicated permission keys so the client can drive UI/RBAC without
    // re-deriving them from roles. Authorization is still enforced server-side.
    permissions: [...permissions],
  };
}

/** Signs an access token carrying identity + tenant claims. */
function issueAccessToken(user, sessionId) {
  return signAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    branchId: user.branchId,
    sid: sessionId,
  });
}

/**
 * Enforces tenant isolation at login time.
 *
 * The `slug` is the laboratory the credentials are being presented to (from the
 * URL/subdomain the login came through). This is a SERVER-SIDE gate — the client
 * cannot be trusted to keep tenants apart:
 *
 *   • Laboratory login (slug present): the user MUST belong to that exact
 *     organization. A Foundation employee logging in through `/medlab` is
 *     rejected even with a correct email + password. Super Admins (no
 *     organization) cannot log in through a laboratory URL.
 *   • Platform login (no slug): only a platform user (no organization, i.e. the
 *     Super Admin) may use it. Tenant users are rejected.
 *
 * On any mismatch we throw the SAME generic credentials error used elsewhere so
 * the endpoint never reveals whether an account exists in another tenant.
 */
async function assertTenantAccess(user, slug, context, genericError) {
  if (slug) {
    const tenant = await tenantRepo.findActiveBySlug(slug);
    if (!tenant || user.organizationId !== tenant.id) {
      await writeAudit({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        organizationId: user.organizationId,
        actorId: user.id,
        entityType: "User",
        entityId: user.id,
        newValue: { reason: "tenant_mismatch", slug },
        context,
      });
      throw genericError;
    }
    return;
  }

  // Platform login path: only users without an organization (Super Admin) qualify.
  if (user.organizationId !== null) {
    await writeAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      organizationId: user.organizationId,
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      newValue: { reason: "not_platform_user" },
      context,
    });
    throw genericError;
  }
}

/**
 * LOGIN
 *
 * Verifies credentials, enforces lockout + device cap, opens a session, and
 * issues an access token (returned) plus a refresh token (raw value returned for
 * the controller to set as an HttpOnly cookie).
 */
export async function login({ email, password, slug, deviceId, deviceName }, context) {
  const genericError = ApiError.unauthorized("Invalid email or password", {
    code: "INVALID_CREDENTIALS",
  });

  const user = await repo.findUserByEmail(email);

  // Uniform failure for unknown user (avoid user enumeration).
  if (!user || user.deletedAt) {
    await writeAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: "User",
      newValue: { email, reason: "unknown_user" },
      context,
    });
    throw genericError;
  }

  // Account lockout window still active?
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await writeAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      organizationId: user.organizationId,
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      newValue: { reason: "locked" },
      context,
    });
    throw ApiError.forbidden(
      "Account is temporarily locked due to failed login attempts. Try again later.",
      { code: "ACCOUNT_LOCKED" },
    );
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);

  if (!passwordOk) {
    await handleFailedAttempt(user, context);
    throw genericError;
  }

  // Non-active accounts cannot log in even with a correct password.
  if (user.status !== "ACTIVE") {
    await writeAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      organizationId: user.organizationId,
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      newValue: { reason: `status_${user.status}` },
      context,
    });
    throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`, {
      code: "ACCOUNT_NOT_ACTIVE",
    });
  }

  // Tenant isolation gate: the credentials must be presented through the user's
  // own laboratory (or the platform login, for the Super Admin). Enforced here,
  // after the password is verified, so a correct-but-wrong-tenant login is still
  // rejected with the same generic error — never leaking cross-tenant accounts.
  await assertTenantAccess(user, slug, context, genericError);

  // Successful auth — clear any failed-attempt counters.
  await repo.updateUserLogin(user.id, {
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  const resolvedDeviceId = resolveDeviceId(deviceId, context);
  const session = await openSession(user, resolvedDeviceId, deviceName, context);

  const accessToken = issueAccessToken(user, session.id);
  const refreshRaw = await issueRefreshToken(user.id, session.id);

  const { roles, permissions } = extractRolesAndPermissions(user);

  await writeAudit({
    action: AUDIT_ACTIONS.LOGIN,
    organizationId: user.organizationId,
    actorId: user.id,
    entityType: "User",
    entityId: user.id,
    context,
  });

  return {
    user: toPublicUser(user, roles, permissions),
    accessToken,
    refreshToken: refreshRaw,
    refreshTokenMaxAge: REFRESH_TTL_MS,
  };
}

/** Increments failed-attempt counter and locks the account past the threshold. */
async function handleFailedAttempt(user, context) {
  const nextCount = user.failedLoginCount + 1;
  const shouldLock = nextCount >= config.auth.maxLoginAttempts;

  await repo.updateUserLogin(user.id, {
    failedLoginCount: shouldLock ? 0 : nextCount,
    lockedUntil: shouldLock
      ? new Date(Date.now() + config.auth.lockoutDurationMin * 60 * 1000)
      : undefined,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.LOGIN_FAILED,
    organizationId: user.organizationId,
    actorId: user.id,
    entityType: "User",
    entityId: user.id,
    newValue: { attempt: nextCount, locked: shouldLock },
    context,
  });
}

/**
 * Opens (or re-activates) a session for a device, enforcing the active-device
 * cap. If the device already has a session we reuse it; otherwise, when the cap
 * is reached, we evict the least-recently-active session to make room.
 */
async function openSession(user, deviceId, deviceName, context) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const existing = await repo.findSessionByDevice(user.id, deviceId);
  if (existing) {
    return repo.reactivateSession(existing.id, {
      expiresAt,
      deviceName: deviceName ?? existing.deviceName,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });
  }

  const activeCount = await repo.countUserSessions(user.id);
  if (activeCount >= config.auth.maxActiveDevices) {
    // Enforce the cap by revoking the oldest active session.
    await repo.deleteOldestSession(user.id);
    logger.info(
      { userId: user.id },
      "device cap reached — evicted least-recently-active session",
    );
  }

  return repo.createSession({
    userId: user.id,
    deviceId,
    deviceName: deviceName ?? null,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt,
  });
}

/** Creates and persists a refresh token, returning the raw value. */
async function issueRefreshToken(userId, sessionId) {
  const { raw, hash } = generateRefreshToken();
  await repo.createRefreshToken({
    userId,
    sessionId,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return raw;
}

/**
 * REFRESH (token rotation with reuse detection)
 *
 * Presents a raw refresh token; if valid and unused, it is rotated: the old
 * token is revoked and linked to a freshly issued one. Presenting an already
 * revoked token signals theft/replay — we revoke the entire session chain.
 */
export async function refresh(rawToken, context) {
  if (!rawToken) {
    throw ApiError.unauthorized("Refresh token missing", { code: "NO_REFRESH_TOKEN" });
  }

  const tokenHash = hashToken(rawToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);

  if (!stored) {
    throw ApiError.unauthorized("Invalid refresh token", { code: "INVALID_REFRESH_TOKEN" });
  }

  // Reuse detection: a revoked token being presented again → compromise.
  if (stored.revokedAt) {
    await repo.revokeRefreshTokenChain(tokenHash);
    await repo.revokeSession(stored.sessionId);
    await writeAudit({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorId: stored.userId,
      entityType: "RefreshToken",
      entityId: stored.id,
      newValue: { reason: "refresh_token_reuse" },
      context,
    });
    logger.warn({ userId: stored.userId }, "refresh token reuse detected — session revoked");
    throw ApiError.unauthorized("Refresh token has been revoked", {
      code: "REFRESH_TOKEN_REVOKED",
    });
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired", { code: "REFRESH_TOKEN_EXPIRED" });
  }

  const session = stored.session;
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized("Session is no longer valid", { code: "SESSION_INVALID" });
  }

  // Idle-timeout: sessions inactive beyond the configured window are killed.
  const idleMs = config.auth.sessionIdleTimeoutMin * 60 * 1000;
  if (Date.now() - new Date(session.lastActiveAt).getTime() > idleMs) {
    await repo.revokeSession(session.id);
    throw ApiError.unauthorized("Session expired due to inactivity", {
      code: "SESSION_IDLE_TIMEOUT",
    });
  }

  // Load fresh user context (roles/permissions may have changed).
  const user = await repo.findUserById(stored.userId);
  if (!user || user.status !== "ACTIVE" || user.deletedAt) {
    await repo.revokeSession(session.id);
    throw ApiError.unauthorized("Account is no longer active", { code: "ACCOUNT_NOT_ACTIVE" });
  }

  // Rotate: issue new token, link + revoke the old one, refresh session activity.
  const newRaw = await issueRefreshToken(user.id, session.id);
  const newHash = hashToken(newRaw);
  const newRecord = await repo.findRefreshTokenByHash(newHash);
  await repo.revokeRefreshToken(stored.id, newRecord.id);
  await repo.updateSessionActivity(session.id);

  const accessToken = issueAccessToken(user, session.id);
  const { roles, permissions } = extractRolesAndPermissions(user);

  return {
    user: toPublicUser(user, roles, permissions),
    accessToken,
    refreshToken: newRaw,
    refreshTokenMaxAge: REFRESH_TTL_MS,
  };
}

/**
 * LOGOUT — revokes the presented refresh token's session (this device only).
 * Idempotent: logging out with a missing/unknown token still succeeds.
 */
export async function logout(rawToken, context, actorId) {
  if (!rawToken) return;

  const tokenHash = hashToken(rawToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);
  if (!stored) return;

  await repo.revokeRefreshTokenChain(tokenHash);
  await repo.revokeSession(stored.sessionId);

  await writeAudit({
    action: AUDIT_ACTIONS.LOGOUT,
    actorId: actorId ?? stored.userId,
    entityType: "Session",
    entityId: stored.sessionId,
    context,
  });
}

/**
 * FORGOT PASSWORD — issues a single-use reset token and emails a link.
 * Always resolves the same way whether or not the email exists (no enumeration).
 */
export async function requestPasswordReset(email, context) {
  const user = await repo.findUserByEmail(email);

  if (user && !user.deletedAt) {
    const { raw, hash } = generateVerificationToken();
    await repo.createVerificationToken({
      userId: user.id,
      purpose: "PASSWORD_RESET",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      text: `A password reset was requested for your account. Use this token to reset your password: ${raw}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`,
    });

    await writeAudit({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      organizationId: user.organizationId,
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      context,
    });
  } else {
    logger.info({ email }, "password reset requested for unknown email");
  }
}

/**
 * RESET PASSWORD — consumes a reset token, sets the new password, and revokes
 * every session so all devices must re-authenticate.
 */
export async function resetPassword({ token, password }, context) {
  const tokenHash = hashToken(token);
  const record = await repo.findVerificationToken(tokenHash, "PASSWORD_RESET");

  if (!record) {
    throw ApiError.badRequest("Invalid or expired reset token", {
      code: "INVALID_RESET_TOKEN",
    });
  }

  const passwordHash = await hashPassword(password);
  await repo.updateUserPassword(record.userId, passwordHash);
  await repo.markVerificationTokenUsed(record.id);
  await repo.revokeUserSessions(record.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    actorId: record.userId,
    entityType: "User",
    entityId: record.userId,
    context,
  });
}

/**
 * CHANGE PASSWORD — for an authenticated user. Verifies the current password,
 * then rotates it and revokes all OTHER sessions (keeps the current device in).
 */
export async function changePassword({ userId, currentPassword, newPassword, currentSessionId }, context) {
  const user = await repo.findUserById(userId);
  if (!user) throw ApiError.notFound("User not found");

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) {
    throw ApiError.badRequest("Current password is incorrect", {
      code: "INVALID_CURRENT_PASSWORD",
    });
  }

  const passwordHash = await hashPassword(newPassword);
  await repo.updateUserPassword(userId, passwordHash);
  await repo.revokeUserSessions(userId, currentSessionId);

  await writeAudit({
    action: AUDIT_ACTIONS.PASSWORD_CHANGE,
    organizationId: user.organizationId,
    actorId: userId,
    entityType: "User",
    entityId: userId,
    context,
  });
}

/** Returns the authenticated user's profile (roles + permissions included). */
export async function getProfile(userId) {
  const user = await repo.findUserById(userId);
  if (!user || user.deletedAt) throw ApiError.notFound("User not found");
  const { roles, permissions } = extractRolesAndPermissions(user);
  return toPublicUser(user, roles, permissions);
}

export default {
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getProfile,
};

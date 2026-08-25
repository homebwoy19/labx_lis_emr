import { prisma } from "../../core/prisma.js";

/**
 * Auth repository — direct database access for authentication flows.
 *
 * Uses the UNSCOPED base client because auth queries run before a tenant context
 * exists (user logs in → we discover their organizationId/branchId → attach
 * tenant context). All other feature repositories should use req.db (the scoped
 * client) instead.
 */

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      // Own tenant identity, so the client can detect a host/tenant mismatch and
      // bounce the user to their assigned laboratory host. Null for Super Admins.
      organization: { select: { slug: true, name: true } },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function findUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      // Own tenant identity, so the client can detect a host/tenant mismatch and
      // bounce the user to their assigned laboratory host. Null for Super Admins.
      organization: { select: { slug: true, name: true } },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateUserLogin(userId, { failedLoginCount, lockedUntil, lastLoginAt }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(failedLoginCount !== undefined && { failedLoginCount }),
      ...(lockedUntil !== undefined && { lockedUntil }),
      ...(lastLoginAt !== undefined && { lastLoginAt }),
    },
  });
}

export async function countUserSessions(userId) {
  return prisma.session.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });
}

export async function createSession({ userId, deviceId, deviceName, userAgent, ipAddress, expiresAt }) {
  return prisma.session.create({
    data: { userId, deviceId, deviceName, userAgent, ipAddress, expiresAt },
  });
}

export async function findSession(sessionId) {
  return prisma.session.findUnique({ where: { id: sessionId } });
}

export async function findSessionByDevice(userId, deviceId) {
  return prisma.session.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });
}

/** Reactivates a device's existing session row on re-login (same device). */
export async function reactivateSession(sessionId, { expiresAt, deviceName, userAgent, ipAddress }) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      expiresAt,
      revokedAt: null,
      lastActiveAt: new Date(),
      ...(deviceName !== undefined && { deviceName }),
      ...(userAgent !== undefined && { userAgent }),
      ...(ipAddress !== undefined && { ipAddress }),
    },
  });
}

export async function updateSessionActivity(sessionId) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });
}

export async function revokeSession(sessionId) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserSessions(userId, exceptSessionId = null) {
  return prisma.session.updateMany({
    where: {
      userId,
      ...(exceptSessionId && { id: { not: exceptSessionId } }),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function deleteOldestSession(userId) {
  const oldest = await prisma.session.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastActiveAt: "asc" },
  });
  if (oldest) {
    await prisma.session.update({
      where: { id: oldest.id },
      data: { revokedAt: new Date() },
    });
  }
}

export async function createRefreshToken({ userId, sessionId, tokenHash, expiresAt }) {
  return prisma.refreshToken.create({
    data: { userId, sessionId, tokenHash, expiresAt },
  });
}

export async function findRefreshTokenByHash(tokenHash) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { session: true },
  });
}

export async function revokeRefreshToken(tokenId, replacedById = null) {
  return prisma.refreshToken.update({
    where: { id: tokenId },
    data: {
      revokedAt: new Date(),
      ...(replacedById && { replacedById }),
    },
  });
}

export async function revokeRefreshTokenChain(tokenHash) {
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!token) return;

  // Walk forward to the head of the rotation chain.
  let current = token;
  while (current.replacedById) {
    const next = await prisma.refreshToken.findUnique({ where: { id: current.replacedById } });
    if (!next) break;
    current = next;
  }

  // Revoke the entire chain (all predecessors).
  await prisma.refreshToken.updateMany({
    where: { sessionId: current.sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function createVerificationToken({ userId, purpose, tokenHash, expiresAt }) {
  return prisma.verificationToken.create({
    data: { userId, purpose, tokenHash, expiresAt },
  });
}

export async function findVerificationToken(tokenHash, purpose) {
  return prisma.verificationToken.findFirst({
    where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: new Date() } },
  });
}

export async function markVerificationTokenUsed(tokenId) {
  return prisma.verificationToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

export async function updateUserPassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
}

export default {
  findUserByEmail,
  findUserById,
  updateUserLogin,
  countUserSessions,
  createSession,
  findSession,
  findSessionByDevice,
  reactivateSession,
  updateSessionActivity,
  revokeSession,
  revokeUserSessions,
  deleteOldestSession,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeRefreshTokenChain,
  createVerificationToken,
  findVerificationToken,
  markVerificationTokenUsed,
  updateUserPassword,
};

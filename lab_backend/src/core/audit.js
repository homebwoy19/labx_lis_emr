import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/**
 * Append-only audit trail writer.
 *
 * Records who did what, when, and from where. Uses the base (unscoped) client
 * because audit rows must be written even for platform-level actions and during
 * auth flows that run before a tenant context exists. organizationId is stored
 * on the row itself for later scoped querying.
 *
 * Auditing must never break the main operation: failures are logged, not thrown.
 */
export async function writeAudit({
  action,
  organizationId = null,
  actorId = null,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  context = {},
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        organizationId,
        actorId,
        entityType,
        entityId,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action }, "failed to write audit log");
  }
}

export default { writeAudit };

import { prisma } from "../../core/prisma.js";
import { logger } from "../../core/logger.js";
import { parseListQuery } from "../../utils/pagination.js";

/**
 * Notification service.
 *
 * Manages in-app notifications stored in the `notifications` table. Key design:
 *   • `dedupeKey` (unique, nullable) prevents duplicate system-generated
 *     notifications. A background job can safely re-run without producing
 *     duplicate "your subscription expires" messages.
 *   • Reads use the tenant-scoped client (a user only sees their own).
 *   • Writes use the base client so cross-tenant notifications (e.g. Super
 *     Admin alerts about any lab) work correctly.
 */

/**
 * Creates a notification. Silently skips if a dedupeKey already exists.
 * Always uses the base (unscoped) client so notifications can target any user.
 */
export async function createNotification({
  userId,
  organizationId = null,
  channel = "IN_APP",
  type = null,
  title,
  body,
  data = null,
  dedupeKey = null,
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        organizationId,
        channel,
        type,
        title,
        body,
        data,
        dedupeKey,
      },
    });
  } catch (err) {
    // Unique constraint on dedupeKey → this notification was already sent.
    if (err?.code === "P2002" && dedupeKey) {
      logger.debug({ dedupeKey }, "notification deduplicated (already exists)");
      return null;
    }
    logger.error({ err, userId, type }, "failed to create notification");
    throw err;
  }
}

/**
 * List notifications for the authenticated user. Uses the scoped client so
 * a tenant user can only see their own org's notifications.
 */
export async function listNotifications(db, userId, query = {}) {
  const { skip, take, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });

  const where = { userId };

  const [total, data] = await Promise.all([
    db.notification.count({ where }),
    db.notification.findMany({
      where,
      skip,
      take,
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        channel: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  return { data, total, page, limit };
}

/** Count of unread notifications for the bell badge. */
export async function getUnreadCount(db, userId) {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}

/** Mark a single notification as read. */
export async function markRead(db, userId, notificationId) {
  return db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Mark all of the user's unread notifications as read. */
export async function markAllRead(db, userId) {
  return db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export default {
  createNotification,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};

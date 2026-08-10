import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as notificationService from "./notification.service.js";

/**
 * Notification controller — HTTP adapter for notification endpoints.
 */

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await notificationService.listNotifications(
    req.db,
    req.auth.userId,
    req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { notifications: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.db, req.auth.userId);
  return sendSuccess(res, { message: "OK", data: { unreadCount: count } });
});

export const markRead = asyncHandler(async (req, res) => {
  await notificationService.markRead(req.db, req.auth.userId, req.params.id);
  return sendSuccess(res, { message: "Notification marked as read" });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.db, req.auth.userId);
  return sendSuccess(res, { message: "All notifications marked as read" });
});

export default { list, unreadCount, markRead, markAllRead };

import { Router } from "express";
import * as controller from "./notification.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { tenantScope } from "../../middlewares/tenantScope.js";

/**
 * Notification routes — mounted at /api/v1/notifications.
 *
 * No special permission beyond being authenticated: every user can read their
 * own notifications. The tenant-scoped client ensures they only see theirs.
 *
 * Not behind the subscription guard — lapsed labs must still receive and read
 * subscription-related notifications.
 */
const router = Router();

router.use(authenticate, tenantScope);

router.get("/", controller.list);
router.get("/unread-count", controller.unreadCount);
router.patch("/:id/read", controller.markRead);
router.post("/mark-all-read", controller.markAllRead);

export default router;

import { Router } from "express";
import * as controller from "./subscription.controller.js";
import * as schema from "./subscription.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Subscription routes — mounted at /api/v1/subscriptions.
 *
 *   /plans      — catalog, any authenticated user (onboarding + pricing UI).
 *   /me         — the caller's own laboratory subscription (SUBSCRIPTION_READ).
 *   the rest    — Super-Admin management (SUBSCRIPTION_MANAGE).
 *
 * This router is intentionally NOT behind the subscription access guard, so a lab
 * whose subscription has lapsed can still read its own status and renewal state.
 */
const router = Router();

router.use(authenticate, tenantScope);

router.get("/plans", controller.listPlans);

router.get("/me", authorize(P.SUBSCRIPTION_READ), controller.getMine);

router.get(
  "/stats",
  authorize(P.SUBSCRIPTION_MANAGE),
  controller.stats,
);

router.get(
  "/",
  authorize(P.SUBSCRIPTION_MANAGE),
  validate(schema.listSubscriptionsSchema),
  controller.list,
);

router.get(
  "/:id",
  authorize(P.SUBSCRIPTION_MANAGE),
  validate(schema.subscriptionIdParamSchema),
  controller.getOne,
);

router.get(
  "/:id/history",
  authorize(P.SUBSCRIPTION_MANAGE),
  validate(schema.subscriptionIdParamSchema),
  controller.history,
);

router.patch(
  "/:id",
  authorize(P.SUBSCRIPTION_MANAGE),
  validate(schema.updateSubscriptionSchema),
  controller.update,
);

router.post(
  "/:id/renewal-decision",
  authorize(P.SUBSCRIPTION_MANAGE),
  validate(schema.renewalDecisionSchema),
  controller.renewalDecision,
);

export default router;

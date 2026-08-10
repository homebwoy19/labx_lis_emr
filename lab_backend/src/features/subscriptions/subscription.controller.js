import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as subscriptionService from "./subscription.service.js";

/**
 * Subscription controller — HTTP adapter.
 *
 * Read-my-subscription uses the scoped `req.db` (a Lab Admin sees only their own
 * lab). The Super-Admin management endpoints run on the unscoped platform client
 * (also `req.db`, which is the base client for a Super Admin) so they can reach
 * every laboratory.
 */

export const listPlans = asyncHandler(async (_req, res) => {
  const plans = subscriptionService.getPlans();
  return sendSuccess(res, { message: "OK", data: { plans } });
});

export const getMine = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getMySubscription(req.db, req.auth);
  return sendSuccess(res, { message: "OK", data: { subscription } });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await subscriptionService.listSubscriptions(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { subscriptions: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getSubscriptionStats(req.db);
  return sendSuccess(res, { message: "OK", data: { stats: data } });
});

export const getOne = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getSubscription(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { subscription } });
});

export const history = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getHistory(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { history: data } });
});

export const update = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.updateSubscription(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Subscription updated", data: { subscription } });
});

export const renewalDecision = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.recordRenewalDecision(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, {
    message: req.body.decision === "YES" ? "Subscription renewed" : "Subscription marked pending renewal",
    data: { subscription },
  });
});

export default { listPlans, getMine, list, stats, getOne, history, update, renewalDecision };

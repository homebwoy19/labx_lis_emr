import { ApiError } from "../core/ApiError.js";
import { getAccessStateForOrg } from "../features/subscriptions/subscription.service.js";

/**
 * Subscription access guard.
 *
 * Blocks operational requests for a laboratory whose subscription has fully
 * lapsed (period end + any granted grace window elapsed, or SUSPENDED/CANCELLED).
 * Returns HTTP 402 SUBSCRIPTION_INACTIVE so the frontend can show a clear
 * "renew to continue" state distinct from a 401/403.
 *
 * Enforced on the BACKEND — a lapsed lab cannot bypass this by calling the API
 * directly. Must run AFTER authenticate + tenantScope.
 *
 * Bypasses:
 *   - Super Admin (platform owner) — always retains access.
 *   - Requests with no organization context (platform-level) — nothing to gate.
 *   - Orgs with no subscription row (legacy) — fail-open (handled in the service).
 *
 * This guard is applied to operational routers only (patients, catalog, orders,
 * samples, results, payments, branches, users). Auth, tenants, subscriptions,
 * dashboard and notifications stay ungated so a lapsed lab can still sign in,
 * read its own subscription/notifications, and renew.
 */
export function subscriptionGuard(req, _res, next) {
  const auth = req.auth;
  if (!auth) return next(ApiError.unauthorized("Authentication required"));

  // Super Admin bypasses; platform-level (no org) requests have nothing to gate.
  if (auth.isSuperAdmin || !auth.organizationId) return next();

  getAccessStateForOrg(auth.organizationId)
    .then((state) => {
      if (state.blocked) {
        return next(
          new ApiError(402, "Your laboratory's subscription is inactive. Please renew to continue.", {
            code: "SUBSCRIPTION_INACTIVE",
            details: { status: state.status },
          }),
        );
      }
      return next();
    })
    .catch(next);
}

export default subscriptionGuard;

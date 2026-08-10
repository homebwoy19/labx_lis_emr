/**
 * API client for the LIS backend.
 *
 * A thin wrapper over fetch that:
 *   • targets the backend base URL from VITE_API_BASE_URL (separate-domain host)
 *   • sends the access token as a Bearer header (kept in memory, mirrored to
 *     storage by the auth context so the session survives a page refresh)
 *   • includes credentials so the HttpOnly refresh cookie flows cross-site
 *   • transparently refreshes the access token once on a 401, then retries
 *
 * There is exactly ONE auth/token pathway in the app — this module — so no
 * duplicate authentication logic exists elsewhere.
 */

// Base URL INCLUDES the /api/v1 prefix. Configured per-environment; falls back to
// the local backend for development.
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1"
).replace(/\/$/, "");

// In-memory access token. The source of truth at runtime; the auth context keeps
// it in sync with localStorage across reloads.
let accessToken = null;

// Optional listener the auth context registers so it can persist/clear session
// state when the client refreshes or drops the token out-of-band (e.g. on a
// failed refresh triggered by a background request).
let authListener = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function registerAuthListener(fn) {
  authListener = fn;
}

/** Raised for any non-2xx response; carries the backend error code + status. */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Core request helper. `auth` (default true) attaches the bearer token and
 * enables the one-shot refresh-on-401 retry. Auth endpoints opt out to avoid
 * recursive refresh loops.
 */
async function request(
  path,
  { method = "GET", body, auth = true, _retry = false } = {},
) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Access token likely expired — try a single silent refresh, then retry once.
  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, { method, body, auth, _retry: true });
    }
    // Refresh failed → the session is over. Let the context tear down.
    if (authListener) authListener(null);
  }

  const payload = await parseBody(res);

  if (!res.ok) {
    const err = payload?.error || {};
    throw new ApiError(err.message || payload?.message || "Request failed", {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }

  return payload;
}

/**
 * Attempts to rotate the access token using the refresh cookie. Updates the
 * in-memory token and notifies the auth listener on success. Never throws.
 */
async function tryRefresh() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!res.ok) return false;
    const payload = await parseBody(res);
    const token = payload?.data?.accessToken;
    const user = payload?.data?.user;
    if (!token) return false;
    setAccessToken(token);
    if (authListener) authListener({ accessToken: token, user });
    return true;
  } catch {
    return false;
  }
}

function buildUrl(path, query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      params.append(k, v);
    }
  }
  const str = params.toString();
  return str ? `${path}?${str}` : path;
}

// ── Public API surface ───────────────────────────────────────────────────────

export const api = {
  /** Resolve a laboratory tenant by its public slug (unauthenticated). */
  resolveTenant(slug) {
    return request(`/tenants/${encodeURIComponent(slug)}`, { auth: false });
  },

  /** Authenticate. `slug` identifies the tenant (omit for platform login). */
  login({ email, password, slug }) {
    return request("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password, ...(slug ? { slug } : {}) },
    });
  },

  /** Current authenticated user (revalidates roles/permissions server-side). */
  me() {
    return request("/auth/me");
  },

  /** Best-effort session teardown on this device. */
  logout() {
    return request("/auth/logout", { method: "POST", body: {} });
  },

  /** Request a password reset link (uniform acknowledgement). */
  forgotPassword(email) {
    return request("/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: { email },
    });
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard() {
    return request("/dashboard");
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications(query) {
    return request(buildUrl("/notifications", query));
  },
  notificationUnreadCount() {
    return request("/notifications/unread-count");
  },
  markNotificationRead(id) {
    return request(`/notifications/${id}/read`, { method: "PATCH", body: {} });
  },
  markAllNotificationsRead() {
    return request("/notifications/mark-all-read", { method: "POST", body: {} });
  },

  // ── Organizations (Super Admin) ───────────────────────────────────────────
  createOrganization(data) {
    return request("/organizations", { method: "POST", body: data });
  },
  listOrganizations(query) {
    return request(buildUrl("/organizations", query));
  },
  getOrganization(id) {
    return request(`/organizations/${id}`);
  },
  updateOrganization(id, data) {
    return request(`/organizations/${id}`, { method: "PATCH", body: data });
  },
  suspendOrganization(id, reason) {
    return request(`/organizations/${id}/suspend`, { method: "POST", body: { reason } });
  },
  activateOrganization(id) {
    return request(`/organizations/${id}/activate`, { method: "POST", body: {} });
  },

  // ── Branches ──────────────────────────────────────────────────────────────
  listBranches(query) {
    return request(buildUrl("/branches", query));
  },
  requestBranch(data) {
    return request("/branches", { method: "POST", body: data });
  },
  approveBranch(id) {
    return request(`/branches/${id}/approve`, { method: "POST", body: {} });
  },
  rejectBranch(id, reason) {
    return request(`/branches/${id}/reject`, { method: "POST", body: { reason } });
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  listUsers(query) {
    return request(buildUrl("/users", query));
  },
  createUser(data) {
    return request("/users", { method: "POST", body: data });
  },
  updateUser(id, data) {
    return request(`/users/${id}`, { method: "PATCH", body: data });
  },
  deleteUser(id) {
    return request(`/users/${id}`, { method: "DELETE" });
  },
  listAssignableRoles() {
    return request("/users/roles");
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────
  subscriptionPlans() {
    return request("/subscriptions/plans");
  },
  mySubscription() {
    return request("/subscriptions/me");
  },
  listSubscriptions(query) {
    return request(buildUrl("/subscriptions", query));
  },
  subscriptionStats() {
    return request("/subscriptions/stats");
  },
  getSubscription(id) {
    return request(`/subscriptions/${id}`);
  },
  subscriptionHistory(id, query) {
    return request(buildUrl(`/subscriptions/${id}/history`, query));
  },
  updateSubscription(id, data) {
    return request(`/subscriptions/${id}`, { method: "PATCH", body: data });
  },
  renewalDecision(id, data) {
    return request(`/subscriptions/${id}/renewal-decision`, { method: "POST", body: data });
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  listPatients(query) {
    return request(buildUrl("/patients", query));
  },
  createPatient(data) {
    return request("/patients", { method: "POST", body: data });
  },
  getPatient(id) {
    return request(`/patients/${id}`);
  },
  updatePatient(id, data) {
    return request(`/patients/${id}`, { method: "PATCH", body: data });
  },

  // ── Orders & Catalog ──────────────────────────────────────────────────────
  listOrders(query) {
    return request(buildUrl("/orders", query));
  },
  createOrder(data) {
    return request("/orders", { method: "POST", body: data });
  },
  getOrder(id) {
    return request(`/orders/${id}`);
  },
  listResults(query) {
    return request(buildUrl("/results", query));
  },
  listPayments(query) {
    return request(buildUrl("/payments", query));
  },
  listTests(query) {
    return request(buildUrl("/catalog/tests", query));
  },
  listCategories(query) {
    return request(buildUrl("/catalog/categories", query));
  },
};

export default api;

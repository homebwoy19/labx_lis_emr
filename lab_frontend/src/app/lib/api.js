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

const responseCache = new Map();
// In-flight GET promises keyed identically to responseCache. Concurrent
// identical GETs (React StrictMode double-mount, several widgets asking for the
// same resource) share ONE network round-trip instead of firing duplicates.
const pendingGets = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds — keeps pages responsive on revisit

export function clearApiCache() {
  responseCache.clear();
}

/**
 * Invalidate cache entries whose path contains any of the given fragments.
 * Called after mutations to selectively clear related GET caches without
 * wiping unrelated data (e.g. a patient-create shouldn't clear dashboard).
 */
export function invalidateCache(...pathFragments) {
  if (pathFragments.length === 0) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (pathFragments.some((frag) => key.includes(frag))) {
      responseCache.delete(key);
    }
  }
}

/**
 * Core request helper: serves fresh GET responses from cache, coalesces
 * concurrent identical GETs into one in-flight request, and delegates cache
 * misses to performRequest.
 */
async function request(path, opts = {}) {
  const { method = "GET", cache = true } = opts;
  const isGet = method === "GET";
  const cacheKey = isGet && cache ? `${accessToken || "anon"}:${path}` : null;

  if (cacheKey && responseCache.has(cacheKey)) {
    const entry = responseCache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    responseCache.delete(cacheKey);
  }

  // Coalesce concurrent identical GETs — one network call shared by all callers.
  if (cacheKey && pendingGets.has(cacheKey)) {
    return pendingGets.get(cacheKey);
  }

  const promise = performRequest(path, opts, cacheKey);

  if (cacheKey) {
    pendingGets.set(cacheKey, promise);
    // Drop the in-flight entry once settled (success OR failure). Attaching this
    // settle handler doesn't swallow the rejection the caller still awaits.
    const clear = () => {
      if (pendingGets.get(cacheKey) === promise) pendingGets.delete(cacheKey);
    };
    promise.then(clear, clear);
  }

  return promise;
}

/**
 * Performs one HTTP request: attaches auth, invalidates related caches on
 * mutation, transparently refreshes the token once on a 401, parses the
 * envelope, and writes the GET cache on success.
 */
async function performRequest(path, opts, cacheKey) {
  const { method = "GET", body, auth = true, _retry = false } = opts;
  const isGet = method === "GET";

  // Targeted cache invalidation on mutation — only clear related paths
  if (!isGet) {
    // Extract the resource root from the path (e.g. /patients/123 → /patients)
    const resource = path.split("?")[0].split("/").slice(0, 2).join("/");
    invalidateCache(resource, "/dashboard");
  }

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (typeof window !== "undefined" && window.location.hostname) {
    headers["X-Tenant-Host"] = window.location.hostname;
  }

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
      return request(path, { ...opts, _retry: true, cache: false });
    }
    // Refresh failed → the session is over. Let the context tear down.
    if (authListener) authListener(null);
  }

  const payload = await parseBody(res);

  if (!res.ok) {
    const err = payload?.error || {};
    let errorMsg = err.message || payload?.message || "Request failed";
    if (err.details && Array.isArray(err.details)) {
      errorMsg = `${errorMsg} (${err.details.map((d) => d.message || JSON.stringify(d)).join("; ")})`;
    } else if (err.details && typeof err.details === "object") {
      const issues = Object.entries(err.details).map(
        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`,
      );
      if (issues.length > 0) errorMsg = `${errorMsg} (${issues.join("; ")})`;
    }
    throw new ApiError(errorMsg, {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }

  if (cacheKey) {
    responseCache.set(cacheKey, { timestamp: Date.now(), data: payload });
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

/**
 * Downloads a protected binary endpoint (PDF, uploaded document) and saves it as
 * a file. These endpoints require the Bearer header — the access token lives in
 * memory/localStorage, NOT a cookie — so a plain `<a href>`/`window.open` would
 * 401. We fetch with auth, refresh once on a 401 (mirroring `performRequest`),
 * then save the blob via a transient object URL. Never returns a URL.
 */
async function downloadBlob(path, fallbackName, _retry = false) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return downloadBlob(path, fallbackName, true);
    if (authListener) authListener(null);
  }

  if (!res.ok) {
    const payload = await parseBody(res);
    const err = payload?.error || {};
    throw new ApiError(err.message || payload?.message || "Download failed", {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }

  // Honour a server-provided filename (Content-Disposition) when present.
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Fetches a protected document and returns a short-lived object URL suitable for
 * inline preview (e.g. showing an uploaded logo in an <img>). Mirrors
 * `downloadBlob`'s auth + single-refresh handling, but instead of forcing a
 * download it hands back a `blob:` URL. The CALLER owns that URL and must call
 * `URL.revokeObjectURL(url)` when the preview is torn down, or it leaks.
 */
async function fetchObjectUrl(path, _retry = false) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return fetchObjectUrl(path, true);
    if (authListener) authListener(null);
  }

  if (!res.ok) {
    const payload = await parseBody(res);
    const err = payload?.error || {};
    throw new ApiError(err.message || payload?.message || "Preview failed", {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ── Public API surface ───────────────────────────────────────────────────────

export const api = {
  /** Resolve a laboratory tenant by its public slug (unauthenticated). */
  resolveTenant(slug) {
    return request(
      slug ? `/tenants/${encodeURIComponent(slug)}` : "/tenants/resolve",
      { auth: false },
    );
  },

  resolveCurrentTenant() {
    return request("/tenants/resolve", { auth: false });
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

  /** Consume a reset token and set a new password (revokes all sessions). */
  resetPassword({ token, password }) {
    return request("/auth/reset-password", {
      method: "POST",
      auth: false,
      body: { token, password },
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
    return request("/notifications/mark-all-read", {
      method: "POST",
      body: {},
    });
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
    return request(`/organizations/${id}/suspend`, {
      method: "POST",
      body: { reason },
    });
  },
  activateOrganization(id) {
    return request(`/organizations/${id}/activate`, {
      method: "POST",
      body: {},
    });
  },
  listOrganizationDomains(id) {
    return request(`/organizations/${id}/domains`);
  },
  connectOrganizationDomain(id, hostname) {
    return request(`/organizations/${id}/domains`, {
      method: "POST",
      body: { hostname },
    });
  },
  disconnectOrganizationDomain(id, domainId) {
    return request(`/organizations/${id}/domains/${domainId}`, {
      method: "DELETE",
    });
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
    return request(`/branches/${id}/reject`, {
      method: "POST",
      body: { reason },
    });
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
    return request(`/subscriptions/${id}/renewal-decision`, {
      method: "POST",
      body: data,
    });
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

  // ── Samples ──────────────────────────────────────────────────────────────
  listSamples(query) {
    return request(buildUrl("/samples", query));
  },
  createSample(data) {
    return request("/samples", { method: "POST", body: data });
  },
  getSample(id) {
    return request(`/samples/${id}`);
  },
  collectSample(id, data) {
    return request(`/samples/${id}/collect`, {
      method: "POST",
      body: data || {},
    });
  },
  receiveSample(id) {
    return request(`/samples/${id}/receive`, { method: "POST", body: {} });
  },
  rejectSample(id, reason) {
    return request(`/samples/${id}/reject`, {
      method: "POST",
      body: { reason },
    });
  },

  // ── Results ───────────────────────────────────────────────────────────────
  listResults(query) {
    return request(buildUrl("/results", query));
  },
  getResult(id) {
    return request(`/results/${id}`);
  },
  enterResult(data) {
    return request("/results", { method: "POST", body: data });
  },
  /**
   * Receptionist types/edits the narrative report onto the letterhead.
   * `submit: true` sends it to the Lab Admin for approval; otherwise it saves
   * as a draft. This never approves — approval is a Lab Admin capability.
   */
  prepareResult(id, { preparedReport, submit } = {}) {
    return request(`/results/${id}/prepare`, {
      method: "POST",
      body: { preparedReport, submit: Boolean(submit) },
    });
  },
  approveResult(id) {
    return request(`/results/${id}/approve`, { method: "POST", body: {} });
  },
  rejectResult(id, reason) {
    return request(`/results/${id}/reject`, {
      method: "POST",
      body: { reason },
    });
  },
  releaseOrder(orderId) {
    return request(`/results/orders/${orderId}/release`, {
      method: "POST",
      body: {},
    });
  },
  downloadOrderPdf(orderId) {
    return downloadBlob(
      `/results/orders/${orderId}/pdf`,
      `order-${orderId}.pdf`,
    );
  },
  /** Email the approved diagnostic report to the patient's registered email. */
  sendOrderReport(orderId) {
    return request(`/results/orders/${orderId}/send`, {
      method: "POST",
      body: {},
    });
  },

  // ── Letterhead (lab branding for reports) ─────────────────────────────────
  getLetterhead() {
    return request("/letterhead");
  },
  updateLetterhead(data) {
    return request("/letterhead", { method: "PUT", body: data });
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  uploadDocument(data) {
    return request("/documents/upload", { method: "POST", body: data });
  },
  getDocument(id) {
    return request(`/documents/${id}`);
  },
  downloadDocument(id) {
    return downloadBlob(`/documents/${id}/download`, `document-${id}`);
  },
  /**
   * Fetch a document as a `blob:` object URL for inline preview (e.g. rendering a
   * stored logo/signature in an <img>). The caller MUST revokeObjectURL it on
   * teardown. Use this instead of downloadDocument when you want to display —
   * not force-save — the file.
   */
  previewDocument(id) {
    return fetchObjectUrl(`/documents/${id}/download`);
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
  cancelOrder(id, reason) {
    return request(`/orders/${id}/cancel`, {
      method: "POST",
      body: { reason },
    });
  },
  listPayments(query) {
    return request(buildUrl("/payments", query));
  },
  createPayment(data) {
    return request("/payments", { method: "POST", body: data });
  },
  // ── Catalog: tests ──────────────────────────────────────────────────────
  listTests(query) {
    return request(buildUrl("/catalog/tests", query));
  },
  getTest(id) {
    return request(`/catalog/tests/${id}`);
  },
  createTest(data) {
    return request("/catalog/tests", { method: "POST", body: data });
  },
  updateTest(id, data) {
    return request(`/catalog/tests/${id}`, { method: "PATCH", body: data });
  },
  deleteTest(id) {
    return request(`/catalog/tests/${id}`, { method: "DELETE" });
  },
  // ── Catalog: categories ─────────────────────────────────────────────────
  listCategories(query) {
    return request(buildUrl("/catalog/categories", query));
  },
  getCategory(id) {
    return request(`/catalog/categories/${id}`);
  },
  createCategory(data) {
    return request("/catalog/categories", { method: "POST", body: data });
  },
  updateCategory(id, data) {
    return request(`/catalog/categories/${id}`, {
      method: "PATCH",
      body: data,
    });
  },
  deleteCategory(id) {
    return request(`/catalog/categories/${id}`, { method: "DELETE" });
  },
};

export default api;

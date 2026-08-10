import { config } from "../config/index.js";

/**
 * HttpOnly cookie helpers for the refresh token.
 *
 * The refresh token is never exposed to JavaScript (HttpOnly) and is only sent
 * over HTTPS in production (Secure). SameSite mitigates CSRF for the refresh
 * flow; state-changing routes additionally rely on the access token in the
 * Authorization header.
 *
 * When the frontend and API are on different sites (e.g. Vercel + a separate API
 * domain) the cookie must be SameSite=None; Secure, or the browser will refuse
 * to send it on cross-site XHR. That combination is driven by config
 * (COOKIE_SAMESITE / COOKIE_SECURE) so local same-site dev stays on "strict".
 */
export const REFRESH_COOKIE_NAME = "lis_refresh_token";

function baseCookieOptions() {
  const sameSite = config.cookie.sameSite;
  // Browsers only accept SameSite=None when the cookie is also Secure.
  const secure = sameSite === "none" ? true : config.cookie.secure;

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  // For cross-site (SameSite=None) hosting the API and frontend are on different
  // registrable domains, so a Domain attribute would only scope the cookie to the
  // API host anyway — omit it and let the browser use the host-only default. For
  // same-site setups honor the configured domain (e.g. "localhost").
  if (sameSite !== "none" && config.cookie.domain) {
    options.domain = config.cookie.domain;
  }

  return options;
}

export function setRefreshCookie(res, token, maxAgeMs) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeMs,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}

export default { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie };

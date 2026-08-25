import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  api,
  setAccessToken,
  getAccessToken,
  registerAuthListener,
} from "../lib/api";
import { primaryFrontendRole } from "./roleMap";

/**
 * Authentication context — the single source of truth for who is signed in.
 *
 * Responsibilities:
 *   • hold the current user (roles + permissions from the backend) and the
 *     derived frontend role string the dashboards expect
 *   • persist the access token so a page refresh keeps the session (the refresh
 *     cookie is HttpOnly and revalidated on load)
 *   • expose login / logout and permission helpers
 *
 * There is no mock data and no second auth pathway: every session fact comes
 * from the backend via the api client.
 */

const STORAGE_KEY = "lis_access_token";
// Non-authoritative UX state: which laboratory the session is branded to, used
// for header/branding and for redirecting within the right tenant URL. Security
// is always enforced by the backend from the token's organization — never this.
const TENANT_KEY = "lis_tenant";

const AuthContext = createContext(null);

function readStoredTenant() {
  try {
    const raw = localStorage.getItem(TENANT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(readStoredTenant);
  // `booting` covers the initial silent session-restore so guards don't flash
  // the login screen before we know whether a session exists.
  const [booting, setBooting] = useState(true);

  // Keep the api client's token listener in sync with context state. Fired when
  // the client refreshes a token or when a refresh fails (payload === null).
  useEffect(() => {
    registerAuthListener((payload) => {
      if (!payload) {
        setAccessToken(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
        setUser(null);
        setTenant(null);
        return;
      }
      if (payload.accessToken) {
        setAccessToken(payload.accessToken);
        localStorage.setItem(STORAGE_KEY, payload.accessToken);
      }
      if (payload.user) setUser(payload.user);
    });
  }, []);

  // On first mount, restore the session: re-hydrate the stored access token and
  // ask the backend who we are (this also revalidates roles/permissions). If the
  // token is stale the api client silently refreshes via the cookie once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAccessToken(stored);
      try {
        const res = await api.me();
        if (!cancelled) setUser(res?.data?.user ?? null);
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password, slug, tenant: tenantArg }) => {
    const res = await api.login({ email, password, slug });
    const token = res?.data?.accessToken;
    const nextUser = res?.data?.user;
    setAccessToken(token);
    if (token) localStorage.setItem(STORAGE_KEY, token);
    setUser(nextUser ?? null);
    // Persist (or clear) the tenant branding for this session.
    if (tenantArg) {
      const slim = { slug: tenantArg.slug, name: tenantArg.name };
      localStorage.setItem(TENANT_KEY, JSON.stringify(slim));
      setTenant(slim);
    } else {
      localStorage.removeItem(TENANT_KEY);
      setTenant(null);
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) await api.logout();
    } catch {
      // Best-effort; local teardown proceeds regardless.
    }
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TENANT_KEY);
    setUser(null);
    setTenant(null);
  }, []);

  const value = useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      user,
      tenant,
      booting,
      isAuthenticated: Boolean(user),
      role: user ? primaryFrontendRole(user) : null,
      organizationId: user?.organizationId ?? null,
      // Authoritative tenant identity from the token payload (survives across
      // origins, unlike the localStorage `tenant`). Drives the host-redirect guard
      // and branding fallback. Null for the platform Super Admin.
      organizationSlug: user?.organizationSlug ?? null,
      organizationName: user?.organizationName ?? null,
      permissions,
      hasPermission: (key) => permissions.has(key),
      login,
      logout,
    };
  }, [user, tenant, booting, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export default AuthProvider;

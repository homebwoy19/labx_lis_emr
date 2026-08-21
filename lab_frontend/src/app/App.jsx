import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router";
import {
  HeartPulse,
  LogOut,
  Menu,
  Bell,
  LayoutDashboard,
  Users,
  CreditCard,
  UserCheck,
  Building2,
  ScrollText,
  Droplets,
  Microscope,
  RadioTower,
  X,
  ShieldCheck,
  GitBranch,
  FlaskConical,
  ClipboardList,
  Receipt,
  FileCheck,
  BarChart3,
  Settings,
} from "lucide-react";
import { Modal } from "./components/UIComponents";
import { LoginScreen } from "./components/Login";
import { useAuth } from "./auth/AuthContext";
import { api } from "./lib/api";

import {
  DashboardScreen,
  PatientsScreen,
  UsersScreen,
  CentresScreen,
  TestCatalogScreen,
  ReportsScreen,
  AuditLogsScreen,
  LetterheadSettingsScreen,
} from "./components/Admin";

import {
  ReceptionistDashboard,
  ReceptionistPatientsScreen,
} from "./components/Receptionist";

import { OrdersScreen, PaymentsScreen } from "./components/Orders";
import { ResultsScreen, ReceptionistResultsScreen } from "./components/Results";

import { PhlebotomistDashboard } from "./components/Phlebotomist";
import { LabTechDashboard } from "./components/LabTech";
import { RadiographerDashboard } from "./components/Radiographer";

import {
  SuperAdminDashboard,
  LaboratoriesScreen,
  BranchApprovalsScreen,
  SubscriptionsScreen,
  PlatformAuditScreen,
} from "./components/SuperAdmin";

/**
 * Application root.
 *
 * React-router owns URLs, auth-gating, and tenant resolution; the existing
 * in-app `screen` state (inside AppShell) remains purely in-app view state — it
 * is NOT a second router. Dashboards are keyed off the backend-provided real
 * role, so a user cannot URL-hop into another role's dashboard, and the backend
 * enforces tenant isolation regardless of the URL.
 *
 * Route map (tenant always lives in the path — subdomain-ready):
 *   /                     → 404 (no landing page; enter via a lab slug or /super-admin)
 *   /super-admin          → platform login
 *   /super-admin/app/*    → platform dashboards (RequireAuth, platform area)
 *   /:tenantSlug          → laboratory login (tenant resolved from the DB)
 *   /:tenantSlug/app/*    → laboratory dashboards (RequireAuth, tenant area)
 *   *                     → 404
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<NotFound />} />

      <Route path="/super-admin" element={<PlatformLoginRoute />} />
      <Route
        path="/super-admin/app/*"
        element={
          <RequireAuth area="platform">
            <AppShell />
          </RequireAuth>
        }
      />

      <Route path="/:tenantSlug" element={<TenantLoginRoute />} />
      <Route
        path="/:tenantSlug/app/*"
        element={
          <RequireAuth area="tenant">
            <AppShell />
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ── Redirect / guard helpers ─────────────────────────────────────────────────

/** The dashboard-area home path for an authenticated user, or null if unknown. */
function areaHomePath(auth) {
  if (!auth.isAuthenticated) return null;
  if (auth.role === "super_admin") return "/super-admin/app";
  const slug = auth.tenant?.slug;
  return slug ? `/${slug}/app` : null;
}

/** Full-screen splash shown during the initial silent session-restore. */
function BootSplash({ label = "Loading…" }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-white/80">
        <HeartPulse className="w-8 h-8 text-blue-400 animate-pulse" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

/** Shown when a URL slug doesn't map to a real, active laboratory. */
function TenantNotFound({ slug, message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center bg-card rounded-2xl p-8 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-lg font-semibold">Laboratory not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {message || `No active laboratory matches “${slug}”.`}
        </p>
        <p className="text-sm text-muted-foreground mt-5">
          Reach out to the developer to get your page link.
        </p>
      </div>
    </div>
  );
}

/** Generic 404 for the base URL and any route that matches nothing. */
function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center bg-card rounded-2xl p-8 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-base font-bold text-muted-foreground">404</span>
        </div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This page doesn’t exist.
        </p>
        <p className="text-sm text-muted-foreground mt-5">
          Reach out to the developer to get your page link.
        </p>
      </div>
    </div>
  );
}

/**
 * Recovers from an inconsistent session (authenticated but no resolvable home,
 * e.g. tenant branding was cleared out-of-band): tears the session down and
 * returns to platform sign-in rather than looping on a redirect.
 */
function SessionRecovery() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/super-admin" replace />;
}

/**
 * Guards a dashboard area. `area` is "platform" or "tenant". Unauthenticated
 * visitors are sent to the matching login; authenticated users in the wrong
 * area (or wrong tenant path) are bounced to their own home. Tenant isolation
 * is still enforced by the backend — this is UX routing only.
 */
function RequireAuth({ area, children }) {
  const auth = useAuth();
  const { tenantSlug } = useParams();

  if (auth.booting) return <BootSplash />;

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to={area === "platform" ? "/super-admin" : `/${tenantSlug}`}
        replace
      />
    );
  }

  const home = areaHomePath(auth);

  if (area === "platform" && auth.role !== "super_admin") {
    return home ? <Navigate to={home} replace /> : <SessionRecovery />;
  }

  if (area === "tenant") {
    if (auth.role === "super_admin") {
      return <Navigate to="/super-admin/app" replace />;
    }
    // A tenant user visiting a different tenant's path → send to their own.
    if (auth.tenant?.slug && tenantSlug && auth.tenant.slug !== tenantSlug) {
      return home ? <Navigate to={home} replace /> : <SessionRecovery />;
    }
  }

  return children;
}

/** `/super-admin` — the platform (Super Admin) login surface. */
function PlatformLoginRoute() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.booting) return <BootSplash />;
  if (auth.isAuthenticated) {
    const home = areaHomePath(auth);
    return home ? <Navigate to={home} replace /> : <SessionRecovery />;
  }
  return (
    <LoginScreen
      mode="platform"
      onSuccess={() => navigate("/super-admin/app", { replace: true })}
    />
  );
}

/**
 * `/:tenantSlug` — a laboratory login surface. Resolves the tenant from the DB
 * by slug (never hard-coded) so branding is real and the backend can reject
 * cross-tenant logins.
 */
function TenantLoginRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [state, setState] = useState({
    status: "loading",
    tenant: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", tenant: null, error: "" });
    api
      .resolveTenant(tenantSlug)
      .then((res) => {
        if (!cancelled) {
          setState({
            status: "ready",
            tenant: res?.data?.tenant ?? null,
            error: "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            tenant: null,
            error: err?.message || "Laboratory not found",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  if (auth.booting) return <BootSplash />;

  // Already signed in — don't show a login form.
  if (auth.isAuthenticated) {
    if (auth.role === "super_admin") {
      return <Navigate to="/super-admin/app" replace />;
    }
    if (auth.tenant?.slug === tenantSlug) {
      return <Navigate to={`/${tenantSlug}/app`} replace />;
    }
    const home = areaHomePath(auth);
    return home ? <Navigate to={home} replace /> : <SessionRecovery />;
  }

  if (state.status === "loading") {
    return <BootSplash label="Loading laboratory…" />;
  }
  if (state.status === "error" || !state.tenant) {
    return <TenantNotFound slug={tenantSlug} message={state.error} />;
  }

  return (
    <LoginScreen
      mode="tenant"
      tenant={state.tenant}
      onSuccess={() => navigate(`/${tenantSlug}/app`, { replace: true })}
    />
  );
}

// ── Dashboard shell ──────────────────────────────────────────────────────────

/** The initial in-app screen for a given role. */
function defaultScreenForRole(role) {
  switch (role) {
    case "super_admin":
      return "super_admin_dashboard";
    case "phlebotomist":
      return "phlebotomist_dashboard";
    case "lab_tech":
      return "lab_tech_dashboard";
    case "radiographer":
      return "radiographer_dashboard";
    case "receptionist":
      return "receptionist_dashboard";
    default:
      return "dashboard";
  }
}

/**
 * The authenticated application shell (sidebar + header + screen area). Role,
 * user, and tenant all come from the auth context — no mock users, no role
 * selection. `screen` is in-app view state, reset whenever the role changes.
 */
function AppShell() {
  const { role, user, tenant, logout } = useAuth();
  const navigateRoute = useNavigate();

  const [screen, setScreen] = useState(() => defaultScreenForRole(role));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Poll unread notification count
  useEffect(() => {
    let cancelled = false;
    const loadUnread = () => {
      api.notificationUnreadCount()
        .then((res) => {
          if (!cancelled) setUnreadCount(res?.data?.unreadCount || 0);
        })
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setLoadingNotifications(true);
    api.notifications({ limit: 15 })
      .then((res) => setNotificationsList(res?.data?.notifications || []))
      .catch(() => {})
      .finally(() => setLoadingNotifications(false));
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotificationsList((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {}
  };

  // If the effective role changes (e.g. a fresh login into this shell), snap
  // back to that role's default screen.
  useEffect(() => {
    setScreen(defaultScreenForRole(role));
  }, [role]);

  function navigate(s) {
    setScreen(s);
    setSidebarOpen(false); // Close sidebar on mobile item selection
  }

  const isPlatform = role === "super_admin";
  // Real values from the session — never hard-coded.
  const userName = user?.fullName || "User";
  const brand = isPlatform ? "Platform Admin" : tenant?.name || "Laboratory";
  const loginPath = isPlatform ? "/super-admin" : `/${tenant?.slug ?? ""}`;

  async function handleLogout() {
    await logout();
    navigateRoute(loginPath, { replace: true });
  }

  const getNavItems = () => {
    if (role === "super_admin") {
      return [
        {
          id: "super_admin_dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        { id: "laboratories", label: "Laboratories", icon: Building2 },
        { id: "branch_approvals", label: "Branch Approvals", icon: GitBranch },
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
        { id: "platform_audit", label: "Platform Audit", icon: ShieldCheck },
      ];
    }
    if (role === "receptionist") {
      return [
        {
          id: "receptionist_dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        { id: "patients", label: "Patients", icon: Users },
        { id: "orders", label: "Orders", icon: ClipboardList },
        { id: "results", label: "Results", icon: FileCheck },
        { id: "payments", label: "Payments", icon: Receipt },
      ];
    }
    if (role === "phlebotomist")
      return [
        { id: "phlebotomist_dashboard", label: "My Queue", icon: Droplets },
      ];
    if (role === "lab_tech")
      return [
        { id: "lab_tech_dashboard", label: "My Queue", icon: Microscope },
      ];
    if (role === "radiographer")
      return [
        {
          id: "radiographer_dashboard",
          label: "Imaging Queue",
          icon: RadioTower,
        },
      ];

    // Admin Nav
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "patients", label: "Patients", icon: Users },
      { id: "orders", label: "Orders", icon: ClipboardList },
      { id: "payments", label: "Payments", icon: Receipt },
      { id: "results", label: "Results", icon: FileCheck },
      { id: "users", label: "Users", icon: UserCheck },
      { id: "centres", label: "Centres", icon: Building2 },
      { id: "test_catalog", label: "Test Catalog", icon: FlaskConical },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "audit_logs", label: "Audit Logs", icon: ScrollText },
      { id: "settings", label: "Settings", icon: Settings },
    ];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop for small screens when sidebar is toggled */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            {isPlatform ? (
              <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            ) : (
              <HeartPulse className="w-5 h-5 text-blue-400 flex-shrink-0" />
            )}
            <span className="font-semibold text-white truncate max-w-[140px]">{brand}</span>
          </div>
          {/* Close menu button on mobile screen split */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {getNavItems().map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  screen === item.id
                    ? "bg-sidebar-accent text-white font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button visible on smaller screens */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">
                Welcome back, {userName}
              </span>
              <h1 className="text-sm font-semibold capitalize">
                {screen.replace(/_/g, " ")}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bell Notifications Button */}
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-lg hover:bg-muted"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Super Admin Routes */}
          {role === "super_admin" && (
            <>
              {screen === "super_admin_dashboard" && (
                <SuperAdminDashboard onNavigate={navigate} />
              )}
              {screen === "laboratories" && <LaboratoriesScreen />}
              {screen === "branch_approvals" && <BranchApprovalsScreen />}
              {screen === "subscriptions" && <SubscriptionsScreen />}
              {screen === "platform_audit" && <PlatformAuditScreen />}
            </>
          )}

          {/* Admin Routes */}
          {role === "admin" && (
            <>
              {screen === "dashboard" && <DashboardScreen />}
              {screen === "patients" && <PatientsScreen />}
              {screen === "orders" && <OrdersScreen />}
              {screen === "payments" && <PaymentsScreen />}
              {screen === "results" && <ResultsScreen />}
              {screen === "users" && <UsersScreen />}
              {screen === "centres" && <CentresScreen />}
              {screen === "test_catalog" && <TestCatalogScreen />}
              {screen === "reports" && <ReportsScreen />}
              {screen === "audit_logs" && <AuditLogsScreen />}
              {screen === "settings" && <LetterheadSettingsScreen />}
            </>
          )}

          {/* Receptionist Routes */}
          {role === "receptionist" && (
            <>
              {screen === "receptionist_dashboard" && <ReceptionistDashboard />}
              {screen === "patients" && <ReceptionistPatientsScreen />}
              {screen === "orders" && <OrdersScreen />}
              {screen === "results" && <ReceptionistResultsScreen />}
              {screen === "payments" && <PaymentsScreen />}
            </>
          )}

          {/* Operational Role Dashboards */}
          {role === "phlebotomist" && <PhlebotomistDashboard />}
          {role === "lab_tech" && <LabTechDashboard />}
          {role === "radiographer" && <RadiographerDashboard />}
        </main>
      </div>

      {/* Notifications Modal Popup */}
      {showNotifications && (
        <Modal
          title="System Notifications"
          onClose={() => setShowNotifications(false)}
        >
          <div className="space-y-3">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}
            {loadingNotifications ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading notifications…</p>
            ) : notificationsList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No notifications at this time.</p>
            ) : (
              notificationsList.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg text-sm transition-colors ${
                    !n.readAt ? "bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50" : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from "react";
import { api, invalidateCache } from "../lib/api";
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Building2,
  Plus,
  Edit2,
  XCircle,
  Settings,
  Download,
  Upload,
  Trash2,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  StatCard,
  Table,
  StatusBadge,
  Badge,
  Btn,
  Select,
  SearchBar,
  Pagination,
  Modal,
  Alert,
  FormField,
  Input,
} from "./UIComponents";
import { PIE_COLORS } from "./sharedData";

// ── Formatting & export helpers (dashboard / reports analytics) ─────────────
const fmtNaira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Compact money for chart axes: ₦1.2m / ₦45k / ₦900.
const fmtNairaShort = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}m`;
  if (Math.abs(v) >= 1_000) return `₦${Math.round(v / 1_000)}k`;
  return `₦${Math.round(v)}`;
};

const pctOf = (value, total) => {
  const t = Number(total || 0);
  if (!t) return "0%";
  return `${Math.round((Number(value || 0) / t) * 100)}%`;
};

// Client-side CSV export: builds a UTF-8 blob and clicks a transient link. The
// rows are already-loaded report figures, so nothing leaves the browser.
function downloadCsv(filename, headers, rows) {
  const esc = (cell) => {
    const s = cell == null ? "" : String(cell);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Uniform empty-state filler so a chart card keeps its height when there is
// genuinely no data yet (a fresh lab has no orders/payments — shown truthfully
// rather than back-filled with invented figures).
function EmptyChart({ label, height = 190 }) {
  return (
    <div
      className="flex items-center justify-center text-xs text-muted-foreground text-center px-4"
      style={{ height }}
    >
      {label}
    </div>
  );
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
export function DashboardScreen({ onNavigate }) {
  const [liveData, setLiveData] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.dashboard()
      .then((res) => {
        if (!cancelled && res?.data?.dashboard) {
          setLiveData(res.data.dashboard);
        }
      })
      .catch(() => {});

    api.mySubscription()
      .then((res) => {
        if (!cancelled && res?.data?.subscription) {
          setSubscription(res.data.subscription);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (liveData?.stats) {
      const s = liveData.stats;
      return {
        totalRevenue: `₦${Number(s.totalRevenue || 0).toLocaleString()}`,
        todayRevenue: `₦${Number(s.todayRevenue || 0).toLocaleString()}`,
        totalPatients: (s.totalPatients || 0).toLocaleString(),
        newPatientsThisMonth: s.newPatientsThisMonth || 0,
        testsCompleted: s.completedOrdersThisMonth || 0,
        pendingTests: s.pendingOrders || 0,
        activeCentres: `${s.activeBranches} / ${s.totalBranches}`,
      };
    }
    return {
      totalRevenue: "₦0",
      todayRevenue: "₦0",
      totalPatients: "0",
      newPatientsThisMonth: 0,
      testsCompleted: 0,
      pendingTests: 0,
      activeCentres: "0 / 0",
    };
  }, [liveData]);

  // Live analytics from the org-admin dashboard endpoint. Every series below is
  // bound to a field the backend actually returns (see dashboard.repository.js);
  // absent data renders an empty state, never a placeholder figure.
  const revenueChart = useMemo(() => {
    const rc = liveData?.revenueChart;
    return { data: rc?.chartData ?? [], branches: rc?.branches ?? [] };
  }, [liveData]);

  const categoryData = useMemo(() => liveData?.testsByCategory ?? [], [liveData]);
  const categoryTotal = useMemo(
    () => categoryData.reduce((s, d) => s + Number(d.value || 0), 0),
    [categoryData],
  );

  const testsByDayData = useMemo(() => liveData?.testsByDay ?? [], [liveData]);
  const recentOrders = useMemo(() => liveData?.recentOrders ?? [], [liveData]);

  const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

  return (
    <div className="p-6 space-y-6">
      {/* Subscription Status Banner (Phase 7) */}
      {subscription && (
        <Card className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded font-semibold text-white">
                {subscription.plan} Plan ({subscription.billingCycle})
              </span>
              <StatusBadge status={subscription.liveStatus?.toLowerCase() || subscription.status?.toLowerCase()} />
            </div>
            <p className="text-sm text-blue-100">
              Renews: {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Active"} ·
              Usage: {subscription.usage?.branches?.current ?? 0}/{subscription.maxBranches} Branches · {subscription.usage?.users?.current ?? 0}/{subscription.maxUsers} Staff Seats
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{naira(subscription.amount)}</p>
            {subscription.daysRemaining != null && (
              <p className="text-xs text-blue-200">
                {subscription.daysRemaining > 0
                  ? `${subscription.daysRemaining} days remaining in cycle`
                  : "Renewal due"}
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={stats.totalRevenue}
          sub="All centres · All time"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Today's Revenue"
          value={stats.todayRevenue}
          sub="Live transaction total"
          color="bg-teal-500"
        />
        <StatCard
          icon={Users}
          label="Total Patients"
          value={stats.totalPatients}
          sub={`${stats.newPatientsThisMonth} new this month`}
          color="bg-violet-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Tests Completed"
          value={stats.testsCompleted}
          sub="This month"
          color="bg-emerald-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Tests"
          value={stats.pendingTests}
          sub="Across all centres"
          color="bg-amber-500"
        />
        <StatCard
          icon={Building2}
          label="Active Centres"
          value={stats.activeCentres}
          sub="Online & active"
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Revenue trend — one line per branch, from paid payments */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Revenue Trend (Last 6 Months)
            </h3>
            <span className="text-xs text-muted-foreground">
              Paid revenue · by branch
            </span>
          </div>
          {revenueChart.data.length === 0 || revenueChart.branches.length === 0 ? (
            <EmptyChart label="No paid revenue recorded yet." height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={fmtNairaShort}
                />
                <Tooltip formatter={(v) => fmtNaira(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {revenueChart.branches.map((b, i) => (
                  <Line
                    key={b}
                    name={b}
                    dataKey={b}
                    stroke={PIE_COLORS[i % PIE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 2. Tests by category — counts (with true share), not fabricated % */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Tests by Category
          </h3>
          {categoryData.length === 0 ? (
            <EmptyChart label="No tests ordered yet." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} test${v === 1 ? "" : "s"}`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 space-y-1">
                {categoryData.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium">
                      {d.value} ({pctOf(d.value, categoryTotal)})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Tests recorded per day — single real series (last 7 days) */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Tests Recorded (Last 7 Days)
          </h3>
          {testsByDayData.length === 0 ? (
            <EmptyChart label="No tests recorded in the last 7 days." height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={testsByDayData}
                barSize={22}
                margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  width={35}
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  formatter={(v) => [`${v} test${v === 1 ? "" : "s"}`, "Tests"]}
                />
                <Bar
                  name="Tests"
                  dataKey="tests"
                  fill="#1a6bcc"
                  radius={[4, 4, 0, 0]}
                  minPointSize={2}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 4. Recent orders — real, from api.dashboard() recentOrders */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Recent Orders
          </h3>
          {recentOrders.length === 0 ? (
            <EmptyChart label="No orders recorded yet." height={220} />
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 text-xs border-b border-border pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {o.patientName || "—"}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {o.orderCode}
                      {o.branchName ? ` · ${o.branchName}` : ""}
                      {o.itemCount != null
                        ? ` · ${o.itemCount} test${o.itemCount === 1 ? "" : "s"}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium text-foreground">
                      {fmtNaira(o.totalAmount)}
                    </span>
                    <StatusBadge status={(o.status || "").toLowerCase()} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN REPORTS & ANALYTICS
// ============================================================================
// Reporting surface over the org-admin dashboard aggregates (api.dashboard()).
// It re-presents the SAME real figures as exportable tabular breakdowns: every
// number here is a backend aggregate — there are no forecasts, projections, or
// invented values, and the windows are exactly the ones the backend produces
// (all-time totals, revenue for the last 6 months, volume for the last 7 days).
// A brand-new lab with no orders/payments legitimately shows zeros/empty tables.
export function ReportsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.dashboard()
      .then((res) => {
        if (cancelled) return;
        const d = res?.data?.dashboard;
        if (d) setData(d);
        else setError("Reports data is unavailable.");
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load reports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats ?? null;

  // Revenue by branch × month (last 6 months) from paid payments. chartData rows
  // look like { month, [branchName]: amount }; missing branch keys mean zero.
  const revenue = useMemo(() => {
    const rc = data?.revenueChart;
    const branches = rc?.branches ?? [];
    const rows = (rc?.chartData ?? []).map((row) => {
      const values = branches.map((b) => Number(row[b] || 0));
      return { month: row.month, values, total: values.reduce((s, v) => s + v, 0) };
    });
    const branchTotals = branches.map((_, i) =>
      rows.reduce((s, r) => s + r.values[i], 0),
    );
    const grandTotal = branchTotals.reduce((s, v) => s + v, 0);
    return { branches, rows, branchTotals, grandTotal };
  }, [data]);

  // Tests by category (all-time counts) with true share of the total.
  const categories = useMemo(() => {
    const list = data?.testsByCategory ?? [];
    const total = list.reduce((s, d) => s + Number(d.value || 0), 0);
    return { list, total };
  }, [data]);

  // Daily test volume (last 7 days).
  const daily = useMemo(() => {
    const list = data?.testsByDay ?? [];
    const total = list.reduce((s, d) => s + Number(d.tests || 0), 0);
    return { list, total };
  }, [data]);

  const exportRevenue = () =>
    downloadCsv(
      "revenue-by-branch-6mo.csv",
      ["Month", ...revenue.branches, "Total (NGN)"],
      [
        ...revenue.rows.map((r) => [r.month, ...r.values, r.total]),
        ["Total", ...revenue.branchTotals, revenue.grandTotal],
      ],
    );

  const exportCategories = () =>
    downloadCsv(
      "tests-by-category.csv",
      ["Category", "Tests", "Share"],
      [
        ...categories.list.map((d) => [d.name, d.value, pctOf(d.value, categories.total)]),
        ["Total", categories.total, "100%"],
      ],
    );

  const exportDaily = () =>
    downloadCsv(
      "daily-test-volume-7d.csv",
      ["Day", "Tests"],
      [...daily.list.map((d) => [d.day, d.tests]), ["Total", daily.total]],
    );

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      </div>
    );
  }

  const revenueEmpty = revenue.rows.length === 0 || revenue.branches.length === 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organization-wide figures from recorded orders and payments. Export any
          table as CSV.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* KPI band — real all-time / this-month aggregates from orgStats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={fmtNaira(stats?.totalRevenue)}
          sub="All time · paid"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="This Month"
          value={fmtNaira(stats?.monthRevenue)}
          sub="Revenue this month"
          color="bg-teal-500"
        />
        <StatCard
          icon={Users}
          label="Total Patients"
          value={(stats?.totalPatients ?? 0).toLocaleString()}
          sub={`${stats?.newPatientsThisMonth ?? 0} new this month`}
          color="bg-violet-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Total Orders"
          value={(stats?.totalOrders ?? 0).toLocaleString()}
          sub={`${stats?.ordersThisMonth ?? 0} this month`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={(stats?.pendingOrders ?? 0).toLocaleString()}
          sub="Awaiting completion"
          color="bg-amber-500"
        />
        <StatCard
          icon={Building2}
          label="Active Branches"
          value={`${stats?.activeBranches ?? 0} / ${stats?.totalBranches ?? 0}`}
          sub={`${stats?.totalStaff ?? 0} staff`}
          color="bg-indigo-500"
        />
      </div>

      {/* Revenue by branch × month */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Revenue by Branch (Last 6 Months)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paid payments, grouped by month and branch.
            </p>
          </div>
          <Btn
            variant="secondary"
            size="sm"
            onClick={exportRevenue}
            disabled={revenueEmpty}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Btn>
        </div>
        <Table headers={["Month", ...revenue.branches, "Total"]} empty={revenueEmpty}>
          {revenue.rows.map((r) => (
            <tr key={r.month}>
              <td className="px-4 py-3 text-foreground font-medium">{r.month}</td>
              {r.values.map((v, i) => (
                <td key={revenue.branches[i]} className="px-4 py-3 text-muted-foreground">
                  {fmtNaira(v)}
                </td>
              ))}
              <td className="px-4 py-3 text-foreground font-semibold">{fmtNaira(r.total)}</td>
            </tr>
          ))}
          {!revenueEmpty && (
            <tr className="bg-muted/40">
              <td className="px-4 py-3 text-foreground font-semibold">Total</td>
              {revenue.branchTotals.map((v, i) => (
                <td key={revenue.branches[i]} className="px-4 py-3 text-foreground font-semibold">
                  {fmtNaira(v)}
                </td>
              ))}
              <td className="px-4 py-3 text-foreground font-bold">{fmtNaira(revenue.grandTotal)}</td>
            </tr>
          )}
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tests by category */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-sm font-semibold text-foreground">Tests by Category</h3>
            <Btn
              variant="secondary"
              size="sm"
              onClick={exportCategories}
              disabled={categories.list.length === 0}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Btn>
          </div>
          <Table headers={["Category", "Tests", "Share"]} empty={categories.list.length === 0}>
            {categories.list.map((d) => (
              <tr key={d.name}>
                <td className="px-4 py-3 text-foreground">{d.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.value}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {pctOf(d.value, categories.total)}
                </td>
              </tr>
            ))}
            {categories.list.length > 0 && (
              <tr className="bg-muted/40">
                <td className="px-4 py-3 text-foreground font-semibold">Total</td>
                <td className="px-4 py-3 text-foreground font-semibold">{categories.total}</td>
                <td className="px-4 py-3 text-foreground font-semibold">100%</td>
              </tr>
            )}
          </Table>
        </Card>

        {/* Daily test volume */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Daily Test Volume (Last 7 Days)
            </h3>
            <Btn
              variant="secondary"
              size="sm"
              onClick={exportDaily}
              disabled={daily.list.length === 0}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Btn>
          </div>
          <Table headers={["Day", "Tests"]} empty={daily.list.length === 0}>
            {daily.list.map((d, i) => (
              <tr key={`${d.day}-${i}`}>
                <td className="px-4 py-3 text-foreground">{d.day}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.tests}</td>
              </tr>
            ))}
            {daily.list.length > 0 && (
              <tr className="bg-muted/40">
                <td className="px-4 py-3 text-foreground font-semibold">Total</td>
                <td className="px-4 py-3 text-foreground font-semibold">{daily.total}</td>
              </tr>
            )}
          </Table>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN PATIENTS
// ============================================================================
export function PatientsScreen() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(false);
  const perPage = 10;

  // Form state for creating a new patient
  const [createForm, setCreateForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "MALE",
    phone: "", email: "", address: "", branchId: "",
  });
  const [creating, setCreating] = useState(false);

  // Branches available for patient registration. A Lab Admin is org-scoped (no
  // implicit branch), so the backend requires an explicit, authorized branchId.
  // Mirror the Users screen: load non-rejected branches; one → auto-use it,
  // many → the admin must choose.
  const [branches, setBranches] = useState([]);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "MALE",
    phone: "", email: "", address: "",
  });

  const loadPatients = (searchTerm, pg) => {
    setLoading(true);
    api.listPatients({ page: pg || page, limit: perPage, search: searchTerm ?? search })
      .then((res) => {
        const list = res?.data?.patients || [];
        const mapped = list.map((p) => ({
          id: p.id,
          pid: p.patientCode,
          name: `${p.firstName} ${p.lastName}`,
          firstName: p.firstName,
          lastName: p.lastName,
          dob: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "—",
          rawDob: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
          gender: p.gender,
          phone: p.phone || "—",
          email: p.email || "—",
          address: p.address || "",
          status: p.status,
          createdAt: p.createdAt,
        }));
        setPatients(mapped);
        setTotalPatients(res?.meta?.total || list.length);
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPatients();
  }, [page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadPatients(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load the lab's branches once (for the registration branch selector).
  useEffect(() => {
    api
      .listBranches()
      .then((res) =>
        setBranches((res?.data?.branches ?? []).filter((b) => b.status !== "REJECTED")),
      )
      .catch(() => {});
  }, []);

  // Exactly one branch → we can auto-use it without asking.
  const singleBranch = branches.length === 1 ? branches[0] : null;

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      setAlert({ type: "error", msg: "First name and last name are required." });
      return;
    }
    // Resolve the branch to register under: auto-use the only branch, otherwise
    // require the admin's explicit choice. The backend independently authorizes
    // this branchId against the caller's tenant — this is a UX guard, not the
    // security boundary.
    const branchId = singleBranch ? singleBranch.id : createForm.branchId;
    if (!branchId) {
      setAlert({
        type: "error",
        msg:
          branches.length === 0
            ? "No branch is available. Create a branch before registering patients."
            : "Please select a branch to register this patient.",
      });
      return;
    }
    setCreating(true);
    try {
      const payload = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        gender: createForm.gender || "UNKNOWN",
        branchId,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        address: createForm.address.trim() || undefined,
      };
      if (createForm.dateOfBirth) {
        payload.dateOfBirth = createForm.dateOfBirth;
      }
      await api.createPatient(payload);
      setShowCreate(false);
      setCreateForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE", phone: "", email: "", address: "", branchId: "" });
      setAlert({ type: "success", msg: "Patient registered successfully." });
      loadPatients();
    } catch (err) {
      setAlert({ type: "error", msg: `Failed to create patient: ${err.message}` });
    } finally {
      setCreating(false);
    }
  }

  async function handleEditPatient(e) {
    e.preventDefault();
    if (!editingPatient) return;
    try {
      const payload = {};
      if (editForm.firstName.trim()) payload.firstName = editForm.firstName.trim();
      if (editForm.lastName.trim()) payload.lastName = editForm.lastName.trim();
      if (editForm.gender) payload.gender = editForm.gender;
      if (editForm.phone.trim()) payload.phone = editForm.phone.trim();
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      if (editForm.address.trim()) payload.address = editForm.address.trim();
      if (editForm.dateOfBirth) payload.dateOfBirth = editForm.dateOfBirth;
      await api.updatePatient(editingPatient.id, payload);
      setEditingPatient(null);
      setAlert({ type: "success", msg: "Patient updated successfully." });
      loadPatients();
    } catch (err) {
      setAlert({ type: "error", msg: `Failed to update patient: ${err.message}` });
    }
  }

  function openEditModal(p) {
    setEditForm({
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      dateOfBirth: p.rawDob || "",
      gender: p.gender || "MALE",
      phone: p.phone === "—" ? "" : p.phone || "",
      email: p.email === "—" ? "" : p.email || "",
      address: p.address || "",
    });
    setEditingPatient(p);
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patients…"
          />
        </div>
        <div className="flex gap-2">
          <Btn
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Patient
          </Btn>
        </div>
      </div>

      <Card>
        <Table
          headers={[
            "Patient ID",
            "Name",
            "DOB",
            "Gender",
            "Phone",
            "Status",
            "Actions",
          ]}
          empty={patients.length === 0}
        >
          {patients.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {p.pid}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.dob}
              </td>
              <td className="px-4 py-3 text-sm">{p.gender}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.phone}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status?.toLowerCase() || "active"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(p)}
                    className="cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={totalPatients}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>
      {/* create patient Modal */}
      {showCreate && (
        <Modal
          title="Create New Patient"
          onClose={() => setShowCreate(false)}
          width="max-w-2xl"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                {branches.length === 0 ? (
                  <FormField label="Branch" required>
                    <p className="text-sm text-red-500">
                      No branch is available. Create a branch before registering patients.
                    </p>
                  </FormField>
                ) : singleBranch ? (
                  <FormField label="Branch">
                    <Input value={singleBranch.name} disabled readOnly />
                  </FormField>
                ) : (
                  <FormField label="Branch" required>
                    <Select
                      value={createForm.branchId}
                      onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                    >
                      <option value="">Select a branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </div>
              <FormField label="First Name" required>
                <Input
                  required
                  placeholder="e.g. Amina"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  required
                  placeholder="e.g. Hassan"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                />
              </FormField>
              <FormField label="Date of Birth">
                <Input
                  type="date"
                  value={createForm.dateOfBirth}
                  onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })}
                />
              </FormField>
              <FormField label="Gender" required>
                <Select
                  value={createForm.gender}
                  onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
              <FormField label="Phone Number">
                <Input
                  placeholder="+234 800 XXX XXXX"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  placeholder="patient@email.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </FormField>
              <div className="col-span-2">
                <FormField label="Address">
                  <Input
                    placeholder="Street, City"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={creating || branches.length === 0}>
                {creating ? "Creating…" : "Create Patient"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
      {/* Edit Patient Modal */}
      {editingPatient && (
        <Modal
          title="Edit Patient Information"
          onClose={() => setEditingPatient(null)}
          width="max-w-2xl"
        >
          <form onSubmit={handleEditPatient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </FormField>
              <FormField label="Date of Birth">
                <Input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                />
              </FormField>
              <FormField label="Gender" required>
                <Select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
              <FormField label="Phone Number">
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </FormField>
              <div className="col-span-2">
                <FormField label="Address">
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setEditingPatient(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Save Changes
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN USERS
// ============================================================================
export function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [seat, setSeat] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const emptyCreateForm = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    roleKey: "",
    branchId: "",
  };
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    api
      .listUsers()
      .then((res) => setUsers(res?.data?.users ?? []))
      .catch((err) =>
        setAlert({ type: "error", message: err.message || "Failed to load users." }),
      )
      .finally(() => setLoading(false));
  };

  const loadSeat = () => {
    api
      .mySubscription()
      .then((res) => {
        const u = res?.data?.subscription?.usage?.users;
        if (u) setSeat({ current: u.current, limit: u.limit });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUsers();
    loadSeat();
    api
      .listAssignableRoles()
      .then((res) => setRoles(res?.data?.roles ?? []))
      .catch(() => {});
    api
      .listBranches()
      .then((res) =>
        setBranches((res?.data?.branches ?? []).filter((b) => b.status !== "REJECTED")),
      )
      .catch(() => {});
  }, []);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "—";
  const selectedRole = roles.find((r) => r.key === createForm.roleKey);
  const needsBranch = selectedRole?.scope === "BRANCH";
  const atLimit = seat && seat.limit != null && seat.current >= seat.limit;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const refreshAfterMutation = () => {
    // The client auto-invalidates /users and /dashboard on any mutation, but not
    // the subscription usage — clear it so the seat count reflects the change.
    invalidateCache("/subscriptions");
    loadUsers();
    loadSeat();
  };

  const handleCreate = () => {
    setCreating(true);
    const payload = {
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      roleKey: createForm.roleKey,
    };
    if (createForm.phone.trim()) payload.phone = createForm.phone.trim();
    if (needsBranch && createForm.branchId) payload.branchId = createForm.branchId;

    api
      .createUser(payload)
      .then((res) => {
        const u = res?.data?.user;
        setShowAdd(false);
        setCreateForm(emptyCreateForm);
        setAlert({
          type: "success",
          message: `${u ? `${u.firstName} ${u.lastName}` : "User"} created.`,
        });
        refreshAfterMutation();
      })
      .catch((err) =>
        setAlert({ type: "error", message: err.message || "Failed to create user." }),
      )
      .finally(() => setCreating(false));
  };

  const openEdit = (u) => {
    setEditingUser({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone || "",
      branchId: u.branchId || "",
      roleScope: u.roles?.[0]?.scope || "BRANCH",
    });
  };

  const handleUpdate = () => {
    setSaving(true);
    const body = {
      firstName: editingUser.firstName.trim(),
      lastName: editingUser.lastName.trim(),
      phone: editingUser.phone.trim() || null,
    };
    if (editingUser.roleScope === "BRANCH") {
      body.branchId = editingUser.branchId || null;
    }
    api
      .updateUser(editingUser.id, body)
      .then(() => {
        setEditingUser(null);
        setAlert({ type: "success", message: "User updated." });
        refreshAfterMutation();
      })
      .catch((err) =>
        setAlert({ type: "error", message: err.message || "Failed to update user." }),
      )
      .finally(() => setSaving(false));
  };

  const handleDeactivate = () => {
    const target = deactivating;
    setSaving(true);
    api
      .deleteUser(target.id)
      .then(() => {
        setDeactivating(null);
        setAlert({
          type: "success",
          message: `${target.firstName} ${target.lastName} deactivated. Their records are preserved.`,
        });
        refreshAfterMutation();
      })
      .catch((err) =>
        setAlert({ type: "error", message: err.message || "Failed to deactivate user." }),
      )
      .finally(() => setSaving(false));
  };

  const handleReactivate = (u) => {
    setBusyId(u.id);
    api
      .updateUser(u.id, { status: "ACTIVE" })
      .then(() => {
        setAlert({
          type: "success",
          message: `${u.firstName} ${u.lastName} reactivated.`,
        });
        refreshAfterMutation();
      })
      .catch((err) =>
        setAlert({ type: "error", message: err.message || "Failed to reactivate user." }),
      )
      .finally(() => setBusyId(null));
  };

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="w-80">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users…" />
        </div>
        <div className="flex items-center gap-3">
          {seat && seat.limit != null && (
            <span className="text-xs text-muted-foreground">
              Seats:{" "}
              <span className="font-semibold text-foreground">{seat.current}</span> /{" "}
              {seat.limit}
            </span>
          )}
          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateForm(emptyCreateForm);
              setShowAdd(true);
            }}
            disabled={atLimit}
          >
            <Plus className="w-3.5 h-3.5" />
            Add User
          </Btn>
        </div>
      </div>

      {atLimit && (
        <Alert
          type="info"
          message={`You've reached your plan's seat limit (${seat.limit}). Deactivate a user or upgrade your plan to add more.`}
        />
      )}

      <Card>
        <Table
          headers={["Name", "Email", "Role", "Branch", "Status", "Actions"]}
          empty={!loading && filtered.length === 0}
        >
          {filtered.map((u) => {
            const role = u.roles?.[0];
            const isActive = u.status === "ACTIVE";
            return (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-primary">
                      {`${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="info">{role?.name || "—"}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {role?.scope === "ORGANIZATION"
                    ? "Organization"
                    : branchName(u.branchId)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={(u.status || "").toLowerCase()} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Btn>
                    {isActive ? (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeactivating(u)}
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                      </Btn>
                    ) : (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(u)}
                        disabled={busyId === u.id || atLimit}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* Add user */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required>
                <Input
                  placeholder="First name"
                  value={createForm.firstName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, firstName: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  placeholder="Last name"
                  value={createForm.lastName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, lastName: e.target.value })
                  }
                />
              </FormField>
            </div>
            <FormField label="Email" required>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </FormField>
            <FormField label="Phone">
              <Input
                placeholder="Optional"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
              />
            </FormField>
            <FormField label="Role" required>
              <Select
                value={createForm.roleKey}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    roleKey: e.target.value,
                    branchId: "",
                  })
                }
              >
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {needsBranch && (
              <FormField label="Branch" required>
                <Select
                  value={createForm.branchId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, branchId: e.target.value })
                  }
                >
                  <option value="">Select a branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Temporary Password" required>
              <Input
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Min 10 characters, including an uppercase letter, a lowercase letter,
                a number, and a special character.
              </p>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !createForm.firstName.trim() ||
                  !createForm.lastName.trim() ||
                  !createForm.email.trim() ||
                  !createForm.password ||
                  !createForm.roleKey ||
                  (needsBranch && !createForm.branchId)
                }
              >
                {creating ? "Creating…" : "Create User"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit user */}
      {editingUser && (
        <Modal title="Edit User" onClose={() => setEditingUser(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required>
                <Input
                  value={editingUser.firstName}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, firstName: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  value={editingUser.lastName}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, lastName: e.target.value })
                  }
                />
              </FormField>
            </div>
            <FormField label="Phone">
              <Input
                value={editingUser.phone}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, phone: e.target.value })
                }
              />
            </FormField>
            {editingUser.roleScope === "BRANCH" && (
              <FormField label="Branch">
                <Select
                  value={editingUser.branchId}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, branchId: e.target.value })
                  }
                >
                  <option value="">— None —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={handleUpdate}
                disabled={
                  saving ||
                  !editingUser.firstName.trim() ||
                  !editingUser.lastName.trim()
                }
              >
                {saving ? "Saving…" : "Save Changes"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Deactivate */}
      {deactivating && (
        <Modal title="Deactivate User" onClose={() => setDeactivating(null)}>
          <div className="space-y-4">
            <Alert
              type="error"
              message={`${deactivating.firstName} ${deactivating.lastName} will lose access immediately. Historical records are preserved and the seat is freed; you can reactivate them later.`}
            />
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setDeactivating(null)}>
                Cancel
              </Btn>
              <Btn variant="danger" onClick={handleDeactivate} disabled={saving}>
                {saving ? "Deactivating…" : "Deactivate"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN CENTERS
// ============================================================================
export function CentresScreen() {
  const [centresList, setCentresList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);
  const [settingsCentre, setSettingsCentre] = useState(null);
  const [alert, setAlert] = useState(null);
  const [newCentre, setNewCentre] = useState({
    name: "",
    code: "",
    city: "",
    address: "",
    phone: "",
    email: "",
  });

  const [centreSettings, setCentreSettings] = useState({
    testApprovalNotif: true,
    newOrderNotif: true,
  });

  const loadBranches = () => {
    api.listBranches()
      .then((res) => {
        if (res?.data?.branches) {
          setCentresList(res.data.branches.map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code,
            city: b.city || "Lagos",
            address: b.address || "—",
            phone: b.phone || "—",
            email: b.email || "—",
            manager: b.manager ? `${b.manager.firstName} ${b.manager.lastName}` : "—",
            status: b.status === "ACTIVE" ? "active" : b.status === "PENDING_APPROVAL" ? "pending" : "inactive",
            patientsToday: b._count?.orders ?? 0,
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleSaveCentreEdit = (e) => {
    e.preventDefault();
    setCentresList((prev) =>
      prev.map((c) => (c.id === editingCentre.id ? editingCentre : c)),
    );
    setEditingCentre(null);
    setAlert("Centre details updated successfully.");
  };

  const handleCreateCentre = async (e) => {
    e.preventDefault();
    try {
      const code = newCentre.code || newCentre.name.slice(0, 3).toUpperCase();
      await api.requestBranch({
        name: newCentre.name,
        code,
        city: newCentre.city,
        address: newCentre.address || undefined,
        phone: newCentre.phone || undefined,
        email: newCentre.email || undefined,
      });
      setShowAdd(false);
      setNewCentre({ name: "", code: "", city: "", address: "", phone: "", email: "" });
      setAlert("Branch request submitted for Super Admin approval!");
      loadBranches();
    } catch (err) {
      setAlert(`Failed to request branch: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}
      <div className="flex justify-end">
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add Centre
        </Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {centresList.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {c.city} · <span className="font-mono">{c.code}</span>
                  </p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                Phone: {c.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                Email: {c.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                Manager: {c.manager}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold text-primary">
                  {c.patientsToday || 0}
                </span>{" "}
                <span className="text-muted-foreground">orders recorded</span>
              </div>
              <div className="flex gap-1">
                {/* Edit Center Information */}
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCentre({ ...c })}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Btn>
                {/* Center Settings Modal */}
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsCentre(c)}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Center Modal */}
      {editingCentre && (
        <Modal
          title="Edit Centre Information"
          onClose={() => setEditingCentre(null)}
        >
          <form onSubmit={handleSaveCentreEdit} className="space-y-4">
            <FormField label="Centre Name" required>
              <Input
                value={editingCentre.name}
                onChange={(e) =>
                  setEditingCentre({ ...editingCentre, name: e.target.value })
                }
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" required>
                <Input
                  value={editingCentre.city}
                  onChange={(e) =>
                    setEditingCentre({ ...editingCentre, city: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Phone" required>
                <Input
                  value={editingCentre.phone}
                  onChange={(e) =>
                    setEditingCentre({
                      ...editingCentre,
                      phone: e.target.value,
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="Email">
              <Input
                type="email"
                value={editingCentre.email}
                onChange={(e) =>
                  setEditingCentre({ ...editingCentre, email: e.target.value })
                }
              />
            </FormField>
            <FormField label="Manager">
              <Input
                value={editingCentre.manager}
                onChange={(e) =>
                  setEditingCentre({
                    ...editingCentre,
                    manager: e.target.value,
                  })
                }
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setEditingCentre(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Save Changes
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings Modal */}
      {settingsCentre && (
        <Modal
          title={`${settingsCentre.name} — Settings`}
          onClose={() => setSettingsCentre(null)}
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Notification for Test Approval
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Send email & in-app alerts when tests are ready for approval.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary accent-primary"
                  checked={centreSettings.testApprovalNotif}
                  onChange={(e) =>
                    setCentreSettings({
                      ...centreSettings,
                      testApprovalNotif: e.target.checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Notification for New Order
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Alert phlebotomy and lab techs immediately on new test requests.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary accent-primary"
                  checked={centreSettings.newOrderNotif}
                  onChange={(e) =>
                    setCentreSettings({
                      ...centreSettings,
                      newOrderNotif: e.target.checked,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setSettingsCentre(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setSettingsCentre(null);
                  setAlert(
                    `Centre settings for ${settingsCentre.name} updated.`,
                  );
                }}
              >
                Save Settings
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Request New Branch" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleCreateCentre} className="space-y-4">
            <FormField label="Centre / Branch Name" required>
              <Input
                required
                placeholder="e.g. Ikeja Diagnostic Annex"
                value={newCentre.name}
                onChange={(e) => setNewCentre({ ...newCentre, name: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Branch Code (e.g. IKJ-2)" required>
                <Input
                  required
                  placeholder="e.g. IK2"
                  value={newCentre.code}
                  onChange={(e) => setNewCentre({ ...newCentre, code: e.target.value.toUpperCase() })}
                />
              </FormField>
              <FormField label="City" required>
                <Input
                  required
                  placeholder="e.g. Ikeja, Lagos"
                  value={newCentre.city}
                  onChange={(e) => setNewCentre({ ...newCentre, city: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <Input
                  placeholder="+234 800 XXX XXXX"
                  value={newCentre.phone}
                  onChange={(e) => setNewCentre({ ...newCentre, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  placeholder="ikeja@foundationlab.com"
                  value={newCentre.email}
                  onChange={(e) => setNewCentre({ ...newCentre, email: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Address">
              <Input
                placeholder="15 Allen Avenue, Ikeja"
                value={newCentre.address}
                onChange={(e) => setNewCentre({ ...newCentre, address: e.target.value })}
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setShowAdd(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Submit Branch Request
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN TEST CATALOG
// ============================================================================
const TEST_TYPE_LABELS = { LABORATORY: "Laboratory", RADIOLOGY: "Radiology" };
const blankTestForm = {
  code: "",
  name: "",
  type: "LABORATORY",
  price: "",
  turnaroundHrs: "",
  categoryId: "",
  status: "ACTIVE",
};
const blankCategoryForm = { name: "", description: "", status: "ACTIVE" };

export function TestCatalogScreen() {
  const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
  const [tab, setTab] = useState("tests");
  const [alert, setAlert] = useState(null);

  // Categories — loaded once (single max page); powers both the Categories tab
  // and the category dropdown on the test form. A lab's catalog rarely exceeds
  // the 100-row page cap, so client-side search is sufficient here.
  const [categories, setCategories] = useState([]);
  const loadCategories = () => {
    api
      .listCategories({ limit: 100, sortBy: "name", sortOrder: "asc" })
      .then((res) => setCategories(res?.data?.categories || []))
      .catch(() => {});
  };

  // Tests — server-paginated with search + type/category filters.
  const [tests, setTests] = useState([]);
  const [totalTests, setTotalTests] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const perPage = 10;

  const loadTests = (over = {}) => {
    api
      .listTests({
        page: over.page ?? page,
        limit: perPage,
        search: over.search ?? search,
        type: over.type ?? typeFilter,
        categoryId: over.categoryId ?? catFilter,
      })
      .then((res) => {
        setTests(res?.data?.tests || []);
        setTotalTests(res?.meta?.total || 0);
      })
      .catch(() => setTests([]));
  };

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, catFilter]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTests({ page: 1, search });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Test create/edit modal ────────────────────────────────────────────────
  const [showTest, setShowTest] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testForm, setTestForm] = useState(blankTestForm);
  const [savingTest, setSavingTest] = useState(false);

  const openCreateTest = () => {
    setEditingTestId(null);
    setTestForm(blankTestForm);
    setShowTest(true);
  };
  const openEditTest = (t) => {
    setEditingTestId(t.id);
    setTestForm({
      code: t.code || "",
      name: t.name || "",
      type: t.type || "LABORATORY",
      price: t.price ?? "",
      turnaroundHrs: t.turnaroundHrs ?? "",
      categoryId: t.categoryId || "",
      status: t.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setShowTest(true);
  };

  async function handleSaveTest(e) {
    e.preventDefault();
    if (!testForm.name.trim()) {
      setAlert({ type: "error", msg: "Test name is required." });
      return;
    }
    const priceNum = Number(testForm.price);
    if (testForm.price === "" || Number.isNaN(priceNum) || priceNum < 0) {
      setAlert({ type: "error", msg: "A valid, non-negative price is required." });
      return;
    }
    setSavingTest(true);
    try {
      if (editingTestId) {
        // Code is immutable — the backend update schema does not accept it.
        await api.updateTest(editingTestId, {
          name: testForm.name.trim(),
          type: testForm.type,
          price: priceNum,
          turnaroundHrs:
            testForm.turnaroundHrs === "" ? null : Number(testForm.turnaroundHrs),
          categoryId: testForm.categoryId || null,
          status: testForm.status,
        });
        setAlert({ type: "success", msg: "Test updated successfully." });
      } else {
        if (!testForm.code.trim()) {
          setAlert({ type: "error", msg: "Test code is required." });
          setSavingTest(false);
          return;
        }
        await api.createTest({
          code: testForm.code.trim().toUpperCase(),
          name: testForm.name.trim(),
          type: testForm.type,
          price: priceNum,
          turnaroundHrs:
            testForm.turnaroundHrs === "" ? undefined : Number(testForm.turnaroundHrs),
          categoryId: testForm.categoryId || undefined,
        });
        setAlert({ type: "success", msg: "Test created successfully." });
      }
      setShowTest(false);
      loadTests();
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSavingTest(false);
    }
  }

  async function handleArchiveTest(t) {
    if (
      !window.confirm(
        `Archive "${t.name}"? It will no longer be orderable. Existing orders keep their price snapshot.`,
      )
    )
      return;
    try {
      await api.deleteTest(t.id);
      setAlert({ type: "success", msg: "Test archived." });
      loadTests();
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    }
  }

  // ── Category create/edit modal ──────────────────────────────────────────────
  const [showCat, setShowCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catForm, setCatForm] = useState(blankCategoryForm);
  const [savingCat, setSavingCat] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const openCreateCat = () => {
    setEditingCatId(null);
    setCatForm(blankCategoryForm);
    setShowCat(true);
  };
  const openEditCat = (c) => {
    setEditingCatId(c.id);
    setCatForm({
      name: c.name || "",
      description: c.description || "",
      status: c.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setShowCat(true);
  };

  async function handleSaveCat(e) {
    e.preventDefault();
    if (!catForm.name.trim()) {
      setAlert({ type: "error", msg: "Category name is required." });
      return;
    }
    setSavingCat(true);
    try {
      if (editingCatId) {
        await api.updateCategory(editingCatId, {
          name: catForm.name.trim(),
          description: catForm.description.trim() || undefined,
          status: catForm.status,
        });
        setAlert({ type: "success", msg: "Category updated successfully." });
      } else {
        await api.createCategory({
          name: catForm.name.trim(),
          description: catForm.description.trim() || undefined,
        });
        setAlert({ type: "success", msg: "Category created successfully." });
      }
      setShowCat(false);
      loadCategories();
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSavingCat(false);
    }
  }

  async function handleArchiveCat(c) {
    if (!window.confirm(`Archive category "${c.name}"?`)) return;
    try {
      await api.deleteCategory(c.id);
      setAlert({ type: "success", msg: "Category archived." });
      loadCategories();
    } catch (err) {
      // Backend guards CATEGORY_NOT_EMPTY (can't archive a category with tests)
      // — surface that message plainly rather than swallowing it.
      setAlert({ type: "error", msg: err.message });
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("tests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === "tests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Tests
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === "categories" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Categories
        </button>
      </div>

      {tab === "tests" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-64">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or code…"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setPage(1);
                  setTypeFilter(e.target.value);
                }}
                className="w-40"
              >
                <option value="">All types</option>
                <option value="LABORATORY">Laboratory</option>
                <option value="RADIOLOGY">Radiology</option>
              </Select>
              <Select
                value={catFilter}
                onChange={(e) => {
                  setPage(1);
                  setCatFilter(e.target.value);
                }}
                className="w-48"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Btn variant="primary" size="sm" onClick={openCreateTest}>
              <Plus className="w-3.5 h-3.5" /> New Test
            </Btn>
          </div>

          <Card>
            <Table
              headers={[
                "Code",
                "Name",
                "Type",
                "Category",
                "Price",
                "TAT",
                "Status",
                "Actions",
              ]}
              empty={tests.length === 0}
            >
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary">
                    {t.code}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.type === "RADIOLOGY" ? "info" : "teal"}>
                      {TEST_TYPE_LABELS[t.type] || t.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {t.category?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {naira(t.price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {t.turnaroundHrs ? `${t.turnaroundHrs}h` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(t.status || "active").toLowerCase()} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="sm" onClick={() => openEditTest(t)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveTest(t)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              total={totalTests}
              perPage={perPage}
              onChange={setPage}
            />
          </Card>
        </>
      )}

      {tab === "categories" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="w-64">
              <SearchBar
                value={catSearch}
                onChange={setCatSearch}
                placeholder="Search categories…"
              />
            </div>
            <Btn variant="primary" size="sm" onClick={openCreateCat}>
              <Plus className="w-3.5 h-3.5" /> New Category
            </Btn>
          </div>
          <Card>
            <Table
              headers={["Name", "Description", "Status", "Actions"]}
              empty={filteredCategories.length === 0}
            >
              {filteredCategories.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(c.status || "active").toLowerCase()} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="sm" onClick={() => openEditCat(c)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveCat(c)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* Test modal */}
      {showTest && (
        <Modal
          title={editingTestId ? "Edit Test" : "New Test"}
          onClose={() => setShowTest(false)}
          width="max-w-2xl"
        >
          <form onSubmit={handleSaveTest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Test Code" required>
                <Input
                  required
                  placeholder="e.g. CBC"
                  value={testForm.code}
                  disabled={!!editingTestId}
                  onChange={(e) =>
                    setTestForm({ ...testForm, code: e.target.value.toUpperCase() })
                  }
                />
              </FormField>
              <FormField label="Test Name" required>
                <Input
                  required
                  placeholder="e.g. Complete Blood Count"
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                />
              </FormField>
              <FormField label="Type" required>
                <Select
                  value={testForm.type}
                  onChange={(e) => setTestForm({ ...testForm, type: e.target.value })}
                >
                  <option value="LABORATORY">Laboratory</option>
                  <option value="RADIOLOGY">Radiology</option>
                </Select>
              </FormField>
              <FormField label="Category">
                <Select
                  value={testForm.categoryId}
                  onChange={(e) =>
                    setTestForm({ ...testForm, categoryId: e.target.value })
                  }
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Price (₦)" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={testForm.price}
                  onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                />
              </FormField>
              <FormField label="Turnaround (hours)">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 24"
                  value={testForm.turnaroundHrs}
                  onChange={(e) =>
                    setTestForm({ ...testForm, turnaroundHrs: e.target.value })
                  }
                />
              </FormField>
              {editingTestId && (
                <FormField label="Status">
                  <Select
                    value={testForm.status}
                    onChange={(e) =>
                      setTestForm({ ...testForm, status: e.target.value })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </FormField>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setShowTest(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={savingTest}>
                {savingTest
                  ? "Saving…"
                  : editingTestId
                    ? "Save Changes"
                    : "Create Test"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Category modal */}
      {showCat && (
        <Modal
          title={editingCatId ? "Edit Category" : "New Category"}
          onClose={() => setShowCat(false)}
        >
          <form onSubmit={handleSaveCat} className="space-y-4">
            <FormField label="Category Name" required>
              <Input
                required
                placeholder="e.g. Haematology"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <Input
                placeholder="Optional description"
                value={catForm.description}
                onChange={(e) =>
                  setCatForm({ ...catForm, description: e.target.value })
                }
              />
            </FormField>
            {editingCatId && (
              <FormField label="Status">
                <Select
                  value={catForm.status}
                  onChange={(e) => setCatForm({ ...catForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </FormField>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" onClick={() => setShowCat(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={savingCat}>
                {savingCat
                  ? "Saving…"
                  : editingCatId
                    ? "Save Changes"
                    : "Create Category"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN AUDIT LOGS
// ============================================================================
export function AuditLogsScreen() {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.dashboard()
      .then((res) => {
        if (res?.data?.activity) {
          setLogs(res.data.activity.map((a) => ({
            id: a.id,
            user: a.actorName || "System",
            action: a.action,
            entity: a.entityType || "Record",
            entityId: a.entityId || "—",
            timestamp: a.createdAt ? new Date(a.createdAt).toLocaleString() : "—",
            centre: a.orgName || "Main Lab",
            ip: a.ipAddress || "127.0.0.1",
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = logs.filter((a) => {
    const matchesSearch =
      a.user.toLowerCase().includes(search.toLowerCase()) ||
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.entity.toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      selectedAction === "all" ||
      a.action.toLowerCase().includes(selectedAction.toLowerCase());

    return matchesSearch && matchesAction;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search logs…"
          />
        </div>
        {/* Actions bar filter */}
        <Select
          className="w-40"
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="approved">Approved</option>
          <option value="deleted">Deleted</option>
          <option value="uploaded">Uploaded</option>
        </Select>
      </div>

      <Card>
        <Table
          headers={[
            "User",
            "Action",
            "Entity",
            "Entity ID",
            "Centre",
            "Timestamp",
          ]}
        >
          {filtered.map((a) => (
            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-sm font-medium">{a.user}</td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    a.action === "Created"
                      ? "success"
                      : a.action === "Approved"
                        ? "emerald"
                        : a.action === "Deleted"
                          ? "danger"
                          : a.action === "Uploaded"
                            ? "teal"
                            : "info"
                  }
                >
                  {a.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">{a.entity}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.entityId}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.centre}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.timestamp}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

// ── Settings / Letterhead (Lab Admin) ───────────────────────────────────────
// Branding used to render diagnostic reports: logo (header), an optional
// full-width letterhead image, a signature (footer), plus contact lines and a
// footer note. Images are uploaded through the shared documents endpoint (which
// stamps the caller's organization); the letterhead row only stores their ids.
// Saving is authoritative — whatever the form shows becomes the saved state,
// and cleared slots/fields are sent as null so the backend clears them.
const LETTERHEAD_ASSETS = [
  { key: "logo", label: "Logo", kind: "LOGO", field: "logoDocumentId", hint: "Shown in the report header." },
  { key: "letterhead", label: "Letterhead", kind: "LETTERHEAD", field: "letterheadDocumentId", hint: "Optional full-width header image." },
  { key: "signature", label: "Signature", kind: "SIGNATURE", field: "signatureDocumentId", hint: "Shown in the report footer." },
];

export function LetterheadSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({ footerText: "", address: "", phone: "", email: "" });
  const [docIds, setDocIds] = useState({ logo: null, letterhead: null, signature: null });
  const [previews, setPreviews] = useState({ logo: null, letterhead: null, signature: null });

  // Every blob: URL we mint for a persisted-asset preview is tracked here so we
  // can revoke them on unmount (freshly-picked previews are data: URLs and need
  // no revoking).
  const objectUrls = useRef([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getLetterhead()
      .then(async (res) => {
        const lh = res?.data?.letterhead;
        if (cancelled) return;
        if (!lh) return;
        setForm({
          footerText: lh.footerText || "",
          address: lh.address || "",
          phone: lh.phone || "",
          email: lh.email || "",
        });
        const ids = {
          logo: lh.logoDocumentId || null,
          letterhead: lh.letterheadDocumentId || null,
          signature: lh.signatureDocumentId || null,
        };
        setDocIds(ids);
        // Fetch an inline preview for each persisted asset (best-effort).
        for (const slot of LETTERHEAD_ASSETS) {
          const id = ids[slot.key];
          if (!id) continue;
          try {
            const url = await api.previewDocument(id);
            if (cancelled) {
              URL.revokeObjectURL(url);
              continue;
            }
            objectUrls.current.push(url);
            setPreviews((p) => ({ ...p, [slot.key]: url }));
          } catch {
            /* preview unavailable — the asset is still saved; slot shows a note */
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setAlert({ type: "error", message: err.message || "Failed to load letterhead." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    };
  }, []);

  function handlePickFile(slot, file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      setAlert({ type: "error", message: "Please choose an image file (PNG or JPG)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: "error", message: "Image is too large (maximum 5MB)." });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      setAlert({ type: "error", message: "Could not read the selected file." });
    reader.onload = async () => {
      const dataUrl = reader.result; // data:image/png;base64,…
      setUploadingKey(slot.key);
      try {
        const res = await api.uploadDocument({
          fileName: file.name,
          mimeType: file.type,
          kind: slot.kind,
          data: dataUrl,
        });
        const doc = res?.data?.document;
        if (!doc?.id) throw new Error("upload did not return a document id");
        setDocIds((d) => ({ ...d, [slot.key]: doc.id }));
        // Preview straight from the data URL — no authenticated round-trip
        // needed. Revoke any prior blob: preview for this slot.
        setPreviews((p) => {
          const prev = p[slot.key];
          if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
          return { ...p, [slot.key]: dataUrl };
        });
        setAlert({ type: "success", message: `${slot.label} uploaded. Click Save to apply.` });
      } catch (err) {
        setAlert({ type: "error", message: `Upload failed: ${err.message}` });
      } finally {
        setUploadingKey(null);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemove(slot) {
    setDocIds((d) => ({ ...d, [slot.key]: null }));
    setPreviews((p) => {
      const prev = p[slot.key];
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...p, [slot.key]: null };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Authoritative save: send every field. Empty text and cleared assets go
      // as null so the backend clears them (email "" is also accepted → null).
      const payload = {
        footerText: form.footerText.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        logoDocumentId: docIds.logo || null,
        letterheadDocumentId: docIds.letterhead || null,
        signatureDocumentId: docIds.signature || null,
      };
      await api.updateLetterhead(payload);
      setAlert({ type: "success", message: "Letterhead saved. New reports will use these details." });
    } catch (err) {
      setAlert({ type: "error", message: `Failed to save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-sm text-muted-foreground">Loading letterhead…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Report Letterhead & Branding</h2>
          <p className="text-sm text-muted-foreground">
            These details appear on every diagnostic report your lab generates.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <div className="p-4 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Branding images</h3>
            <p className="text-xs text-muted-foreground">
              PNG or JPG, up to 5MB each. Changes apply when you click Save.
            </p>
          </div>
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            {LETTERHEAD_ASSETS.map((slot) => {
              const preview = previews[slot.key];
              const hasSavedButNoPreview = !preview && docIds[slot.key];
              return (
                <div key={slot.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{slot.label}</span>
                    {docIds[slot.key] && (
                      <button
                        type="button"
                        onClick={() => handleRemove(slot)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="h-28 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {uploadingKey === slot.key ? (
                      <span className="text-xs text-muted-foreground">Uploading…</span>
                    ) : preview ? (
                      <img
                        src={preview}
                        alt={slot.label}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : hasSavedButNoPreview ? (
                      <span className="text-xs text-muted-foreground">Image saved (preview unavailable)</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-xs">No {slot.label.toLowerCase()}</span>
                      </div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {preview || docIds[slot.key] ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === slot.key}
                      onChange={(e) => {
                        handlePickFile(slot, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">{slot.hint}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Contact & footer</h3>
            <p className="text-xs text-muted-foreground">
              Shown alongside your branding on generated reports.
            </p>
          </div>
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Address">
              <Input
                placeholder="Street, City, State"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                placeholder="+234 800 XXX XXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                placeholder="lab@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Footer note">
                <textarea
                  rows={3}
                  placeholder="e.g. Results are confidential. Please consult your physician."
                  value={form.footerText}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors resize-y"
                />
              </FormField>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Btn variant="primary" type="submit" disabled={saving || uploadingKey !== null}>
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Letterhead"}
          </Btn>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from "react";
import { api, invalidateCache } from "../lib/api";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  GitBranch,
  ShieldCheck,
  Plus,
  Eye,
  Edit2,
  Check,
  X,
  Ban,
  RotateCcw,
  CreditCard,
  Clock,
  Loader2,
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

// Money helper — platform figures are stored as plain numbers, not strings.
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Normalize the backend plan catalog (GET /subscriptions/plans) to the flat
// shape these platform screens render. Backend returns
// { key, name, price:{MONTHLY,ANNUAL}, limits:{maxBranches,maxUsers} }.
const mapPlanCatalog = (raw) =>
  (raw || []).map((p) => ({
    id: p.key,
    name: p.name,
    price: p.price?.MONTHLY ?? 0,
    branchLimit: p.limits?.maxBranches ?? 0,
    userLimit: p.limits?.maxUsers ?? 0,
  }));

// ============================================================================
// SUPER ADMIN DASHBOARD
// ============================================================================
export function SuperAdminDashboard({ onNavigate }) {
  const [range, setRange] = useState("6m");
  const [liveData, setLiveData] = useState(null);
  const [liveOrgs, setLiveOrgs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.dashboard()
      .then((res) => {
        if (!cancelled && res?.data?.dashboard) {
          setLiveData(res.data.dashboard);
        }
      })
      .catch(() => {});

    api.listOrganizations()
      .then((res) => {
        if (!cancelled && res?.data?.organizations) {
          setLiveOrgs(res.data.organizations);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (liveData?.stats) {
      const s = liveData.stats;
      const subStats = liveData.subscriptionStats;
      return {
        totalOrgs: s.totalOrgs || 0,
        active: s.activeOrgs || 0,
        trial: s.pendingOrgs || 0,
        suspended: s.suspendedOrgs || 0,
        totalBranches: s.totalBranches || 0,
        totalUsers: s.totalUsers || 0,
        mrr: subStats?.mrr ?? subStats?.totalMrr ?? 0,
        pending: s.pendingBranches || 0,
      };
    }
    return {
      totalOrgs: 0,
      active: 0,
      trial: 0,
      suspended: 0,
      totalBranches: 0,
      totalUsers: 0,
      mrr: 0,
      pending: 0,
    };
  }, [liveData]);

  const growth = useMemo(() => {
    if (!liveData?.growth || liveData.growth.length === 0) return [];
    const currentMrr = liveData?.subscriptionStats?.mrr || 0;
    let cumulativeLabs = 0;
    const data = liveData.growth.map((g) => {
      cumulativeLabs += g.newLabs;
      return {
        month: g.month,
        labs: cumulativeLabs,
        mrr: currentMrr,
      };
    });
    return range === "3m" ? data.slice(-3) : data;
  }, [liveData, range]);

  const planData = useMemo(() => {
    const byPlan = liveData?.subscriptionStats?.byPlan;
    if (!byPlan) return [];
    const formatted = Object.entries(byPlan)
      .map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(),
        value: v || 0,
      }))
      .filter((d) => d.value > 0);
    return formatted.length > 0 ? formatted : [{ name: "Growth", value: 1 }];
  }, [liveData]);

  const orgRevenueData = useMemo(() => {
    if (!liveOrgs || liveOrgs.length === 0) {
      return liveData?.subscriptionStats?.mrr ? [{ name: "FMDL", revenue: liveData.subscriptionStats.mrr }] : [];
    }
    return liveOrgs.map((o) => {
      const sub = o.subscriptions?.[0];
      return {
        name: o.acronym || o.name,
        revenue: sub?.amount ? Number(sub.amount) : 0,
      };
    });
  }, [liveOrgs, liveData]);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Building2}
          label="Total Laboratories"
          value={stats.totalOrgs}
          sub={`${stats.active} active · ${stats.trial} trial`}
          color="bg-blue-500"
        />
        <StatCard
          icon={GitBranch}
          label="Total Branches"
          value={stats.totalBranches}
          sub="Across all tenants"
          color="bg-teal-500"
        />
        <StatCard
          icon={Users}
          label="Platform Users"
          value={stats.totalUsers}
          sub="All roles, all labs"
          color="bg-violet-500"
        />
        <StatCard
          icon={DollarSign}
          label="Monthly Recurring"
          value={naira(stats.mrr)}
          sub="Active subscriptions"
          color="bg-emerald-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={stats.pending}
          sub="Branch requests"
          color="bg-amber-500"
        />
        <StatCard
          icon={Ban}
          label="Suspended Labs"
          value={stats.suspended}
          sub="Access revoked"
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform growth */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Platform Growth — Labs Onboarded & MRR
            </h3>
            <Select
              className="w-28 text-xs py-1"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="6m">Last 6 months</option>
              <option value="3m">Last 3 months</option>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#333333" />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#333333"
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#333333"
                tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}m`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", color: "#000000" }}
                formatter={(v, name) =>
                  name === "MRR" ? naira(v) : `${v} labs`
                }
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#334155" }} />
              <Line
                yAxisId="left"
                name="Labs"
                dataKey="labs"
                stroke="#1a6bcc"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                name="MRR"
                dataKey="mrr"
                stroke="#0ea5a0"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Plan mix */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Subscription Plan Mix
          </h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={planData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                paddingAngle={3}
              >
                {planData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", color: "#000000" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-1">
            {planData.map((d, i) => (
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
                  {d.value} {d.value === 1 ? "lab" : "labs"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by tenant */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Monthly Revenue by Laboratory
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={orgRevenueData}
              barSize={28}
              margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#475569" }}
                stroke="#333333"
              />
              <YAxis
                width={45}
                tick={{ fontSize: 11, fill: "#475569" }}
                stroke="#333333"
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  borderRadius: "8px",
                  borderColor: "#cbd5e1",
                }}
                formatter={(v) => naira(v)}
              />
              <Bar
                name="Monthly revenue"
                dataKey="revenue"
                fill="#1a6bcc"
                radius={[4, 4, 0, 0]}
                minPointSize={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Approvals queue preview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Branch Requests Awaiting Approval
            </h3>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("branch_approvals")}
            >
              View all
            </Btn>
          </div>
          <div className="space-y-3">
            {(liveData?.pendingBranches || []).map((b) => (
              <div
                key={b.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.organization?.name || b.orgName || "Lab"} · requested {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "recently"}
                  </p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
            {(!liveData?.pendingBranches || liveData.pendingBranches.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No branch requests are waiting for review.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// SUPER ADMIN — LABORATORIES (TENANTS)
// ============================================================================
export function LaboratoriesScreen() {
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showOnboard, setShowOnboard] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [viewingOrg, setViewingOrg] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  // Separate from `loading` (the list fetch): guards the onboarding form so a
  // slow create can't be double-submitted into two laboratories.
  const [submitting, setSubmitting] = useState(false);
  const perPage = 8;

  // Form state for onboarding
  const [onboardData, setOnboardData] = useState({
    name: "",
    acronym: "",
    slug: "",
    email: "",
    phone: "",
    plan: "GROWTH",
    billingCycle: "MONTHLY",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const loadOrgs = () => {
    setLoading(true);
    api.listOrganizations()
      .then((res) => {
        if (res?.data?.organizations) {
          const mapped = res.data.organizations.map((o) => {
            const sub = o.subscriptions?.[0];
            return {
              id: o.id,
              name: o.name,
              acronym: o.acronym,
              slug: o.slug,
              email: o.email || "—",
              phone: o.phone || "—",
              status: o.status.toLowerCase(),
              plan: sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1).toLowerCase() : "Growth",
              branches: o._count?.branches ?? 1,
              users: o._count?.users ?? 1,
              patients: o._count?.patients ?? 0,
              monthlyRevenue: sub?.amount ? Number(sub.amount) : 0,
              owner: o.admin ? `${o.admin.firstName} ${o.admin.lastName}` : "—",
              createdAt: o.createdAt?.slice(0, 10),
            };
          });
          setOrgs(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrgs();
    api.subscriptionPlans()
      .then((res) => setPlans(mapPlanCatalog(res?.data?.plans)))
      .catch(() => {});
  }, []);

  const filtered = orgs.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.acronym.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await api.updateOrganization(editingOrg.id, {
        name: editingOrg.name,
        email: editingOrg.email && editingOrg.email !== "—" ? editingOrg.email : undefined,
        phone: editingOrg.phone && editingOrg.phone !== "—" ? editingOrg.phone : undefined,
      });
      setAlert(`${editingOrg.name} updated successfully.`);
      setEditingOrg(null);
      loadOrgs();
    } catch (err) {
      setAlert(`Error: ${err.message}`);
    }
  }

  async function handleToggleStatus() {
    const isSuspended = confirming.status === "suspended";
    try {
      if (isSuspended) {
        await api.activateOrganization(confirming.id);
        setAlert({ type: "success", msg: `${confirming.name} has been reactivated.` });
      } else {
        await api.suspendOrganization(confirming.id, "Platform administrative suspension");
        setAlert({ type: "success", msg: `${confirming.name} has been suspended.` });
      }
      setConfirming(null);
      loadOrgs();
    } catch (err) {
      setAlert({ type: "error", msg: `Error: ${err.message}` });
    }
  }

  async function handleSubmitOnboard(e) {
    e.preventDefault();
    if (submitting) return; // guard: block re-entry while a create is in flight
    try {
      // Validate acronym length & format
      if (!onboardData.acronym || onboardData.acronym.length < 2 || onboardData.acronym.length > 6) {
        setAlert({ type: "error", msg: "Acronym must be between 2 and 6 uppercase characters (e.g. FMDL)." });
        return;
      }

      // Password policy validation if custom password is provided
      const adminPass = onboardData.adminPassword || "AdminLab@12345";
      if (adminPass.length < 10 || !/[A-Z]/.test(adminPass) || !/[a-z]/.test(adminPass) || !/[0-9]/.test(adminPass) || !/[^A-Za-z0-9]/.test(adminPass)) {
        setAlert({ type: "error", msg: "Admin password must be at least 10 characters with an uppercase letter, lowercase letter, number, and special character." });
        return;
      }

      const payload = {
        name: onboardData.name,
        acronym: onboardData.acronym.toUpperCase(),
        slug: onboardData.slug || onboardData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        email: onboardData.email || undefined,
        phone: onboardData.phone || undefined,
        admin: onboardData.adminEmail ? {
          firstName: onboardData.adminFirstName,
          lastName: onboardData.adminLastName,
          email: onboardData.adminEmail,
          password: adminPass,
        } : undefined,
        subscription: {
          plan: onboardData.plan,
          billingCycle: onboardData.billingCycle,
        },
      };

      setSubmitting(true);
      await api.createOrganization(payload);
      setShowOnboard(false);
      setOnboardData({
        name: "",
        acronym: "",
        slug: "",
        email: "",
        phone: "",
        plan: "GROWTH",
        billingCycle: "MONTHLY",
        adminFirstName: "",
        adminLastName: "",
        adminEmail: "",
        adminPassword: "",
      });
      setAlert({ type: "success", msg: `Laboratory ${onboardData.name} onboarded successfully!` });
      loadOrgs();
    } catch (err) {
      setAlert({ type: "error", msg: `Failed to onboard laboratory: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={typeof alert === "object" ? alert.type : "success"}
          message={typeof alert === "object" ? alert.msg : alert}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-80">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search laboratories…"
            />
          </div>
          <Select
            className="w-40"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowOnboard(true)}>
          <Plus className="w-3.5 h-3.5" />
          Onboard Laboratory
        </Btn>
      </div>

      <Card>
        <Table
          headers={[
            "Laboratory",
            "Contact",
            "Plan",
            "Branches",
            "Users",
            "Monthly Revenue",
            "Status",
            "Actions",
          ]}
          empty={filtered.length === 0}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((o) => (
            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {o.acronym}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {o.slug}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.email}
              </td>
              <td className="px-4 py-3">
                <Badge variant="info">{o.plan}</Badge>
              </td>
              <td className="px-4 py-3 text-sm">{o.branches}</td>
              <td className="px-4 py-3 text-sm">{o.users}</td>
              <td className="px-4 py-3 text-sm font-medium">
                {naira(o.monthlyRevenue)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingOrg(o)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOrg({ ...o })}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(o)}
                  >
                    {o.status === "suspended" ? (
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Ban className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={filtered.length}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>

      {/* Onboard a new tenant */}
      {showOnboard && (
        <Modal
          title="Onboard New Laboratory"
          onClose={() => setShowOnboard(false)}
          width="max-w-2xl"
        >
          <form onSubmit={handleSubmitOnboard} className="space-y-4">
            <Alert
              type="info"
              message="Onboarding provisions the laboratory tenant, sets up initial subscription rules, and creates the first Lab Admin account."
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Laboratory Name" required>
                <Input
                  required
                  value={onboardData.name}
                  onChange={(e) => setOnboardData({ ...onboardData, name: e.target.value })}
                  placeholder="e.g. Crestview Diagnostics"
                />
              </FormField>
              <FormField label="Acronym (2-6 chars)" required>
                <Input
                  required
                  maxLength={6}
                  value={onboardData.acronym}
                  onChange={(e) => setOnboardData({ ...onboardData, acronym: e.target.value.toUpperCase() })}
                  placeholder="e.g. CVD"
                />
              </FormField>
              <FormField label="Public Slug" required>
                <Input
                  required
                  value={onboardData.slug}
                  onChange={(e) => setOnboardData({ ...onboardData, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g. crestview-diagnostics"
                />
              </FormField>
              <FormField label="Official Email" required>
                <Input
                  required
                  type="email"
                  value={onboardData.email}
                  onChange={(e) => setOnboardData({ ...onboardData, email: e.target.value })}
                  placeholder="admin@crestviewdx.com"
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={onboardData.phone}
                  onChange={(e) => setOnboardData({ ...onboardData, phone: e.target.value })}
                  placeholder="+234 800 XXX XXXX"
                />
              </FormField>
              <FormField label="Subscription Plan" required>
                <Select
                  value={onboardData.plan}
                  onChange={(e) => setOnboardData({ ...onboardData, plan: e.target.value })}
                >
                  <option value="BASIC">Basic (₦30,000/mo · 1 Branch, 5 Users)</option>
                  <option value="STARTER">Starter (₦75,000/mo · 2 Branches, 15 Users)</option>
                  <option value="GROWTH">Growth (₦180,000/mo · 5 Branches, 50 Users)</option>
                  <option value="ENTERPRISE">Enterprise (₦420,000/mo · 25 Branches, 250 Users)</option>
                </Select>
              </FormField>
              <FormField label="Billing Cycle" required>
                <Select
                  value={onboardData.billingCycle}
                  onChange={(e) => setOnboardData({ ...onboardData, billingCycle: e.target.value })}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </Select>
              </FormField>

              <div className="col-span-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Initial Lab Administrator
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="First Name" required>
                    <Input
                      required
                      value={onboardData.adminFirstName}
                      onChange={(e) => setOnboardData({ ...onboardData, adminFirstName: e.target.value })}
                      placeholder="e.g. Emeka"
                    />
                  </FormField>
                  <FormField label="Last Name" required>
                    <Input
                      required
                      value={onboardData.adminLastName}
                      onChange={(e) => setOnboardData({ ...onboardData, adminLastName: e.target.value })}
                      placeholder="e.g. Nwosu"
                    />
                  </FormField>
                  <FormField label="Admin Email" required>
                    <Input
                      required
                      type="email"
                      value={onboardData.adminEmail}
                      onChange={(e) => setOnboardData({ ...onboardData, adminEmail: e.target.value })}
                      placeholder="owner@crestviewdx.com"
                    />
                  </FormField>
                  <FormField label="Temporary Password" required>
                    <Input
                      required
                      type="password"
                      value={onboardData.adminPassword}
                      onChange={(e) => setOnboardData({ ...onboardData, adminPassword: e.target.value })}
                      placeholder="Password@123"
                    />
                  </FormField>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" type="button" disabled={submitting} onClick={() => setShowOnboard(false)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…
                  </>
                ) : (
                  "Onboard Laboratory"
                )}
              </Btn>
            </div>
          </form>
        </Modal>
      )}


      {/* Tenant detail */}
      {viewingOrg && (
        <Modal
          title={viewingOrg.name}
          onClose={() => setViewingOrg(null)}
          width="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-base font-semibold text-primary">
                  {viewingOrg.acronym}
                </div>
                <div>
                  <p className="text-sm font-semibold">{viewingOrg.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {viewingOrg.slug}
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingOrg.status} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Branches", viewingOrg.branches],
                ["Users", viewingOrg.users],
                ["Patients", (viewingOrg.patients || 0).toLocaleString()],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm pt-1">
              {[
                ["Owner", viewingOrg.owner],
                ["Email", viewingOrg.email],
                ["Phone", viewingOrg.phone],
                ["Country", viewingOrg.country],
                ["Plan", viewingOrg.plan],
                ["Monthly Revenue", naira(viewingOrg.monthlyRevenue)],
                ["Onboarded", viewingOrg.createdAt],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit tenant */}
      {editingOrg && (
        <Modal
          title="Edit Laboratory"
          onClose={() => setEditingOrg(null)}
          width="max-w-xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <FormField label="Laboratory Name" required>
              <Input
                value={editingOrg.name}
                onChange={(e) =>
                  setEditingOrg({ ...editingOrg, name: e.target.value })
                }
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email" required>
                <Input
                  type="email"
                  value={editingOrg.email}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, email: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Phone" required>
                <Input
                  value={editingOrg.phone}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, phone: e.target.value })
                  }
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Owner / Primary Contact">
                <Input
                  value={editingOrg.owner}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, owner: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Subscription Plan" required>
                <Select
                  value={editingOrg.plan}
                  onChange={(e) =>
                    setEditingOrg({ ...editingOrg, plan: e.target.value })
                  }
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setEditingOrg(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Save Changes
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Suspend / reactivate */}
      {confirming && (
        <Modal
          title={
            confirming.status === "suspended"
              ? "Reactivate Laboratory"
              : "Suspend Laboratory"
          }
          onClose={() => setConfirming(null)}
        >
          <div className="space-y-4">
            <Alert
              type={confirming.status === "suspended" ? "info" : "error"}
              message={
                confirming.status === "suspended"
                  ? `${confirming.name} will regain access for all ${confirming.users} of their users.`
                  : `${confirming.name} will be suspended. All ${confirming.users} of their users lose access immediately and their branches go offline.`
              }
            />
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Btn>
              <Btn
                variant={
                  confirming.status === "suspended" ? "primary" : "danger"
                }
                onClick={handleToggleStatus}
              >
                {confirming.status === "suspended"
                  ? "Reactivate"
                  : "Suspend Laboratory"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// SUPER ADMIN — BRANCH APPROVALS
// ============================================================================
export function BranchApprovalsScreen() {
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [alert, setAlert] = useState(null);

  const loadBranches = () => {
    api.listBranches()
      .then((res) => {
        const branches = res?.data?.branches || res?.data?.data || [];
        const mapped = branches.map((b) => ({
          id: b.id,
          orgId: b.organizationId,
          orgName: b.organization?.name || "Laboratory",
          name: b.name,
          code: b.code,
          city: b.address || "Lagos",
          address: b.address || "—",
          phone: b.phone || "—",
          manager: b.manager || "Branch Manager",
          requestedBy: b.createdByUser ? `${b.createdByUser.firstName} ${b.createdByUser.lastName}` : "Lab Admin",
          requestedAt: b.createdAt?.slice(0, 10),
          status: b.status === "PENDING_APPROVAL" ? "pending" : b.status === "ACTIVE" ? "approved" : b.status === "REJECTED" ? "rejected" : b.status.toLowerCase(),
          reason: b.rejectionReason || null,
        }));
        setRequests(mapped);
      })
      .catch(() => setRequests([]));
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const tabs = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  const counts = useMemo(
    () =>
      requests.reduce(
        (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
        {},
      ),
    [requests],
  );

  const filtered = requests.filter(
    (r) =>
      r.status === tab &&
      (r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.orgName.toLowerCase().includes(search.toLowerCase()) ||
        r.city.toLowerCase().includes(search.toLowerCase())),
  );

  async function approve(req) {
    try {
      await api.approveBranch(req.id);
      setReviewing(null);
      setAlert(`${req.name} approved. The branch is now live for ${req.orgName}.`);
      loadBranches();
    } catch (err) {
      setAlert(`Failed to approve branch: ${err.message}`);
    }
  }

  async function reject() {
    try {
      await api.rejectBranch(rejecting.id, reason || "Facility application not met.");
      setAlert(`${rejecting.name} was rejected.`);
      setRejecting(null);
      setReviewing(null);
      setReason("");
      loadBranches();
    } catch (err) {
      setAlert(`Failed to reject branch: ${err.message}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {counts[t.id] ? (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {counts[t.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search requests…"
          />
        </div>
      </div>

      <Card>
        <Table
          headers={[
            "Branch",
            "Laboratory",
            "City",
            "Manager",
            "Requested By",
            "Requested",
            "Status",
            "Actions",
          ]}
          empty={filtered.length === 0}
        >
          {filtered.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {r.code}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {r.orgName}
              </td>
              <td className="px-4 py-3 text-sm">{r.city}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {r.manager}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {r.requestedBy}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {r.requestedAt}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewing(r)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Btn>
                  {r.status === "pending" && (
                    <>
                      <Btn variant="ghost" size="sm" onClick={() => approve(r)}>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejecting(r)}
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </Btn>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Review a request */}
      {reviewing && (
        <Modal
          title={`Branch Request — ${reviewing.code}`}
          onClose={() => setReviewing(null)}
          width="max-w-xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{reviewing.name}</p>
                <p className="text-xs text-muted-foreground">
                  {reviewing.orgName}
                </p>
              </div>
              <StatusBadge status={reviewing.status} />
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Branch Code", reviewing.code],
                ["City", reviewing.city],
                ["Address", reviewing.address],
                ["Phone", reviewing.phone],
                ["Proposed Manager", reviewing.manager],
                ["Requested By", reviewing.requestedBy],
                ["Requested On", reviewing.requestedAt],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4">
                  <span className="text-muted-foreground flex-shrink-0">
                    {k}
                  </span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
            {reviewing.status === "rejected" && reviewing.reason && (
              <Alert type="error" message={`Reason: ${reviewing.reason}`} />
            )}
            {reviewing.status === "pending" && (
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Btn variant="danger" onClick={() => setRejecting(reviewing)}>
                  <X className="w-3.5 h-3.5" /> Reject
                </Btn>
                <Btn variant="primary" onClick={() => approve(reviewing)}>
                  <Check className="w-3.5 h-3.5" /> Approve Branch
                </Btn>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject with a reason */}
      {rejecting && (
        <Modal
          title="Reject Branch Request"
          onClose={() => {
            setRejecting(null);
            setReason("");
          }}
        >
          <div className="space-y-4">
            <Alert
              type="error"
              message={`${rejecting.name} will not be created. ${rejecting.orgName} will see your reason.`}
            />
            <FormField label="Reason for rejection" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Facility licence document is missing."
              />
            </FormField>
            <div className="flex justify-end gap-3">
              <Btn
                variant="secondary"
                onClick={() => {
                  setRejecting(null);
                  setReason("");
                }}
              >
                Cancel
              </Btn>
              <Btn variant="danger" onClick={reject}>
                Reject Request
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// SUPER ADMIN — SUBSCRIPTIONS
// ============================================================================
export function SubscriptionsScreen() {
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [changing, setChanging] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadSubs = () => {
    // Invalidate cached subscription data so we always get fresh figures
    invalidateCache("/subscriptions");
    api.listSubscriptions()
      .then((res) => {
        const subscriptions = res?.data?.subscriptions || res?.data?.data || [];
        const mapped = subscriptions.map((s) => ({
          id: s.id,
          orgId: s.organizationId,
          orgName: s.organization?.name || "Laboratory",
          plan: s.plan,
          amount: Number(s.amount || 0),
          cycle: s.billingCycle === "MONTHLY" ? "Monthly" : "Annual",
          status: s.status.toLowerCase(),
          seats: s.maxUsers || 50,
          seatsUsed: s.seatsUsed || 1,
          startedAt: s.currentPeriodStart?.slice(0, 10) || "—",
          renewsAt: s.currentPeriodEnd?.slice(0, 10) || "—",
        }));
        setSubs(mapped);
      })
      .catch(() => setSubs([]));
  };

  useEffect(() => {
    loadSubs();
    api.subscriptionPlans()
      .then((res) => setPlans(mapPlanCatalog(res?.data?.plans)))
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const active = subs.filter((s) => s.status === "active");
    return {
      mrr: active.reduce((sum, s) => sum + s.amount, 0),
      active: active.length,
      pastDue: subs.filter((s) => s.status === "past_due" || s.status === "expiring_soon").length,
      trial: subs.filter((s) => s.status === "trial").length,
    };
  }, [subs]);

  const filtered = subs.filter(
    (s) =>
      s.orgName.toLowerCase().includes(search.toLowerCase()) ||
      s.plan.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleChangePlan(e) {
    e.preventDefault();
    try {
      const cycleMap = { Monthly: "MONTHLY", Annual: "ANNUAL" };
      await api.updateSubscription(changing.id, {
        plan: changing.plan.toUpperCase(),
        status: changing.status.toUpperCase(),
        billingCycle: cycleMap[changing.cycle] || changing.cycle?.toUpperCase() || "MONTHLY",
        amount: changing.amount !== undefined && changing.amount !== "" ? Number(changing.amount) : undefined,
      });
      setAlert(`${changing.orgName} subscription updated to ${changing.plan}!`);
      setChanging(null);
      loadSubs();
    } catch (err) {
      setAlert(`Failed to update subscription: ${err.message}`);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {alert && (
        <Alert type="success" message={alert} onClose={() => setAlert(null)} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Monthly Recurring"
          value={naira(totals.mrr)}
          sub="From active plans"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Subscriptions"
          value={totals.active}
          sub="Paying tenants"
          color="bg-emerald-500"
        />
        <StatCard
          icon={Clock}
          label="On Trial"
          value={totals.trial}
          sub="Yet to convert"
          color="bg-violet-500"
        />
        <StatCard
          icon={CreditCard}
          label="Past Due"
          value={totals.pastDue}
          sub="Needs follow-up"
          color="bg-amber-500"
        />
      </div>

      <div className="w-80">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search subscriptions…"
        />
      </div>

      <Card>
        <Table
          headers={[
            "Laboratory",
            "Plan",
            "Amount",
            "Cycle",
            "Seats Used",
            "Started",
            "Renews",
            "Status",
            "Actions",
          ]}
          empty={filtered.length === 0}
        >
          {filtered.map((s) => (
            <tr key={s.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-sm font-medium">{s.orgName}</td>
              <td className="px-4 py-3">
                <Badge variant="info">{s.plan}</Badge>
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {s.amount > 0 ? naira(s.amount) : "Free"}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {s.cycle}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{
                        width: `${Math.min((s.seatsUsed / s.seats) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.seatsUsed}/{s.seats}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {s.startedAt}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {s.renewsAt}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => setChanging({ ...s })}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Btn>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Plan catalog */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Plan Catalog</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-border hover:border-primary/40 transition-colors"
            >
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-xl font-semibold text-primary">
                {p.price > 0 ? naira(p.price) : "Free"}
                {p.price > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                )}
              </p>
              <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                <p>Up to {p.branchLimit} branches</p>
                <p>Up to {p.userLimit} users</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Change plan */}
      {changing && (
        <Modal
          title={`Manage Subscription — ${changing.orgName}`}
          onClose={() => setChanging(null)}
        >
          <form onSubmit={handleChangePlan} className="space-y-4">
            <FormField label="Subscription Plan" required>
              <Select
                value={changing.plan}
                onChange={(e) => {
                  const selectedPlan = e.target.value;
                  const planConfig = plans.find((p) => p.name.toLowerCase() === selectedPlan.toLowerCase());
                  const defaultPrice = planConfig ? planConfig.price : changing.amount;
                  setChanging({ ...changing, plan: selectedPlan, amount: defaultPrice });
                }}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                    {p.price > 0 ? ` — ${naira(p.price)}/mo` : " — Free"}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Billing Cycle" required>
                <Select
                  value={changing.cycle || "Monthly"}
                  onChange={(e) =>
                    setChanging({ ...changing, cycle: e.target.value })
                  }
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual</option>
                </Select>
              </FormField>
              <FormField label="Subscription Amount (₦)" required>
                <Input
                  type="number"
                  min="0"
                  value={changing.amount !== undefined ? changing.amount : ""}
                  onChange={(e) =>
                    setChanging({ ...changing, amount: e.target.value })
                  }
                />
              </FormField>
            </div>
            <FormField label="Status" required>
              <Select
                value={changing.status}
                onChange={(e) =>
                  setChanging({ ...changing, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </FormField>
            <Alert
              type="info"
              message="Updating the subscription immediately recalibrates tenant quotas, feature flags, and MRR calculations."
            />
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="secondary" onClick={() => setChanging(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" type="submit">
                Save Subscription
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// SUPER ADMIN — PLATFORM AUDIT LOGS
// ============================================================================
export function PlatformAuditScreen() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [logs, setLogs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    // Fetch a larger set of audit logs (up to 100) for proper pagination
    api.dashboard()
      .then((res) => {
        if (res?.data?.dashboard?.activity) {
          const mapped = res.data.dashboard.activity
            .filter((a) => {
              // Exclude stale/system-generated internal entries that have no
              // meaningful actor or entity — these are hot-refresh artefacts.
              if (!a.action && !a.entityType) return false;
              return true;
            })
            .map((a) => {
              const dateObj = a.createdAt ? new Date(a.createdAt) : null;
              return {
                id: a.id,
                actor: a.actorName || (a.actor ? `${a.actor.firstName || ""} ${a.actor.lastName || ""}`.trim() : "System"),
                action: a.action || "Activity",
                entity: a.entityType || "System",
                entityId: a.entityId ? a.entityId.slice(0, 8) : "—",
                org: a.orgName || a.organization?.name || "Platform",
                ip: a.ipAddress || "127.0.0.1",
                date: dateObj ? dateObj.toLocaleDateString() : "—",
                time: dateObj ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
                _hasLiveEntity: Boolean(a.entityId),
              };
            });
          setLogs(mapped);
        }
      })
      .catch(() => {});

    api.listOrganizations()
      .then((res) => {
        const oList = res?.data?.organizations || res?.data?.data || [];
        setOrgs(oList);
      })
      .catch(() => {});
  }, []);

  const filtered = logs.filter((a) => {
    const matchesSearch =
      a.actor.toLowerCase().includes(search.toLowerCase()) ||
      a.entity.toLowerCase().includes(search.toLowerCase()) ||
      a.org.toLowerCase().includes(search.toLowerCase());
    const matchesAction =
      actionFilter === "all" ||
      a.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesOrg = orgFilter === "all" || a.org === orgFilter;
    return matchesSearch && matchesAction && matchesOrg;
  });

  const actionVariant = {
    Created: "success",
    Approved: "emerald",
    Updated: "info",
    Rejected: "danger",
    Suspended: "danger",
    Deleted: "danger",
    LOGIN: "info",
    LOGIN_FAILED: "danger",
    ORDER_CREATE: "success",
    SAMPLE_COLLECT: "emerald",
    RESULT_CREATE: "info",
    RESULT_APPROVE: "emerald",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search platform logs…"
          />
        </div>
        <Select
          className="w-40"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="APPROVE">Approved</option>
          <option value="REJECT">Rejected</option>
          <option value="SUSPEND">Suspended</option>
          <option value="ACTIVATE">Activated</option>
        </Select>
        <Select
          className="w-56"
          value={orgFilter}
          onChange={(e) => {
            setOrgFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Laboratories</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.name}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table
          headers={[
            "Actor",
            "Action",
            "Entity",
            "Entity ID",
            "Laboratory",
            "IP Address",
            "Date",
            "Time",
          ]}
          empty={filtered.length === 0}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((a) => (
            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{a.actor}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={actionVariant[a.action] || "info"}>
                  {a.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">{a.entity}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.entityId}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.org}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.ip}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {a.date}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {a.time}
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={filtered.length}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}

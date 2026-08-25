import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  Card,
  Table,
  Pagination,
  SearchBar,
  Modal,
  Alert,
  FormField,
  Input,
  Select,
  Btn,
  StatusBadge,
  StatCard,
} from "./UIComponents";
import { api } from "../lib/api";

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// ============================================================================
// RECEPTIONIST DASHBOARD
// ============================================================================
export function ReceptionistDashboard() {
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    // The branch dashboard returns real, formatted recent orders and revenue
    // stats scoped to this receptionist's branch — no separate/derived numbers.
    api.dashboard()
      .then((res) => {
        const dash = res?.data?.dashboard;
        if (dash?.stats) setStats(dash.stats);
        if (Array.isArray(dash?.recentOrders)) setRecentOrders(dash.recentOrders);
      })
      .catch(() => {});
  }, []);

  const monthRevenue = stats?.monthRevenue ?? 0;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;

  const filtered = recentOrders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.patientName || "").toLowerCase().includes(q) ||
      (o.orderCode || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={naira(monthRevenue)}
          sub="This month"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Today's Revenue"
          value={naira(todayRevenue)}
          sub={new Date().toLocaleDateString()}
          color="bg-teal-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={`${pendingOrders}`}
          sub="Awaiting completion"
          color="bg-amber-500"
        />
      </div>
      <div className="w-80">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search recent orders…"
        />
      </div>
      <Card>
        <Table
          headers={[
            "Order",
            "Patient",
            "Tests",
            "Total",
            "Status",
            "Date",
            "Centre",
          ]}
          empty={filtered.length === 0}
        >
          {filtered.map((o) => (
            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {o.orderCode}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{o.patientName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.itemCount}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {naira(o.totalAmount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={(o.status || "").toLowerCase()} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.branchName || "—"}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

// ============================================================================
// RECEPTIONIST PATIENTS
// ============================================================================
export function ReceptionistPatientsScreen() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const perPage = 10;

  // Form state for creating a new patient
  const [createForm, setCreateForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    phone: "", email: "", address: "",
  });
  const [creating, setCreating] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    phone: "", email: "", address: "",
  });

  const loadPatients = (searchTerm, pg) => {
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
        setTotalPatients(res?.meta?.pagination?.total || list.length);
      })
      .catch(() => setPatients([]));
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

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      setAlert({ type: "error", msg: "First name and last name are required." });
      return;
    }
    if (!createForm.gender) {
      setAlert({ type: "error", msg: "Please select the patient's gender." });
      return;
    }
    setCreating(true);
    try {
      const payload = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        gender: createForm.gender,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        address: createForm.address.trim() || undefined,
      };
      if (createForm.dateOfBirth) {
        payload.dateOfBirth = createForm.dateOfBirth;
      }
      await api.createPatient(payload);
      setAlert({ type: "success", msg: "Patient registered successfully." });
      loadPatients();
    } catch (err) {
      setAlert({ type: "error", msg: `Failed to create patient: ${err.message}` });
    } finally {
      setShowCreate(false);
      setCreateForm({ firstName: "", lastName: "", dateOfBirth: "", gender: "", phone: "", email: "", address: "" });
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
      setAlert({ type: "success", msg: "Patient updated successfully." });
      loadPatients();
    } catch (err) {
      setAlert({ type: "error", msg: `Failed to update patient: ${err.message}` });
    } finally {
      setEditingPatient(null);
    }
  }

  function openEditModal(p) {
    setEditForm({
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      dateOfBirth: p.rawDob || "",
      gender: p.gender || "",
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
                  <option value="" disabled>Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
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
              <Btn variant="primary" type="submit" disabled={creating}>
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
                  <option value="" disabled>Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
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

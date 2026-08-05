import React, { useState } from "react";
import {
  Filter,
  Plus,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Printer,
  Download,
  FileText,
  Trash2,
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
  Badge,
  StatCard,
} from "./UIComponents";
import {
  PATIENTS,
  CENTRES,
  TEST_ORDERS,
  TESTS,
  RESULTS,
  PAYMENTS,
} from "./sharedData";

// ============================================================================
// RECEPTIONIST DASHBOARD
// ============================================================================
export function ReceptionistDashboard() {
  const [search, setSearch] = useState("");
  const totalRevenue = PAYMENTS.filter((p) => p.status === "completed").reduce(
    (s, p) => s + p.amount,
    0,
  );
  const filtered = PAYMENTS.filter(
    (p) =>
      p.patientName.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.includes(search),
  );
  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value="₦1,250,000"
          sub="All time"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Today's Revenue"
          value="₦38,200"
          sub="June 14, 2024"
          color="bg-teal-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Payments"
          value={`${PAYMENTS.filter((p) => p.status === "pending").length}`}
          sub="Awaiting settlement"
          color="bg-amber-500"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search payments…"
          />
        </div>
        <Btn variant="secondary" size="sm">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </Btn>
      </div>
      <Card>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Amount",
            "Method",
            "Status",
            "Date",
            "Centre",
            "Actions",
          ]}
        >
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {p.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{p.patientName}</td>
              <td className="px-4 py-3 text-sm font-medium">
                {p.amount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Badge variant="neutral">{p.method}</Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.date}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.centre}
              </td>
              <td className="px-4 py-3">
                <Btn variant="ghost" size="sm">
                  <Eye className="w-3.5 h-3.5" />
                </Btn>
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
export function PatientsScreen({
  onNavigate,
  setSelectedPatient,
  userCentre = "Aguda Lab",
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [alert, setAlert] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const perPage = 10;

  // Filter patients by receptionist center
  const centerPatients = PATIENTS.filter((p) => p.centre === userCentre);
  const filtered = centerPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.pid.includes(search) ||
      p.phone.includes(search),
  );

  function handleCreate() {
    setShowCreate(false);
    setAlert(true);
    setTimeout(() => setAlert(false), 3000);
  }

  function handleEditPatient() {
    setEditingPatient(false);
    setAlert(true);
    settimeout(() => setAlert(false), 3000);
  }

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type="success"
          message="Patient created successfully."
          onClose={() => setAlert(false)}
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
            "Last Visit",
            "Tests",
            "Actions",
          ]}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((p) => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {p.pid}
              </td>
              <td
                className="px-4 py-3 text-sm font-medium cursor-pointer hover:text-primary"
                onClick={() => {
                  setSelectedPatient(p);
                  onNavigate("patient_detail");
                }}
              >
                {p.name}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.dob}
              </td>
              <td className="px-4 py-3 text-sm">{p.gender}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.phone}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {p.lastVisit}
              </td>
              <td className="px-4 py-3 text-sm">{p.tests}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(p);
                      onNavigate("patient_detail");
                    }}
                    className="cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 cursor-pointer" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPatient(p)}
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
          total={filtered.length}
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input placeholder="e.g. Amina" />
            </FormField>
            <FormField label="Last Name" required>
              <Input placeholder="e.g. Hassan" />
            </FormField>
            <FormField label="Date of Birth" required>
              <Input type="date" />
            </FormField>
            <FormField label="Gender" required>
              <Select>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </Select>
            </FormField>
            <FormField label="Phone Number" required>
              <Input placeholder="+254 7XX XXX XXX" />
            </FormField>
            <FormField label="Email">
              <Input type="email" placeholder="patient@email.com" />
            </FormField>
            {/* <FormField label="Centre" required>
              <Select>
                {CENTRES.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField> */}
            <div className="col-span-2">
              <FormField label="Address">
                <Input placeholder="Street, City" />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Btn variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleCreate}>
              Create Patient
            </Btn>
          </div>
        </Modal>
      )}
      {/* Edit Patient Modal */}
      {editingPatient && (
        <Modal
          title="Edit Patient Information"
          onClose={() => setEditingPatient(null)}
          width="max-w-2xl"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input placeholder="e.g. Amina" />
            </FormField>
            <FormField label="Last Name" required>
              <Input placeholder="e.g. Hassan" />
            </FormField>
            <FormField label="Date of Birth" required>
              <Input type="date" />
            </FormField>
            <FormField label="Gender" required>
              <Select>
                <option>Female</option>
                <option>Male</option>
              </Select>
            </FormField>
            <FormField label="Phone Number" required>
              <Input placeholder="+254 7XX XXX XXX" />
            </FormField>
            <FormField label="Email">
              <Input type="email" placeholder="patient@email.com" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Address">
                <Input placeholder="Street, City" />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Btn variant="secondary" onClick={() => setEditingPatient(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleEditPatient}>
              Save Changes
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// RECEPTIONIST PATIENTS DETAILS
// ============================================================================
export function PatientDetailScreen({ patient, onNavigate }) {
  if (!patient)
    return (
      <div className="p-6 text-muted-foreground">No patient selected.</div>
    );
  const orders = TEST_ORDERS.filter((o) => o.patientId === patient.id);
  return (
    <div className="p-6 space-y-5">
      <button
        onClick={() => onNavigate("patients")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Patients
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header: Avatar, Name, PID */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-lg font-semibold text-primary">
                {patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">
                  {patient.name}
                </h2>
                <p className="text-xs font-mono text-muted-foreground">
                  {patient.pid}
                </p>
              </div>
            </div>
            {/* Details List */}
            <div className="space-y-2 text-sm pt-2">
              {[
                ["DOB", patient.dob],
                ["Gender", patient.gender],
                ["Phone", patient.phone],
                ["Email", patient.email],
                ["Centre", patient.centre],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Action Buttons at Bottom */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <Btn
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() =>
                onNavigate("create_order", { patient, startAtStep: 2 })
              }
            >
              <Plus className="w-3 h-3 cursor-pointer" />
              New Order
            </Btn>
            <Btn variant="secondary" size="sm" className="flex-1">
              <Edit2 className="w-3 h-3 cursor-pointer" />
              Edit
            </Btn>
          </div>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Order History</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-primary">
                          {o.orderId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {o.date}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.items.map((item) => (
                          <span
                            key={item.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {item.testName}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-xs font-medium">
                          {o.totalAmount.toLocaleString()}
                        </span>
                        <StatusBadge status={o.paymentStatus} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Results</h3>
            <div className="space-y-2">
              {RESULTS.filter((r) =>
                orders.some((o) => o.orderId === r.orderId),
              ).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded border border-border text-sm"
                >
                  <span>{r.testName}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "ready" && (
                      <Btn variant="ghost" size="sm">
                        <Download className="w-3.5 h-3.5 cursor-pointer" />
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RECEPTIONIST TEST ORDERS
// ============================================================================
export function TestOrdersScreen({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 5;
  const filtered = TEST_ORDERS.filter(
    (o) =>
      o.patientName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderId.includes(search),
  );
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search orders…"
          />
        </div>
        <div className="flex gap-2">
          <Btn
            variant="primary"
            size="sm"
            onClick={() => onNavigate("create_order")}
          >
            <Plus className="w-3.5 h-3.5" />
            New Order
          </Btn>
        </div>
      </div>
      <Card>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Items",
            "Total",
            "Payment",
            "Date",
            "Actions",
          ]}
        >
          {filtered.slice((page - 1) * perPage, page * perPage).map((o) => (
            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {o.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{o.patientName}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {o.items.map((it) => (
                    <StatusBadge key={it.id} status={it.status} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {o.totalAmount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={o.paymentStatus} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.date}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn variant="ghost" size="sm">
                    <Printer className="w-3.5 h-3.5" />
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
    </div>
  );
}

// ============================================================================
// RECEPTIONIST CREATE ORDER
// ============================================================================
export function CreateOrderScreen({
  onNavigate,
  initialPatient,
  startStep = 1,
}) {
  const [step, setStep] = useState(startStep);
  const [selectedPatient, setSelectedPatient] = useState(
    initialPatient || null,
  );
  const [selectedTests, setSelectedTests] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [success, setSuccess] = useState(false);

  function toggleTest(t) {
    setSelectedTests((prev) =>
      prev.some((x) => x.id === t.id)
        ? prev.filter((x) => x.id !== t.id)
        : [...prev, t],
    );
  }

  // Calculate sum as numbers
  const total = selectedTests.reduce((sum, t) => {
    const numericPrice = Number(String(t.price).replace(/[^0-9.-]+/g, "")) || 0;
    return sum + numericPrice;
  }, 0);

  if (success)
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold">Order Created Successfully</h2>
          <p className="text-sm text-muted-foreground">
            Order <span className="font-mono text-primary">ORD-2024-0146</span>
            has been created for <strong>{selectedPatient?.name}</strong>.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
            {selectedTests.map((t) => (
              <div key={t.id} className="flex justify-between">
                <span>{t.name}</span>
                <span>{t.price.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Btn variant="secondary" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </Btn>
            <Btn variant="primary" onClick={() => onNavigate("test_orders")}>
              Done
            </Btn>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm">
        {["Select Patient", "Select Tests", "Payment"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
            >
              {step > i + 1 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <span>{i + 1}</span>
              )}
              {s}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Select Patient</h3>
          <SearchBar
            value={patientSearch}
            onChange={setPatientSearch}
            placeholder="Search by name or ID…"
          />
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {PATIENTS.filter(
              (p) =>
                p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                p.pid.includes(patientSearch),
            ).map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPatient?.id === p.id ? "border-primary bg-secondary" : "border-border hover:bg-muted/50"}`}
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.pid} · {p.phone}
                  </p>
                </div>
                {selectedPatient?.id === p.id && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Btn variant="ghost" size="sm">
              <Plus className="w-3.5 h-3.5" />
              New Patient
            </Btn>
            <Btn
              variant="primary"
              disabled={!selectedPatient}
              onClick={() => setStep(2)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Select Tests</h3>
              <span className="text-xs text-muted-foreground">
                Patient: <strong>{selectedPatient?.name}</strong>
              </span>
            </div>
            <div className="space-y-2">
              {TESTS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTest(t)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedTests.some((x) => x.id === t.id) ? "border-primary bg-secondary" : "border-border hover:bg-muted/30"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTests.some((x) => x.id === t.id) ? "bg-primary border-primary" : "border-border"}`}
                    >
                      {selectedTests.some((x) => x.id === t.id) && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.code} · {t.category} · {t.sampleType} · TAT:{" "}
                        {t.turnaround}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {t.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          {selectedTests.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedTests.length} test
                  {selectedTests.length > 1 ? "s" : ""} selected
                </span>
                <span className="font-semibold">
                  Total: ₦{total.toLocaleString()}
                </span>
              </div>
            </Card>
          )}
          <div className="flex justify-between">
            <Btn variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Btn>
            <Btn
              variant="primary"
              disabled={selectedTests.length === 0}
              onClick={() => setStep(3)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="p-5 space-y-5">
          <h3 className="text-sm font-semibold">Payment Summary</h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            {selectedTests.map((t) => (
              <div key={t.id} className="flex justify-between">
                <span>{t.name}</span>
                <span>{t.price.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-border mt-2">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
          <FormField label="Payment Method">
            <Select>
              <option>Cash</option>
              <option>Card</option>
              <option>Transfer</option>
              <option>Insurance</option>
            </Select>
          </FormField>
          <FormField label="Reference / Receipt No.">
            <Input placeholder="e.g. Transfer reference number" />
          </FormField>
          <FormField label="Amount Received">
            <Input type="number" placeholder={total.toString()} />
          </FormField>
          <div className="flex justify-between pt-2">
            <Btn variant="secondary" onClick={() => setStep(2)}>
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Btn>
            <Btn variant="primary" onClick={() => setSuccess(true)}>
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm & Create Order
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// RECEPTIONIST TEST CATALOG
// ============================================================================
export function TestCatalogScreen() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const filtered = TESTS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.includes(search) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search tests…"
          />
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add Test
        </Btn>
      </div>
      <Card>
        <Table
          headers={[
            "Code",
            "Test Name",
            "Category",
            "Sample Type",
            "Price",
            "TAT",
            "Actions",
          ]}
        >
          {filtered.map((t) => (
            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {t.code}
              </td>
              <td className="px-4 py-3 text-sm font-medium">{t.name}</td>
              <td className="px-4 py-3">
                <Badge variant="info">{t.category}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t.sampleType}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {t.price.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {t.turnaround}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => setShowEdit(t)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn variant="ghost" size="sm">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {(showAdd || showEdit) && (
        <Modal
          title={showEdit ? "Edit Test" : "Add Test"}
          onClose={() => {
            setShowAdd(false);
            setShowEdit(null);
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Test Code" required>
                <Input
                  defaultValue={showEdit?.code}
                  placeholder="e.g. CBC-001"
                />
              </FormField>
              <FormField label="Category" required>
                <Select defaultValue={showEdit?.category}>
                  <option>Haematology</option>
                  <option>Biochemistry</option>
                  <option>Radiology</option>
                  <option>Endocrinology</option>
                  <option>Microbiology</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Test Name" required>
              <Input
                defaultValue={showEdit?.name}
                placeholder="Full test name"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Sample Type">
                <Input
                  defaultValue={showEdit?.sampleType}
                  placeholder="e.g. Serum"
                />
              </FormField>
              <FormField label="Turnaround Time">
                <Input
                  defaultValue={showEdit?.turnaround}
                  placeholder="e.g. 4 hrs"
                />
              </FormField>
              <FormField label="Price (KES)" required>
                <Input
                  type="number"
                  defaultValue={showEdit?.price}
                  placeholder="0"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3">
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowAdd(false);
                  setShowEdit(null);
                }}
              >
                Cancel
              </Btn>
              <Btn variant="primary">Save Test</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// RECEPTIONIST RESULTS
// ============================================================================
// export function ResultsScreen() {
//   const [search, setSearch] = useState("");
//   const [preview, setPreview] = useState(null);
//   const filtered = RESULTS.filter(
//     (r) =>
//       r.patientName.toLowerCase().includes(search.toLowerCase()) ||
//       r.orderId.includes(search),
//   );
//   return (
//     <div className="p-6 space-y-4">
//       <div className="flex items-center justify-between gap-4">
//         <div className="w-80">
//           <SearchBar
//             value={search}
//             onChange={setSearch}
//             placeholder="Search results…"
//           />
//         </div>
//       </div>
//       <Card>
//         <Table
//           headers={[
//             "Order ID",
//             "Patient",
//             "Test",
//             "Date",
//             "Status",
//             "File",
//             "Actions",
//           ]}
//         >
//           {filtered.map((r) => (
//             <tr key={r.id} className="hover:bg-muted/30 transition-colors">
//               <td className="px-4 py-3 font-mono text-xs text-primary">
//                 {r.orderId}
//               </td>
//               <td className="px-4 py-3 text-sm font-medium">{r.patientName}</td>
//               <td className="px-4 py-3 text-sm">{r.testName}</td>
//               <td className="px-4 py-3 text-sm text-muted-foreground">
//                 {r.date}
//               </td>
//               <td className="px-4 py-3">
//                 <StatusBadge status={r.status} />
//               </td>
//               <td className="px-4 py-3">
//                 <Badge variant={r.fileType === "pdf" ? "danger" : "teal"}>
//                   {r.fileType.toUpperCase()}
//                 </Badge>
//               </td>
//               <td className="px-4 py-3">
//                 <div className="flex gap-1">
//                   <Btn variant="ghost" size="sm" onClick={() => setPreview(r)}>
//                     <Eye className="w-3.5 h-3.5" />
//                   </Btn>
//                   <Btn variant="ghost" size="sm">
//                     <Download className="w-3.5 h-3.5" />
//                   </Btn>
//                   <Btn variant="ghost" size="sm">
//                     <Printer className="w-3.5 h-3.5" />
//                   </Btn>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </Table>
//       </Card>
//       {preview && (
//         <Modal
//           title="Result Preview"
//           onClose={() => setPreview(null)}
//           width="max-w-2xl"
//         >
//           <div className="space-y-4">
//             <div className="grid grid-cols-2 gap-3 text-sm">
//               {[
//                 ["Patient", preview.patientName],
//                 ["Order", preview.orderId],
//                 ["Test", preview.testName],
//                 ["Centre", preview.centre],
//                 ["Date", preview.date],
//                 ["Status", preview.status],
//               ].map(([k, v]) => (
//                 <div key={k}>
//                   <p className="text-xs text-muted-foreground">{k}</p>
//                   <p className="font-medium">{v}</p>
//                 </div>
//               ))}
//             </div>
//             <div className="h-48 bg-muted rounded-lg flex items-center justify-center border border-border">
//               <div className="text-center text-muted-foreground">
//                 <FileText className="w-10 h-10 mx-auto mb-2" />
//                 <p className="text-sm">Result document preview</p>
//                 <p className="text-xs mt-1">
//                   {preview.fileType.toUpperCase()} file available for download
//                 </p>
//               </div>
//             </div>
//             <div className="flex gap-3">
//               <Btn variant="primary">
//                 <Download className="w-3.5 h-3.5" />
//                 Download
//               </Btn>
//               <Btn variant="secondary">
//                 <Printer className="w-3.5 h-3.5" />
//                 Print
//               </Btn>
//             </div>
//           </div>
//         </Modal>
//       )}
//     </div>
//   );
// }
export function ReceptionistResultsScreen({ userCentre = "Aguda Lab" }) {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);

  const centerResults = RESULTS.filter((r) => r.centre === userCentre);

  return (
    <div className="p-6 space-y-4">
      <div className="w-80">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search results…"
        />
      </div>
      <Card>
        <Table
          headers={["Order ID", "Patient", "Test", "Date", "Status", "Actions"]}
        >
          {centerResults.map((r) => {
            const displayStatus = r.status === "ready" ? "ready" : "pending";
            return (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-primary">
                  {r.orderId}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {r.patientName}
                </td>
                <td className="px-4 py-3 text-sm">{r.testName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {r.date}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={displayStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreview(r)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Btn>
                    {r.status === "ready" && (
                      <>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Btn>
                        <Btn variant="ghost" size="sm">
                          <Download className="w-3.5 h-3.5" />
                        </Btn>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {preview && (
        <Modal title="Result Information" onClose={() => setPreview(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                <strong>Patient:</strong> {preview.patientName}
              </p>
              <p>
                <strong>Test:</strong> {preview.testName}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {preview.status === "ready"
                  ? "Ready"
                  : "Waiting for result upload (Lab Tech)"}
              </p>
            </div>
            {preview.status === "ready" && (
              <div className="flex gap-3 pt-2">
                <Btn variant="primary" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Btn>
                <Btn variant="secondary">
                  <Download className="w-3.5 h-3.5" /> Download
                </Btn>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  XCircle,
  Trash2,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
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
} from "./UIComponents";
import { api, invalidateCache } from "../lib/api";

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "MOBILE", "WAIVER"];
const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "AWAITING_SAMPLE",
  "SAMPLE_COLLECTED",
  "IN_PROGRESS",
  "RESULT_ENTERED",
  "PENDING_APPROVAL",
  "APPROVED",
  "RELEASED",
  "REJECTED",
  "CANCELLED",
];
// Statuses that no longer accept a cancel action. A completed order is one the
// laboratory has signed off on (APPROVED) or handed to the patient (RELEASED);
// CANCELLED is already terminal. The backend rejects a cancel on any of these
// with 409 ORDER_COMPLETED — this set only keeps the UI in step with that.
const UNCANCELLABLE = new Set(["APPROVED", "RELEASED", "CANCELLED"]);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ============================================================================
// ORDERS
// ============================================================================
export function OrdersScreen() {
  const [alert, setAlert] = useState(null);

  // ── List state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const perPage = 10;

  const loadOrders = (over = {}) => {
    api
      .listOrders({
        page: over.page ?? page,
        limit: perPage,
        search: over.search ?? search,
        status: over.status ?? statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      })
      .then((res) => {
        setOrders(res?.data?.orders || []);
        setTotalOrders(res?.meta?.pagination?.total || 0);
      })
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadOrders({ page: 1, search });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── New-order modal (3-step wizard with inline payment) ──────────────────
  const [showNew, setShowNew] = useState(false);
  const [step, setStep] = useState(1); // 1 = patient, 2 = tests, 3 = payment
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [testSearch, setTestSearch] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [recordNow, setRecordNow] = useState(true);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [payReference, setPayReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cartTotal = cart.reduce((s, t) => s + Number(t.price || 0), 0);

  const resetNew = () => {
    setStep(1);
    setPatientSearch("");
    setPatientResults([]);
    setSelectedPatient(null);
    setTestSearch("");
    setTestResults([]);
    setCart([]);
    setNotes("");
    setRecordNow(true);
    setPayMethod("CASH");
    setPayAmount("");
    setPayReference("");
  };
  const closeNew = () => {
    setShowNew(false);
    resetNew();
  };

  // Debounced patient lookup (only while the modal is open).
  useEffect(() => {
    if (!showNew) return;
    const t = setTimeout(() => {
      api
        .listPatients({ limit: 8, search: patientSearch })
        .then((res) => setPatientResults(res?.data?.patients || []))
        .catch(() => setPatientResults([]));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientSearch, showNew]);

  // Debounced catalog lookup — ACTIVE tests only (the backend rejects others
  // with TEST_UNAVAILABLE, so never let them into the cart).
  useEffect(() => {
    if (!showNew) return;
    const t = setTimeout(() => {
      api
        .listTests({ limit: 10, search: testSearch })
        .then((res) =>
          setTestResults(
            (res?.data?.tests || []).filter((t) => t.status === "ACTIVE"),
          ),
        )
        .catch(() => setTestResults([]));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testSearch, showNew]);

  const addTest = (t) => {
    if (cart.some((c) => c.id === t.id)) return;
    setCart([
      ...cart,
      { id: t.id, code: t.code, name: t.name, price: Number(t.price || 0), type: t.type },
    ]);
  };
  const removeTest = (id) => setCart(cart.filter((c) => c.id !== id));

  async function handleCreateOrder(e) {
    e.preventDefault();
    // The submit control only exists on step 3, but guard anyway so a stray
    // Enter keypress in an earlier step's field can never create the order.
    if (step !== 3) return;
    if (!selectedPatient) {
      setAlert({ type: "error", msg: "Select a patient first." });
      return;
    }
    if (cart.length === 0) {
      setAlert({ type: "error", msg: "Add at least one test to the order." });
      return;
    }
    const amt = payAmount === "" ? cartTotal : Number(payAmount);
    if (recordNow) {
      if (Number.isNaN(amt) || amt <= 0) {
        setAlert({ type: "error", msg: "Enter a valid payment amount." });
        return;
      }
      if (amt > cartTotal) {
        setAlert({ type: "error", msg: "Payment cannot exceed the order total." });
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        patientId: selectedPatient.id,
        testIds: cart.map((c) => c.id),
        notes: notes.trim() || undefined,
      });
      const order = res?.data?.order;
      let msg = `Order ${order?.orderCode || ""} created.`;
      let type = "success";
      if (recordNow && order?.id) {
        try {
          const payRes = await api.createPayment({
            orderId: order.id,
            amount: amt,
            method: payMethod,
            reference: payReference.trim() || undefined,
          });
          const bal = payRes?.data?.order?.balance ?? 0;
          msg =
            bal > 0
              ? `Order ${order.orderCode} created. Payment recorded — outstanding balance ${naira(bal)}.`
              : `Order ${order.orderCode} created and fully paid.`;
        } catch (payErr) {
          // The order was created but the payment failed — say so plainly
          // rather than hiding it; the order is recoverable from the list.
          type = "warning";
          msg = `Order ${order.orderCode} created, but the payment could not be recorded: ${payErr.message}`;
        }
      }
      setAlert({ type, msg });
      closeNew();
      loadOrders();
    } catch (err) {
      // The order itself was not created here (createOrder threw), so it is
      // safe to dismiss and retry. Preserve the wizard state (no resetNew) so
      // reopening restores the patient, cart, and payment entry.
      setShowNew(false);
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Detail modal (view / pay / cancel) ────────────────────────────────────
  const [detail, setDetail] = useState(null);
  const [detailPayments, setDetailPayments] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dPayMethod, setDPayMethod] = useState("CASH");
  const [dPayAmount, setDPayAmount] = useState("");
  const [dPayRef, setDPayRef] = useState("");
  const [payingDetail, setPayingDetail] = useState(false);

  const openDetail = async (orderId) => {
    setLoadingDetail(true);
    try {
      const [oRes, pRes] = await Promise.all([
        api.getOrder(orderId),
        api.listPayments({
          orderId,
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }),
      ]);
      setDetail(oRes?.data?.order || null);
      setDetailPayments(pRes?.data?.payments || []);
      setDPayAmount("");
      setDPayRef("");
      setDPayMethod("CASH");
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setLoadingDetail(false);
    }
  };
  const closeDetail = () => {
    setDetail(null);
    setDetailPayments([]);
  };

  async function handleDetailPayment(e) {
    e.preventDefault();
    if (!detail) return;
    const amt = dPayAmount === "" ? detail.balance : Number(dPayAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setAlert({ type: "error", msg: "Enter a valid payment amount." });
      return;
    }
    if (amt > detail.balance) {
      setAlert({
        type: "error",
        msg: `Amount exceeds the outstanding balance of ${naira(detail.balance)}.`,
      });
      return;
    }
    setPayingDetail(true);
    try {
      await api.createPayment({
        orderId: detail.id,
        amount: amt,
        method: dPayMethod,
        reference: dPayRef.trim() || undefined,
      });
      // A payment shifts the order's balance and its derived status, but the
      // payments mutation only invalidates /payments + /dashboard — clear
      // /orders so the re-read below reflects the new balance/status.
      invalidateCache("/orders");
      setAlert({ type: "success", msg: "Payment recorded." });
      await openDetail(detail.id);
      loadOrders();
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setPayingDetail(false);
    }
  }

  async function handleCancel(order) {
    const reason = window.prompt(
      `Cancel order ${order.orderCode}? Optionally enter a reason:`,
    );
    if (reason === null) return; // aborted the prompt
    try {
      await api.cancelOrder(order.id, reason.trim() || undefined);
      setAlert({ type: "success", msg: `Order ${order.orderCode} cancelled.` });
      if (detail?.id === order.id) await openDetail(order.id);
      loadOrders();
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    }
  }

  const patientLabel = (p) =>
    `${p.firstName} ${p.lastName}${p.patientCode ? ` · ${p.patientCode}` : ""}`;

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by order code…"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="w-52"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
        <Btn variant="primary" size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-3.5 h-3.5" /> New Order
        </Btn>
      </div>

      <Card>
        <Table
          headers={["Order", "Patient", "Tests", "Total", "Status", "Date", "Actions"]}
          empty={orders.length === 0}
        >
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {o.orderCode}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {o.patient
                  ? `${o.patient.firstName} ${o.patient.lastName}`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {o.items?.length || 0}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {naira(o.totalAmount)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={(o.status || "").toLowerCase()} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {fmtDate(o.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => openDetail(o.id)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Btn>
                  {!UNCANCELLABLE.has(o.status) && (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(o)}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={page}
          total={totalOrders}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>

      {/* ── New order + inline payment ── */}
      {showNew && (
        <Modal title="New Order" onClose={closeNew} width="max-w-3xl">
          <form onSubmit={handleCreateOrder} className="space-y-5">
            {/* Progress pills — Select Patient → Select Tests → Payment */}
            <div className="flex items-center gap-2 text-sm">
              {["Select Patient", "Select Tests", "Payment"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      step === i + 1
                        ? "bg-primary text-primary-foreground"
                        : step > i + 1
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                    }`}
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

            {/* Step 1 — Select Patient */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Select Patient</h3>
                {selectedPatient ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-primary bg-secondary">
                    <span className="text-sm font-medium">
                      {patientLabel(selectedPatient)}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline cursor-pointer"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <SearchBar
                      value={patientSearch}
                      onChange={setPatientSearch}
                      placeholder="Search patients by name, code or phone…"
                    />
                    {patientResults.length > 0 && (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {patientResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientResults([]);
                              setPatientSearch("");
                            }}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {p.firstName} {p.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {p.patientCode ? `${p.patientCode} · ` : ""}
                                {p.phone || "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {patientSearch && patientResults.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1">
                        No matching patients. Register the patient first, then
                        create the order.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Btn
                    variant="primary"
                    type="button"
                    disabled={!selectedPatient}
                    onClick={() => setStep(2)}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </div>
            )}

            {/* Step 2 — Select Tests */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Select Tests</h3>
                  <span className="text-xs text-muted-foreground">
                    Patient: <strong>{patientLabel(selectedPatient)}</strong>
                  </span>
                </div>
                <SearchBar
                  value={testSearch}
                  onChange={setTestSearch}
                  placeholder="Search the catalog by name or code…"
                />
                {testResults.length > 0 && (
                  <div className="max-h-52 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {testResults.map((t) => {
                      const inCart = cart.some((c) => c.id === t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={inCart}
                          onClick={() => addTest(t)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary">
                              {t.code}
                            </span>
                            <span>{t.name}</span>
                          </span>
                          <span className="text-muted-foreground">
                            {inCart ? "Added" : naira(t.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {cart.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-primary">
                            {c.code}
                          </span>
                          <span>{c.name}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-medium">{naira(c.price)}</span>
                          <button
                            type="button"
                            onClick={() => removeTest(c.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            aria-label="Remove test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold bg-muted/30">
                      <span>
                        {cart.length} test{cart.length > 1 ? "s" : ""} selected
                      </span>
                      <span>{naira(cartTotal)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between pt-2">
                  <Btn variant="secondary" type="button" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </Btn>
                  <Btn
                    variant="primary"
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => setStep(3)}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </div>
            )}

            {/* Step 3 — Payment */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">Payment Summary</h3>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {cart.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>{c.name}</span>
                      <span className="font-medium">{naira(c.price)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold bg-muted/30">
                    <span>Total</span>
                    <span>{naira(cartTotal)}</span>
                  </div>
                </div>

                {/* Notes */}
                <FormField label="Notes">
                  <Input
                    placeholder="Optional clinical notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>

                {/* Inline payment */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordNow}
                      onChange={(e) => setRecordNow(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    Record payment now
                  </label>
                  {recordNow && (
                    <div className="grid grid-cols-3 gap-3">
                      <FormField label="Method">
                        <Select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {titleCase(m)}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="Amount">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={String(cartTotal || 0)}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Reference">
                        <Input
                          placeholder="Optional"
                          value={payReference}
                          onChange={(e) => setPayReference(e.target.value)}
                        />
                      </FormField>
                    </div>
                  )}
                  {recordNow && (
                    <p className="text-xs text-muted-foreground">
                      Leave the amount blank to charge the full total of{" "}
                      {naira(cartTotal)}. A partial amount keeps the order in
                      “Pending Payment”.
                    </p>
                  )}
                </div>

                <div className="flex justify-between pt-1">
                  <Btn variant="secondary" type="button" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </Btn>
                  <Btn variant="primary" type="submit" disabled={submitting}>
                    {submitting ? (
                      "Saving…"
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm &amp;
                        Create Order
                      </>
                    )}
                  </Btn>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* ── Order detail ── */}
      {(detail || loadingDetail) && (
        <Modal
          title={detail ? `Order ${detail.orderCode}` : "Order"}
          onClose={closeDetail}
          width="max-w-2xl"
        >
          {loadingDetail && !detail ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : detail ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {detail.patient
                      ? `${detail.patient.firstName} ${detail.patient.lastName}`
                      : "—"}
                  </p>
                  {detail.patient?.patientCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {detail.patient.patientCode}
                    </p>
                  )}
                </div>
                <StatusBadge status={(detail.status || "").toLowerCase()} />
              </div>

              {/* Items */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {(detail.items || []).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{it.testName}</span>
                      <Badge variant="neutral">{titleCase(it.status)}</Badge>
                    </span>
                    <span className="font-medium">{naira(it.unitPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Money summary */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">{naira(detail.totalAmount)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-semibold">{naira(detail.amountPaid)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold">{naira(detail.balance)}</p>
                </div>
              </div>

              {detail.notes && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {detail.notes}
                </p>
              )}

              {/* Payment history */}
              {detailPayments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Payments
                  </p>
                  <div className="border border-border rounded-lg divide-y divide-border">
                    {detailPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Badge variant="neutral">{titleCase(p.method)}</Badge>
                          <span className="text-muted-foreground">
                            {fmtDate(p.paidAt || p.createdAt)}
                          </span>
                          {p.reference && (
                            <span className="text-xs text-muted-foreground">
                              · {p.reference}
                            </span>
                          )}
                        </span>
                        <span className="font-medium">{naira(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Record additional payment */}
              {detail.balance > 0 && detail.status !== "CANCELLED" && (
                <form
                  onSubmit={handleDetailPayment}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    Record payment
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Method">
                      <Select
                        value={dPayMethod}
                        onChange={(e) => setDPayMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {titleCase(m)}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Amount">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={String(detail.balance || 0)}
                        value={dPayAmount}
                        onChange={(e) => setDPayAmount(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Reference">
                      <Input
                        placeholder="Optional"
                        value={dPayRef}
                        onChange={(e) => setDPayRef(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <div className="flex justify-end">
                    <Btn variant="primary" size="sm" type="submit" disabled={payingDetail}>
                      {payingDetail ? "Recording…" : "Record Payment"}
                    </Btn>
                  </div>
                </form>
              )}

              <div className="flex justify-end gap-3">
                {!UNCANCELLABLE.has(detail.status) && (
                  <Btn variant="danger" onClick={() => handleCancel(detail)}>
                    <XCircle className="w-4 h-4" /> Cancel Order
                  </Btn>
                )}
                <Btn variant="secondary" onClick={closeDetail}>
                  Close
                </Btn>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// PAYMENTS
// ============================================================================
export function PaymentsScreen() {
  const [alert, setAlert] = useState(null);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // orderId → { orderCode, patient } resolved lazily for the visible page,
  // since the payments list endpoint carries only the raw orderId.
  const [orderMap, setOrderMap] = useState({});
  const perPage = 15;

  const loadPayments = (over = {}) => {
    api
      .listPayments({
        page: over.page ?? page,
        limit: perPage,
        method: over.method ?? methodFilter,
        status: over.status ?? statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      })
      .then(async (res) => {
        const list = res?.data?.payments || [];
        setPayments(list);
        setTotal(res?.meta?.pagination?.total || 0);
        const unknown = [...new Set(list.map((p) => p.orderId))].filter(
          (id) => id && !orderMap[id],
        );
        if (unknown.length) {
          const resolved = await Promise.all(
            unknown.map((id) =>
              api
                .getOrder(id)
                .then((r) => r?.data?.order)
                .catch(() => null),
            ),
          );
          setOrderMap((prev) => {
            const next = { ...prev };
            resolved.forEach((o) => {
              if (o) next[o.id] = { orderCode: o.orderCode, patient: o.patient };
            });
            return next;
          });
        }
      })
      .catch(() => setPayments([]));
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, methodFilter, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "info"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={methodFilter}
          onChange={(e) => {
            setPage(1);
            setMethodFilter(e.target.value);
          }}
          className="w-44"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          {["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table
          headers={[
            "Date",
            "Order",
            "Patient",
            "Amount",
            "Method",
            "Reference",
            "Status",
          ]}
          empty={payments.length === 0}
        >
          {payments.map((p) => {
            const o = orderMap[p.orderId];
            return (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {fmtDate(p.paidAt || p.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-primary">
                  {o?.orderCode || "—"}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {o?.patient
                    ? `${o.patient.firstName} ${o.patient.lastName}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {naira(p.amount)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{titleCase(p.method)}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {p.reference || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={(p.status || "").toLowerCase()} />
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={page}
          total={total}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}

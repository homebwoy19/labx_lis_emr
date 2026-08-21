import React, { useState, useEffect } from "react";
import { Eye, CheckCircle2, XCircle, Download, Send, Save, FileText } from "lucide-react";
import {
  Card,
  Table,
  Pagination,
  SearchBar,
  Modal,
  Alert,
  Select,
  Btn,
  StatusBadge,
  Badge,
} from "./UIComponents";
import { api, invalidateCache } from "../lib/api";

// Order statuses that sit on the results pipeline (something has been, or is
// about to be, entered/approved). Payment/sample-only statuses are excluded
// because there is nothing to review there.
const REVIEW_STATUSES = [
  "PENDING_APPROVAL",
  "RESULT_ENTERED",
  "IN_PROGRESS",
  "APPROVED",
  "RELEASED",
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Result.data is a free-form JSON payload written by the bench roles. Show the
// clinically meaningful entries and drop internal/duplicate metadata so the
// reviewer sees exactly what was recorded — nothing invented, nothing noisy.
const DATA_NOISE_KEYS = new Set([
  "ordercode",
  "timestamp",
  "enteredby",
  "reportedby",
  "testname",
]);
function dataEntries(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.entries(data)
    .filter(
      ([k, v]) =>
        v != null && v !== "" && !DATA_NOISE_KEYS.has(String(k).toLowerCase()),
    )
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

// ============================================================================
// RESULTS & APPROVAL (Lab Admin)
// ----------------------------------------------------------------------------
// Order-centric approval workflow. Results carry no patient/order/test labels
// of their own (RESULT_SELECT is orderId/orderItemId + status + data), and both
// release and the PDF are per-order — so the natural unit of review is the
// order: open one, approve/reject each entered result, then release the fully
// approved order and download its report. Every action maps 1:1 to an existing,
// permission-guarded endpoint (RESULT_APPROVE / RESULT_REJECT / RESULT_RELEASE
// / RESULT_READ), all of which the Lab Admin holds.
// ============================================================================
export function ResultsScreen() {
  const [alert, setAlert] = useState(null);

  // ── List state ────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  // Default to the admin's primary queue: orders whose results are all entered
  // and awaiting approval.
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
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
        setTotalOrders(res?.meta?.total || 0);
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

  // ── Review modal ──────────────────────────────────────────────────────────
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailResults, setDetailResults] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actioningId, setActioningId] = useState(null); // result id mid-request
  const [releasing, setReleasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(null); // documentId mid-download

  // Fetch an order together with its results. Used both to open the modal and
  // to refresh it after an action. Callers that follow a mutation must first
  // invalidate the /orders cache (see the action handlers) — approve/reject/
  // release only auto-invalidate /results, so the order roll-up would otherwise
  // read stale.
  const fetchReview = async (orderId) => {
    const [oRes, rRes] = await Promise.all([
      api.getOrder(orderId),
      api.listResults({ orderId, limit: 100, sortBy: "createdAt", sortOrder: "asc" }),
    ]);
    setDetailOrder(oRes?.data?.order || null);
    setDetailResults(rRes?.data?.results || []);
  };

  const openReview = async (orderId) => {
    setLoadingDetail(true);
    try {
      await fetchReview(orderId);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setLoadingDetail(false);
    }
  };
  const closeReview = () => {
    setDetailOrder(null);
    setDetailResults([]);
  };

  // Refresh both the open modal and the underlying list after a state change.
  // The order status is derived server-side from item/result state, so we must
  // clear the /orders cache to see the new roll-up (the results mutation only
  // invalidated /results + /dashboard).
  const refreshAfterAction = async (orderId) => {
    invalidateCache("/orders");
    await fetchReview(orderId);
    loadOrders();
  };

  async function handleApprove(result) {
    setActioningId(result.id);
    try {
      await api.approveResult(result.id);
      setAlert({ type: "success", msg: "Result approved." });
      await refreshAfterAction(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(result) {
    const reason = window.prompt(
      "Reject this result and send it back for correction. Enter a reason:",
    );
    if (reason === null) return; // aborted
    if (!reason.trim()) {
      setAlert({ type: "error", msg: "A rejection reason is required." });
      return;
    }
    setActioningId(result.id);
    try {
      await api.rejectResult(result.id, reason.trim());
      setAlert({ type: "success", msg: "Result rejected and sent back for correction." });
      await refreshAfterAction(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setActioningId(null);
    }
  }

  async function handleRelease() {
    if (!detailOrder) return;
    setReleasing(true);
    try {
      await api.releaseOrder(detailOrder.id);
      setAlert({
        type: "success",
        msg: `Order ${detailOrder.orderCode} released to the patient.`,
      });
      await refreshAfterAction(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setReleasing(false);
    }
  }

  async function handleDownload() {
    if (!detailOrder) return;
    setDownloading(true);
    try {
      await api.downloadOrderPdf(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: `Could not download the report: ${err.message}` });
    } finally {
      setDownloading(false);
    }
  }

  // Email the approved report to the patient's registered address. The backend
  // rejects this unless the order is approved/released and the patient has an
  // email on file, and reports whether SMTP is actually configured.
  async function handleSend() {
    if (!detailOrder) return;
    setSending(true);
    try {
      const res = await api.sendOrderReport(detailOrder.id);
      const data = res?.data || {};
      if (data.emailConfigured) {
        setAlert({ type: "success", msg: `Report sent to ${data.to}.` });
      } else {
        setAlert({
          type: "info",
          msg: "Email delivery is not configured on this server, so nothing was sent. The report was logged.",
        });
      }
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSending(false);
    }
  }

  // Download the file a bench user attached to a result (the stored Document).
  async function handleDownloadAttachment(documentId) {
    setDownloadingDoc(documentId);
    try {
      await api.downloadDocument(documentId);
    } catch (err) {
      setAlert({ type: "error", msg: `Could not download the attachment: ${err.message}` });
    } finally {
      setDownloadingDoc(null);
    }
  }

  // Join results to their order item so each test row shows its own result.
  const resultByItem = new Map(detailResults.map((r) => [r.orderItemId, r]));

  const canRelease = detailOrder?.status === "APPROVED";
  const canDownload =
    detailOrder && ["APPROVED", "RELEASED"].includes(detailOrder.status);

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

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
          <option value="">All (in review)</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table
          headers={["Order", "Patient", "Progress", "Status", "Date", "Actions"]}
          empty={orders.length === 0}
        >
          {orders.map((o) => {
            const items = o.items || [];
            const approved = items.filter((it) => it.status === "APPROVED").length;
            return (
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
                  {items.length > 0 ? `${approved}/${items.length} approved` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={(o.status || "").toLowerCase()} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {fmtDate(o.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Btn variant="ghost" size="sm" onClick={() => openReview(o.id)}>
                    <Eye className="w-3.5 h-3.5" /> Review
                  </Btn>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={page}
          total={totalOrders}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>

      {/* ── Review / approval modal ── */}
      {(detailOrder || loadingDetail) && (
        <Modal
          title={detailOrder ? `Results · ${detailOrder.orderCode}` : "Results"}
          onClose={closeReview}
          width="max-w-2xl"
        >
          {loadingDetail && !detailOrder ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : detailOrder ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {detailOrder.patient
                      ? `${detailOrder.patient.firstName} ${detailOrder.patient.lastName}`
                      : "—"}
                  </p>
                  {detailOrder.patient?.patientCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {detailOrder.patient.patientCode}
                    </p>
                  )}
                </div>
                <StatusBadge status={(detailOrder.status || "").toLowerCase()} />
              </div>

              {/* Per-test results */}
              <div className="space-y-3">
                {(detailOrder.items || []).map((item) => {
                  const r = resultByItem.get(item.id);
                  const entries = r ? dataEntries(r.data) : [];
                  return (
                    <div
                      key={item.id}
                      className="border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{item.testName}</span>
                        {r ? (
                          <StatusBadge status={(r.status || "").toLowerCase()} />
                        ) : (
                          <Badge variant="neutral">Awaiting entry</Badge>
                        )}
                      </div>

                      {r ? (
                        <>
                          {r.interpretation && (
                            <p className="text-sm">
                              <span className="font-medium">Interpretation: </span>
                              {r.interpretation}
                            </p>
                          )}
                          {entries.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {entries.map(([k, v]) => (
                                <div key={k}>
                                  <span className="font-medium text-foreground">
                                    {titleCase(k)}:{" "}
                                  </span>
                                  {v}
                                </div>
                              ))}
                            </div>
                          )}
                          {r.documentId && (
                            <Btn
                              variant="secondary"
                              size="sm"
                              disabled={downloadingDoc === r.documentId}
                              onClick={() => handleDownloadAttachment(r.documentId)}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {downloadingDoc === r.documentId
                                ? "Preparing…"
                                : "Attachment"}
                            </Btn>
                          )}
                          {r.status === "REJECTED" && r.rejectionReason && (
                            <p className="text-xs text-red-600">
                              <span className="font-medium">Rejection reason: </span>
                              {r.rejectionReason}
                            </p>
                          )}
                          {r.preparedReport && (
                            <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 p-2.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Prepared report (front desk)
                              </p>
                              <p className="text-sm whitespace-pre-wrap mt-1">{r.preparedReport}</p>
                            </div>
                          )}
                          {r.status === "PENDING_APPROVAL" && (
                            <div className="flex gap-2 pt-1">
                              <Btn
                                variant="primary"
                                size="sm"
                                disabled={actioningId === r.id}
                                onClick={() => handleApprove(r)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {actioningId === r.id ? "Working…" : "Approve"}
                              </Btn>
                              <Btn
                                variant="danger"
                                size="sm"
                                disabled={actioningId === r.id}
                                onClick={() => handleReject(r)}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Btn>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No result has been entered for this test yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {canRelease && (
                <p className="text-xs text-muted-foreground">
                  All results are approved. Release the order to make its report
                  available to the patient.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                {canDownload && (
                  <Btn
                    variant="secondary"
                    disabled={downloading}
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4" />
                    {downloading ? "Preparing…" : "Download Report"}
                  </Btn>
                )}
                {canDownload && (
                  <Btn
                    variant="secondary"
                    disabled={sending}
                    onClick={handleSend}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Sending…" : "Send to Patient"}
                  </Btn>
                )}
                {canRelease && (
                  <Btn
                    variant="primary"
                    disabled={releasing}
                    onClick={handleRelease}
                  >
                    <Send className="w-4 h-4" />
                    {releasing ? "Releasing…" : "Release to Patient"}
                  </Btn>
                )}
                <Btn variant="secondary" onClick={closeReview}>
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
// RESULTS (Receptionist / Front Desk)
// ----------------------------------------------------------------------------
// The front desk prepares the narrative report onto the lab letterhead and
// submits it to the Lab Admin for approval — it CANNOT approve or reject
// (those stay with the Lab Admin, enforced server-side by permissions). The
// technician/radiographer's original entry is shown read-only so the front desk
// transcribes from it without ever overwriting it (the audit trail of who
// entered/uploaded each result is preserved). Once the Lab Admin approves, the
// front desk can print the report or email it to the patient.
// ============================================================================
export function ReceptionistResultsScreen() {
  const [alert, setAlert] = useState(null);

  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  // Orders whose results have been entered are the front desk's queue to
  // prepare/submit; they can also switch to approved/released to print or send.
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");
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
        setTotalOrders(res?.meta?.total || 0);
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

  // ── Prepare modal ──────────────────────────────────────────────────────────
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailResults, setDetailResults] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Draft narrative text keyed by result id (the front desk's in-progress edits).
  const [reports, setReports] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(null);

  const fetchReview = async (orderId) => {
    const [oRes, rRes] = await Promise.all([
      api.getOrder(orderId),
      api.listResults({ orderId, limit: 100, sortBy: "createdAt", sortOrder: "asc" }),
    ]);
    const order = oRes?.data?.order || null;
    const results = rRes?.data?.results || [];
    setDetailOrder(order);
    setDetailResults(results);
    // Seed the editors from any previously-prepared text.
    setReports(
      results.reduce((acc, r) => {
        acc[r.id] = r.preparedReport || "";
        return acc;
      }, {}),
    );
  };

  const openReview = async (orderId) => {
    setLoadingDetail(true);
    try {
      await fetchReview(orderId);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setLoadingDetail(false);
    }
  };
  const closeReview = () => {
    setDetailOrder(null);
    setDetailResults([]);
    setReports({});
  };

  const refreshAfterAction = async (orderId) => {
    invalidateCache("/orders");
    await fetchReview(orderId);
    loadOrders();
  };

  // Save one test's narrative without submitting (stays DRAFT).
  async function handleSaveDraft(result) {
    setSavingId(result.id);
    try {
      await api.prepareResult(result.id, {
        preparedReport: reports[result.id] ?? "",
        submit: false,
      });
      setAlert({ type: "success", msg: "Report saved." });
      await refreshAfterAction(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSavingId(null);
    }
  }

  // Submit every still-DRAFT result in the order to the Lab Admin, carrying each
  // one's current narrative text. Approval remains a Lab Admin action.
  async function handleSubmitAll() {
    if (!detailOrder) return;
    const drafts = detailResults.filter((r) => r.status === "DRAFT");
    if (drafts.length === 0) {
      setAlert({ type: "info", msg: "There are no draft results to submit." });
      return;
    }
    setSubmitting(true);
    try {
      for (const r of drafts) {
        // eslint-disable-next-line no-await-in-loop
        await api.prepareResult(r.id, {
          preparedReport: reports[r.id] ?? r.preparedReport ?? "",
          submit: true,
        });
      }
      setAlert({
        type: "success",
        msg: `Submitted ${drafts.length} report${drafts.length > 1 ? "s" : ""} to the Lab Admin for approval.`,
      });
      await refreshAfterAction(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!detailOrder) return;
    setDownloading(true);
    try {
      await api.downloadOrderPdf(detailOrder.id);
    } catch (err) {
      setAlert({ type: "error", msg: `Could not download the report: ${err.message}` });
    } finally {
      setDownloading(false);
    }
  }

  async function handleSend() {
    if (!detailOrder) return;
    setSending(true);
    try {
      const res = await api.sendOrderReport(detailOrder.id);
      const data = res?.data || {};
      if (data.emailConfigured) {
        setAlert({ type: "success", msg: `Report sent to ${data.to}.` });
      } else {
        setAlert({
          type: "info",
          msg: "Email delivery is not configured on this server, so nothing was sent. The report was logged.",
        });
      }
    } catch (err) {
      setAlert({ type: "error", msg: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadAttachment(documentId) {
    setDownloadingDoc(documentId);
    try {
      await api.downloadDocument(documentId);
    } catch (err) {
      setAlert({ type: "error", msg: `Could not download the attachment: ${err.message}` });
    } finally {
      setDownloadingDoc(null);
    }
  }

  const resultByItem = new Map(detailResults.map((r) => [r.orderItemId, r]));
  const hasDrafts = detailResults.some((r) => r.status === "DRAFT");
  const canDownload =
    detailOrder && ["APPROVED", "RELEASED"].includes(detailOrder.status);

  return (
    <div className="p-6 space-y-4">
      {alert && (
        <Alert
          type={alert.type || "success"}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

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
          <option value="">All (in review)</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table
          headers={["Order", "Patient", "Progress", "Status", "Date", "Actions"]}
          empty={orders.length === 0}
        >
          {orders.map((o) => {
            const items = o.items || [];
            const approved = items.filter((it) => it.status === "APPROVED").length;
            return (
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
                  {items.length > 0 ? `${approved}/${items.length} approved` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={(o.status || "").toLowerCase()} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {fmtDate(o.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Btn variant="ghost" size="sm" onClick={() => openReview(o.id)}>
                    <Eye className="w-3.5 h-3.5" /> Open
                  </Btn>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={page}
          total={totalOrders}
          perPage={perPage}
          onChange={setPage}
        />
      </Card>

      {/* ── Prepare / send modal ── */}
      {(detailOrder || loadingDetail) && (
        <Modal
          title={detailOrder ? `Report · ${detailOrder.orderCode}` : "Report"}
          onClose={closeReview}
          width="max-w-2xl"
        >
          {loadingDetail && !detailOrder ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : detailOrder ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {detailOrder.patient
                      ? `${detailOrder.patient.firstName} ${detailOrder.patient.lastName}`
                      : "—"}
                  </p>
                  {detailOrder.patient?.patientCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {detailOrder.patient.patientCode}
                    </p>
                  )}
                </div>
                <StatusBadge status={(detailOrder.status || "").toLowerCase()} />
              </div>

              <p className="text-xs text-muted-foreground">
                Transcribe the laboratory's findings into the report below and
                submit it to the Lab Admin. Approval is done by the Lab Admin —
                the front desk prepares and sends, but does not approve.
              </p>

              {/* Per-test: technician entry (read-only) + narrative editor */}
              <div className="space-y-3">
                {(detailOrder.items || []).map((item) => {
                  const r = resultByItem.get(item.id);
                  const entries = r ? dataEntries(r.data) : [];
                  const editable = r && r.status === "DRAFT";
                  return (
                    <div
                      key={item.id}
                      className="border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{item.testName}</span>
                        {r ? (
                          <StatusBadge status={(r.status || "").toLowerCase()} />
                        ) : (
                          <Badge variant="neutral">Awaiting entry</Badge>
                        )}
                      </div>

                      {r ? (
                        <>
                          {/* Original bench entry — read-only source, never edited here */}
                          {(r.interpretation || entries.length > 0 || r.documentId) && (
                            <div className="rounded-md bg-muted/40 p-2.5 space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Laboratory entry
                              </p>
                              {r.interpretation && (
                                <p className="text-sm">
                                  <span className="font-medium">Interpretation: </span>
                                  {r.interpretation}
                                </p>
                              )}
                              {entries.length > 0 && (
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  {entries.map(([k, v]) => (
                                    <div key={k}>
                                      <span className="font-medium text-foreground">
                                        {titleCase(k)}:{" "}
                                      </span>
                                      {v}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {r.documentId && (
                                <Btn
                                  variant="secondary"
                                  size="sm"
                                  disabled={downloadingDoc === r.documentId}
                                  onClick={() => handleDownloadAttachment(r.documentId)}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {downloadingDoc === r.documentId
                                    ? "Preparing…"
                                    : "View upload"}
                                </Btn>
                              )}
                            </div>
                          )}

                          {r.status === "REJECTED" && (
                            <p className="text-xs text-red-600">
                              {r.rejectionReason
                                ? `Returned by the Lab Admin: ${r.rejectionReason}. `
                                : "Returned by the Lab Admin. "}
                              The laboratory must re-enter this result.
                            </p>
                          )}

                          {/* Narrative editor (DRAFT) or read-only prepared text */}
                          {editable ? (
                            <div className="space-y-2">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Report narrative
                              </label>
                              <textarea
                                value={reports[r.id] ?? ""}
                                onChange={(e) =>
                                  setReports((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                                rows={4}
                                placeholder="Type the report as it should appear on the letterhead…"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                              />
                              <div className="flex justify-end">
                                <Btn
                                  variant="secondary"
                                  size="sm"
                                  disabled={savingId === r.id}
                                  onClick={() => handleSaveDraft(r)}
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {savingId === r.id ? "Saving…" : "Save draft"}
                                </Btn>
                              </div>
                            </div>
                          ) : (
                            r.preparedReport && (
                              <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 p-2.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                  Prepared report
                                  {r.status === "PENDING_APPROVAL"
                                    ? " · awaiting Lab Admin approval"
                                    : r.status === "APPROVED"
                                      ? " · approved"
                                      : ""}
                                </p>
                                <p className="text-sm whitespace-pre-wrap mt-1">
                                  {r.preparedReport}
                                </p>
                              </div>
                            )
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No result has been entered for this test yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                {canDownload && (
                  <Btn variant="secondary" disabled={downloading} onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    {downloading ? "Preparing…" : "Print / Download"}
                  </Btn>
                )}
                {canDownload && (
                  <Btn variant="secondary" disabled={sending} onClick={handleSend}>
                    <Send className="w-4 h-4" />
                    {sending ? "Sending…" : "Send to Patient"}
                  </Btn>
                )}
                {hasDrafts && (
                  <Btn variant="primary" disabled={submitting} onClick={handleSubmitAll}>
                    <Send className="w-4 h-4" />
                    {submitting ? "Submitting…" : "Submit to Lab Admin"}
                  </Btn>
                )}
                <Btn variant="secondary" onClick={closeReview}>
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

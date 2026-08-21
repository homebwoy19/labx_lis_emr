import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./result.repository.js";
import * as orderRepo from "../orders/order.repository.js";
import { recalcOrderStatus } from "../orders/order.service.js";

/**
 * Result service — structured/uploaded result entry and the approval workflow.
 *
 * Flow per order item (result status), mirroring the real lab process:
 *   enter   (scientist/radiographer) → result DRAFT,            item RESULT_ENTERED
 *   prepare (receptionist, save)     → result DRAFT (report typed onto letterhead)
 *   prepare (receptionist, submit)   → result PENDING_APPROVAL  (sent to Lab Admin)
 *   approve (Lab Admin)              → result APPROVED,          item APPROVED
 *   reject  (Lab Admin)              → result REJECTED,          item IN_PROGRESS (redo)
 * Releasing an order stamps every approved result as released and moves the
 * order to RELEASED (terminal). Each transition re-rolls the parent order status.
 *
 * The receptionist's prepared narrative is stored in preparedReport/preparedBy/
 * preparedAt and NEVER overwrites the technician's raw entry (data/interpretation/
 * documentId/enteredBy/enteredAt), so the audit trail of who entered or uploaded
 * each original result is preserved. Approval is a Lab Admin capability only —
 * the receptionist prepares and submits but cannot approve.
 */

// Order states in which results cannot be entered.
const ORDER_LOCKED = new Set(["PENDING_PAYMENT", "CANCELLED", "RELEASED"]);

// An order's report (PDF / email) is only available once the Lab Admin has
// approved it (or it has been released to the patient).
const REPORT_READY = new Set(["APPROVED", "RELEASED"]);

/**
 * Resolves an order item and its (tenant-checked) parent order. Because
 * TestOrderItem carries no tenant columns, we prove tenancy by loading the order
 * through the scoped client — a foreign order resolves to null → 404.
 */
async function resolveItemAndOrder(db, orderItemId) {
  const item = await orderRepo.findItemById(db, orderItemId);
  if (!item) throw ApiError.notFound("Order item not found", { code: "ORDER_ITEM_NOT_FOUND" });
  const order = await orderRepo.findById(db, item.orderId);
  if (!order) throw ApiError.notFound("Order not found", { code: "ORDER_NOT_FOUND" });
  return { item, order };
}

export async function enterResult(db, input, auth, reqContext) {
  const { item, order } = await resolveItemAndOrder(db, input.orderItemId);

  if (ORDER_LOCKED.has(order.status)) {
    throw ApiError.conflict(`Results cannot be entered while the order is ${order.status.toLowerCase()}`, {
      code: "ORDER_LOCKED",
    });
  }
  if (item.status === "APPROVED") {
    throw ApiError.conflict("This item's result is already approved", { code: "ITEM_APPROVED" });
  }

  const existing = await repo.findByOrderItem(db, input.orderItemId);
  if (existing && existing.status === "APPROVED") {
    throw ApiError.conflict("This item's result is already approved", { code: "RESULT_APPROVED" });
  }

  const payload = {
    type: input.type,
    data: input.type === "STRUCTURED" ? (input.data ?? {}) : undefined,
    interpretation: input.interpretation ?? null,
    documentId: input.documentId ?? null,
    // The technician's entry starts as DRAFT. It becomes PENDING_APPROVAL only
    // when the receptionist prepares and SUBMITS it to the Lab Admin — the
    // technician never submits straight to approval.
    status: "DRAFT",
    enteredBy: auth.userId,
    enteredAt: new Date(),
    // Clear any prior rejection when a corrected result is re-submitted.
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    updatedBy: auth.userId,
  };

  const result = existing
    ? await repo.update(db, existing.id, payload)
    : await repo.create(db, {
        orderId: order.id,
        orderItemId: item.id,
        createdBy: auth.userId,
        ...payload,
      });

  await orderRepo.setItemStatus(db, item.id, "RESULT_ENTERED");
  await recalcOrderStatus(db, order.id, auth, reqContext);

  await writeAudit({
    action: existing ? AUDIT_ACTIONS.RESULT_MODIFY : AUDIT_ACTIONS.RESULT_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Result",
    entityId: result.id,
    // On re-entry, snapshot the prior state so the audit trail shows what the
    // corrected result replaced.
    oldValue: existing ? { status: existing.status, type: existing.type } : undefined,
    newValue: { orderItemId: item.id, status: result.status, type: result.type },
    context: reqContext,
  });

  return result;
}

/**
 * Prepares (types/edits) the narrative report a receptionist places on the lab
 * letterhead, and optionally submits it to the Lab Admin for approval.
 *
 *   submit falsy → save the prepared report; the result stays DRAFT.
 *   submit true  → save AND transition the result to PENDING_APPROVAL.
 *
 * The technician's raw entry (data / interpretation / documentId / enteredBy /
 * enteredAt) is never touched, so the audit trail of who entered/uploaded the
 * original result is preserved. This never approves — approval is a Lab Admin
 * capability (approveResult).
 */
export async function prepareResult(db, id, { preparedReport, submit }, auth, reqContext) {
  const result = await repo.findById(db, id);
  if (!result) throw ApiError.notFound("Result not found");

  if (result.status === "APPROVED") {
    throw ApiError.conflict("This result is already approved and can no longer be edited", {
      code: "RESULT_LOCKED",
    });
  }
  if (result.status === "REJECTED") {
    throw ApiError.conflict(
      "This result was rejected and sent back to the laboratory for re-entry",
      { code: "RESULT_REJECTED" },
    );
  }
  // Remaining states (DRAFT / PENDING_APPROVAL) are preparable.

  const nextStatus = submit ? "PENDING_APPROVAL" : result.status;

  const updated = await repo.update(db, id, {
    preparedReport: preparedReport ?? result.preparedReport ?? null,
    preparedBy: auth.userId,
    preparedAt: new Date(),
    status: nextStatus,
    updatedBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.RESULT_PREPARE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Result",
    entityId: id,
    oldValue: { status: result.status },
    newValue: { status: nextStatus, submitted: Boolean(submit) },
    context: reqContext,
  });

  return updated;
}

export async function getResult(db, id) {
  const result = await repo.findById(db, id);
  if (!result) throw ApiError.notFound("Result not found");
  return result;
}

export async function listResults(db, query) {
  const { skip, take, sortBy, sortOrder, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });
  const { total, data } = await repo.list(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    status: query.status,
    orderId: query.orderId,
  });
  return { data, total, page, limit };
}

export async function approveResult(db, id, auth, reqContext) {
  const result = await repo.findById(db, id);
  if (!result) throw ApiError.notFound("Result not found");
  if (result.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict(`Result is not awaiting approval (status: ${result.status})`, {
      code: "RESULT_NOT_PENDING",
    });
  }

  const updated = await repo.update(db, id, {
    status: "APPROVED",
    approvedBy: auth.userId,
    approvedAt: new Date(),
    updatedBy: auth.userId,
  });

  await orderRepo.setItemStatus(db, result.orderItemId, "APPROVED");
  await recalcOrderStatus(db, result.orderId, auth, reqContext);

  await writeAudit({
    action: AUDIT_ACTIONS.RESULT_APPROVE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Result",
    entityId: id,
    oldValue: { status: result.status },
    newValue: { status: "APPROVED" },
    context: reqContext,
  });

  return updated;
}

export async function rejectResult(db, id, reason, auth, reqContext) {
  const result = await repo.findById(db, id);
  if (!result) throw ApiError.notFound("Result not found");
  if (result.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict(`Result is not awaiting approval (status: ${result.status})`, {
      code: "RESULT_NOT_PENDING",
    });
  }

  const updated = await repo.update(db, id, {
    status: "REJECTED",
    rejectedBy: auth.userId,
    rejectedAt: new Date(),
    rejectionReason: reason,
    updatedBy: auth.userId,
  });

  // Send the item back for correction (re-entry re-submits for approval).
  await orderRepo.setItemStatus(db, result.orderItemId, "IN_PROGRESS");
  await recalcOrderStatus(db, result.orderId, auth, reqContext);

  await writeAudit({
    action: AUDIT_ACTIONS.RESULT_REJECT,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Result",
    entityId: id,
    oldValue: { status: result.status },
    newValue: { status: "REJECTED", reason },
    context: reqContext,
  });

  return updated;
}

/**
 * Releases a fully-approved order: stamps every approved result as released and
 * moves the order to RELEASED (terminal). Only reachable once the roll-up has
 * driven the order to APPROVED (all items approved).
 */
export async function releaseOrder(db, orderId, auth, reqContext) {
  const order = await orderRepo.findById(db, orderId);
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status === "RELEASED") {
    throw ApiError.conflict("Order is already released", { code: "ORDER_ALREADY_RELEASED" });
  }
  if (order.status !== "APPROVED") {
    throw ApiError.conflict(`Order is not fully approved (status: ${order.status})`, {
      code: "ORDER_NOT_APPROVED",
    });
  }

  const now = new Date();
  await db.result.updateMany({
    where: { orderId, status: "APPROVED", deletedAt: null },
    data: { releasedBy: auth.userId, releasedAt: now, updatedBy: auth.userId },
  });
  const updated = await orderRepo.update(db, orderId, { status: "RELEASED", updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.RESULT_RELEASE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestOrder",
    entityId: orderId,
    oldValue: { status: order.status },
    newValue: { status: "RELEASED" },
    context: reqContext,
  });

  return updated;
}

/**
 * Resolves a letterhead's referenced image documents into embeddable base64
 * data URIs (logo/banner in the header, signature in the footer) plus its text
 * fields. Missing or unreadable assets degrade gracefully to null so the PDF
 * still renders. Returns null when the org has no letterhead configured.
 */
async function resolveLetterheadAssets(db, letterhead) {
  if (!letterhead) return null;

  const { getFile } = await import("../../core/storage.js");

  async function toDataUri(documentId) {
    if (!documentId) return null;
    try {
      const doc = await db.document.findFirst({
        where: { id: documentId, deletedAt: null },
        select: { storageKey: true, mimeType: true },
      });
      if (!doc) return null;
      const buf = await getFile(doc.storageKey);
      if (!buf || !buf.length) return null;
      const mime = doc.mimeType || "image/png";
      return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    } catch {
      // A broken asset reference must never block the report.
      return null;
    }
  }

  const [logoDataUri, letterheadDataUri, signatureDataUri] = await Promise.all([
    toDataUri(letterhead.logoDocumentId),
    toDataUri(letterhead.letterheadDocumentId),
    toDataUri(letterhead.signatureDocumentId),
  ]);

  return {
    logoDataUri,
    letterheadDataUri,
    signatureDataUri,
    footerText: letterhead.footerText || null,
    address: letterhead.address || null,
    phone: letterhead.phone || null,
    email: letterhead.email || null,
  };
}

/**
 * Generates and returns the official diagnostic PDF report buffer for an order.
 * Gated on Lab Admin approval — before that there is no verified report to
 * produce (this also fixes the prior bug of emitting a "VERIFIED" report with
 * fabricated placeholder rows for un-approved orders).
 */
export async function getOrderPdf(db, orderId, auth) {
  const order = await orderRepo.findById(db, orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (!REPORT_READY.has(order.status)) {
    throw ApiError.conflict(
      "The report is available only after the Lab Admin approves the results",
      { code: "REPORT_NOT_APPROVED" },
    );
  }

  const [org, branch, results, letterhead] = await Promise.all([
    auth.organizationId ? db.organization.findUnique({ where: { id: auth.organizationId } }) : null,
    order.branchId ? db.branch.findUnique({ where: { id: order.branchId } }) : null,
    db.result.findMany({
      where: { orderId, deletedAt: null },
      include: { orderItem: true },
    }),
    auth.organizationId
      ? db.letterhead.findFirst({ where: { organizationId: auth.organizationId } })
      : null,
  ]);

  if (!results.length) {
    throw ApiError.conflict("No results are recorded for this order", { code: "NO_RESULTS" });
  }

  const branding = await resolveLetterheadAssets(db, letterhead);

  const { generateResultPdf } = await import("../../core/pdf.js");
  const pdfBuffer = await generateResultPdf({
    organization: org,
    branch,
    patient: order.patient,
    order,
    results,
    letterhead: branding,
  });

  return {
    pdfBuffer,
    fileName: `Diagnostic_Report_${order.orderCode || orderId}.pdf`,
  };
}

/**
 * Emails the approved diagnostic report to the patient's registered email
 * address as a PDF attachment. Requires the order to be APPROVED/RELEASED and an
 * email to be on file. SMS/phone delivery is NOT implemented (no provider).
 */
export async function sendOrderReport(db, orderId, auth, reqContext) {
  const order = await orderRepo.findById(db, orderId);
  if (!order) throw ApiError.notFound("Order not found");
  if (!REPORT_READY.has(order.status)) {
    throw ApiError.conflict(
      "The report can only be sent after the Lab Admin approves the results",
      { code: "REPORT_NOT_APPROVED" },
    );
  }

  const patient = await db.patient.findFirst({
    where: { id: order.patientId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!patient) throw ApiError.notFound("Patient not found", { code: "PATIENT_NOT_FOUND" });
  if (!patient.email) {
    throw ApiError.badRequest("No email address is on file for this patient", {
      code: "PATIENT_NO_EMAIL",
    });
  }

  const { pdfBuffer, fileName } = await getOrderPdf(db, orderId, auth);
  const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient";

  const { sendMail, mailEnabled } = await import("../../core/mailer.js");
  const delivered = await sendMail({
    to: patient.email,
    subject: `Your diagnostic report${order.orderCode ? ` — ${order.orderCode}` : ""}`,
    text:
      `Dear ${patientName},\n\n` +
      `Please find attached your diagnostic report${order.orderCode ? ` (${order.orderCode})` : ""}.\n\n` +
      "This message contains confidential medical information intended only for you.\n",
    attachments: [{ filename: fileName, content: pdfBuffer, contentType: "application/pdf" }],
  });
  const emailConfigured = mailEnabled();

  await writeAudit({
    action: AUDIT_ACTIONS.RESULT_SEND,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestOrder",
    entityId: orderId,
    // Deliberately does NOT record the patient's email value.
    newValue: { channel: "email", delivered: Boolean(delivered), emailConfigured },
    context: reqContext,
  });

  return { delivered: Boolean(delivered), emailConfigured, to: patient.email };
}

export default {
  enterResult,
  prepareResult,
  getResult,
  listResults,
  approveResult,
  rejectResult,
  releaseOrder,
  getOrderPdf,
  sendOrderReport,
};


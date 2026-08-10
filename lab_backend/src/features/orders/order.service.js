import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { nextOrderCode } from "../../utils/identifiers.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./order.repository.js";
import * as catalogRepo from "../catalog/catalog.repository.js";

/**
 * Test order service — the aggregate root of the clinical workflow.
 *
 * An order owns line items (one per ordered test), and its overall status is a
 * pure roll-up of those items plus payment state (see deriveOrderStatus). Sample
 * collection, result entry/approval and payment all funnel back through
 * recalcOrderStatus so the order status is always a function of its parts —
 * never set ad hoc from scattered places. CANCELLED and RELEASED are the only
 * manual terminal transitions.
 */

// Monotonic progress ranks used to roll item statuses up into an order status.
const ITEM_RANK = { ORDERED: 0, SAMPLE_COLLECTED: 1, IN_PROGRESS: 2, RESULT_ENTERED: 3, APPROVED: 4 };

/**
 * Pure state machine: derive an order's overall status from its line items and
 * whether it has been fully paid. Never returns CANCELLED/RELEASED — those are
 * manual terminal states owned by cancelOrder/releaseOrder.
 */
export function deriveOrderStatus({ items, isPaid }) {
  const active = items.filter((it) => it.status !== "REJECTED");
  if (active.length === 0) return "REJECTED"; // every item rejected
  if (!isPaid) return "PENDING_PAYMENT";

  const ranks = active.map((it) => ITEM_RANK[it.status] ?? 0);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);

  if (minRank === ITEM_RANK.APPROVED) return "APPROVED"; // all items approved
  if (minRank >= ITEM_RANK.RESULT_ENTERED) return "PENDING_APPROVAL"; // all results entered
  if (maxRank >= ITEM_RANK.RESULT_ENTERED) return "RESULT_ENTERED"; // some results entered
  if (maxRank >= ITEM_RANK.IN_PROGRESS) return "IN_PROGRESS";
  if (maxRank >= ITEM_RANK.SAMPLE_COLLECTED) return "SAMPLE_COLLECTED";
  return "AWAITING_SAMPLE"; // paid, nothing collected yet
}

/** Sums settled (PAID) payments for an order as a plain number. */
async function sumSettled(db, orderId) {
  const agg = await db.payment.aggregate({
    where: { orderId, status: "PAID", deletedAt: null },
    _sum: { amount: true },
  });
  return agg._sum.amount == null ? 0 : Number(agg._sum.amount);
}

export async function createOrder(db, input, auth, reqContext) {
  const { organizationId, branchId, userId } = auth;
  if (!organizationId || !branchId) {
    // Orders live at a branch; a platform/org-level actor has no branch context.
    throw ApiError.badRequest("A branch context is required to create an order", {
      code: "BRANCH_CONTEXT_REQUIRED",
    });
  }

  const patient = await db.patient.findFirst({
    where: { id: input.patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) throw ApiError.notFound("Patient not found", { code: "PATIENT_NOT_FOUND" });

  // De-dupe requested tests, then load only ACTIVE, non-deleted catalog entries.
  const testIds = [...new Set(input.testIds)];
  const tests = await catalogRepo.findTestsByIds(db, testIds);
  if (tests.length !== testIds.length) {
    const found = new Set(tests.map((t) => t.id));
    const missing = testIds.filter((id) => !found.has(id));
    throw ApiError.badRequest("One or more selected tests are unavailable", {
      code: "TEST_UNAVAILABLE",
      details: { missing },
    });
  }

  // Snapshot name + price so later catalog edits never rewrite this order.
  const items = tests.map((t) => ({ testId: t.id, testName: t.name, unitPrice: t.price }));
  const totalAmount = items.reduce((sum, it) => sum + Number(it.unitPrice), 0);

  const year = new Date().getFullYear();
  const order = await db.$transaction(async (tx) => {
    const orderCode = await nextOrderCode(tx, organizationId, year);
    return repo.createWithItems(tx, {
      orderCode,
      patientId: patient.id,
      notes: input.notes,
      totalAmount,
      items,
      createdBy: userId,
    });
  });

  await writeAudit({
    action: AUDIT_ACTIONS.ORDER_CREATE,
    organizationId,
    actorId: userId,
    entityType: "TestOrder",
    entityId: order.id,
    newValue: { orderCode: order.orderCode, totalAmount: order.totalAmount, itemCount: items.length },
    context: reqContext,
  });

  return order;
}
export async function getOrder(db, id) {
  const order = await repo.findById(db, id);
  if (!order) throw ApiError.notFound("Order not found");
  const amountPaid = await sumSettled(db, id);
  return { ...order, amountPaid, balance: Number((order.totalAmount - amountPaid).toFixed(2)) };
}

export async function listOrders(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });
  const { total, data } = await repo.list(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    search,
    status: query.status,
    patientId: query.patientId,
  });
  return { data, total, page, limit };
}

export async function updateOrder(db, id, input, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Order not found");

  const updated = await repo.update(db, id, { notes: input.notes, updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.ORDER_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestOrder",
    entityId: id,
    oldValue: { notes: existing.notes },
    newValue: { notes: updated.notes },
    context: reqContext,
  });

  return updated;
}

export async function cancelOrder(db, id, reason, auth, reqContext) {
  const existing = await repo.findById(db, id);
  if (!existing) throw ApiError.notFound("Order not found");

  if (existing.status === "CANCELLED") {
    throw ApiError.conflict("Order is already cancelled", { code: "ORDER_ALREADY_CANCELLED" });
  }
  if (existing.status === "RELEASED") {
    throw ApiError.conflict("A released order cannot be cancelled", { code: "ORDER_RELEASED" });
  }

  const updated = await repo.update(db, id, { status: "CANCELLED", updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.ORDER_CANCEL,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestOrder",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "CANCELLED", reason: reason ?? null },
    context: reqContext,
  });

  return updated;
}

/**
 * Recomputes and persists an order's status from its current items + payments.
 * Called by the samples, results and payments services after any change so the
 * order status stays a faithful roll-up. Terminal states (CANCELLED/RELEASED)
 * are never overwritten. Returns the (possibly updated) order.
 */
export async function recalcOrderStatus(db, orderId, auth, reqContext) {
  const order = await repo.findById(db, orderId);
  if (!order) return null;
  if (order.status === "CANCELLED" || order.status === "RELEASED") return order;

  const amountPaid = await sumSettled(db, orderId);
  const isPaid = order.totalAmount > 0 && amountPaid >= order.totalAmount;
  const next = deriveOrderStatus({ items: order.items, isPaid });

  if (next === order.status) return order;

  const updated = await repo.update(db, orderId, { status: next, updatedBy: auth?.userId ?? null });

  await writeAudit({
    action: AUDIT_ACTIONS.ORDER_UPDATE,
    organizationId: auth?.organizationId ?? null,
    actorId: auth?.userId ?? null,
    entityType: "TestOrder",
    entityId: orderId,
    oldValue: { status: order.status },
    newValue: { status: next },
    context: reqContext,
  });

  return updated;
}

export default {
  deriveOrderStatus,
  createOrder,
  getOrder,
  listOrders,
  updateOrder,
  cancelOrder,
  recalcOrderStatus,
};

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
 * Flow per order item:
 *   enter  → result PENDING_APPROVAL, item RESULT_ENTERED
 *   approve→ result APPROVED,          item APPROVED
 *   reject → result REJECTED,          item IN_PROGRESS (sent back to redo)
 * Releasing an order stamps every approved result as released and moves the
 * order to RELEASED (terminal). Each transition re-rolls the parent order status.
 */

// Order states in which results cannot be entered.
const ORDER_LOCKED = new Set(["PENDING_PAYMENT", "CANCELLED", "RELEASED"]);

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
    status: "PENDING_APPROVAL",
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
    newValue: { orderItemId: item.id, status: result.status, type: result.type },
    context: reqContext,
  });

  return result;
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

export default {
  enterResult,
  getResult,
  listResults,
  approveResult,
  rejectResult,
  releaseOrder,
};

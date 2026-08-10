import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./payment.repository.js";
import * as orderRepo from "../orders/order.repository.js";
import { recalcOrderStatus } from "../orders/order.service.js";

/**
 * Payment service — records money received against an order.
 *
 * Each recorded payment is immediately settled (status PAID) with a paidAt
 * timestamp; the gateway columns on the model are reserved for a future online
 * integration. Recording a payment re-rolls the order status, which lifts a
 * fully-paid order out of PENDING_PAYMENT into AWAITING_SAMPLE.
 */

// Order states that no longer accept payments.
const CLOSED_ORDER = new Set(["CANCELLED"]);

export async function createPayment(db, input, auth, reqContext) {
  if (!auth.branchId) {
    throw ApiError.badRequest("A branch context is required to record a payment", {
      code: "BRANCH_CONTEXT_REQUIRED",
    });
  }

  const order = await orderRepo.findById(db, input.orderId);
  if (!order) throw ApiError.notFound("Order not found", { code: "ORDER_NOT_FOUND" });
  if (CLOSED_ORDER.has(order.status)) {
    throw ApiError.conflict("A cancelled order cannot take payments", { code: "ORDER_CANCELLED" });
  }

  const alreadyPaid = await repo.sumSettledForOrder(db, order.id);
  const balance = Number((order.totalAmount - alreadyPaid).toFixed(2));
  if (balance <= 0) {
    throw ApiError.conflict("This order is already fully paid", { code: "ORDER_FULLY_PAID" });
  }
  if (input.amount > balance) {
    throw ApiError.badRequest(`Amount exceeds the outstanding balance of ${balance}`, {
      code: "AMOUNT_EXCEEDS_BALANCE",
      details: { balance },
    });
  }

  const payment = await repo.create(db, {
    orderId: order.id,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    status: "PAID",
    paidAt: new Date(),
    createdBy: auth.userId,
  });

  // Recompute the order status now the balance has moved.
  const updatedOrder = await recalcOrderStatus(db, order.id, auth, reqContext);

  await writeAudit({
    action: AUDIT_ACTIONS.PAYMENT_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Payment",
    entityId: payment.id,
    newValue: { orderId: order.id, amount: payment.amount, method: payment.method },
    context: reqContext,
  });

  const settled = alreadyPaid + input.amount;
  return {
    payment,
    order: {
      id: order.id,
      orderCode: order.orderCode,
      status: updatedOrder?.status ?? order.status,
      totalAmount: order.totalAmount,
      amountPaid: settled,
      balance: Number((order.totalAmount - settled).toFixed(2)),
    },
  };
}

export async function getPayment(db, id) {
  const payment = await repo.findById(db, id);
  if (!payment) throw ApiError.notFound("Payment not found");
  return payment;
}

export async function listPayments(db, query) {
  const { skip, take, sortBy, sortOrder, page, limit } = parseListQuery(query, {
    defaultSort: "createdAt",
  });
  const { total, data } = await repo.list(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    status: query.status,
    method: query.method,
    orderId: query.orderId,
  });
  return { data, total, page, limit };
}

export default { createPayment, getPayment, listPayments };

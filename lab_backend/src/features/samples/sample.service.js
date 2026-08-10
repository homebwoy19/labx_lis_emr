import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { formatSampleBarcode } from "../../utils/identifiers.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./sample.repository.js";
import * as orderRepo from "../orders/order.repository.js";
import { recalcOrderStatus } from "../orders/order.service.js";

/**
 * Sample service — the collection lifecycle: PENDING → COLLECTED → RECEIVED,
 * with REJECTED as an off-ramp when a specimen is unusable.
 *
 * Collecting a specimen advances the order's still-ordered items to
 * SAMPLE_COLLECTED; receiving it moves them into IN_PROGRESS. Every transition
 * funnels back through recalcOrderStatus so the parent order status stays a true
 * roll-up.
 */

// Terminal order states that can no longer accept specimens.
const CLOSED_ORDER = new Set(["CANCELLED", "RELEASED"]);

export async function createSample(db, input, auth, reqContext) {
  if (!auth.branchId) {
    throw ApiError.badRequest("A branch context is required to register a sample", {
      code: "BRANCH_CONTEXT_REQUIRED",
    });
  }

  const order = await orderRepo.findById(db, input.orderId);
  if (!order) throw ApiError.notFound("Order not found", { code: "ORDER_NOT_FOUND" });
  if (order.status === "PENDING_PAYMENT") {
    throw ApiError.conflict("Payment is required before a sample can be taken", {
      code: "ORDER_UNPAID",
    });
  }
  if (CLOSED_ORDER.has(order.status)) {
    throw ApiError.conflict(`Order is ${order.status.toLowerCase()} and cannot accept samples`, {
      code: "ORDER_CLOSED",
    });
  }

  const index = (await repo.countForOrder(db, order.id)) + 1;
  const barcode = formatSampleBarcode(order.orderCode, index);

  const sample = await repo.create(db, {
    orderId: order.id,
    barcode,
    sampleType: input.sampleType ?? null,
    status: "PENDING",
    createdBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.SAMPLE_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Sample",
    entityId: sample.id,
    newValue: { barcode: sample.barcode, orderId: order.id },
    context: reqContext,
  });

  return sample;
}

export async function getSample(db, id) {
  const sample = await repo.findById(db, id);
  if (!sample) throw ApiError.notFound("Sample not found");
  return sample;
}

export async function listSamples(db, query) {
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
    orderId: query.orderId,
  });
  return { data, total, page, limit };
}
export async function collectSample(db, id, input, auth, reqContext) {
  const sample = await repo.findById(db, id);
  if (!sample) throw ApiError.notFound("Sample not found");
  if (sample.status !== "PENDING") {
    throw ApiError.conflict(`Sample is not pending (status: ${sample.status})`, {
      code: "SAMPLE_NOT_PENDING",
    });
  }

  const updated = await repo.update(db, id, {
    status: "COLLECTED",
    sampleType: input.sampleType ?? sample.sampleType,
    collectedBy: auth.userId,
    collectedAt: new Date(),
    updatedBy: auth.userId,
  });

  // Advance any still-ordered items on the parent order, then re-roll the order.
  await orderRepo.advanceItems(db, sample.orderId, "ORDERED", "SAMPLE_COLLECTED");
  await recalcOrderStatus(db, sample.orderId, auth, reqContext);

  await writeAudit({
    action: AUDIT_ACTIONS.SAMPLE_COLLECT,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Sample",
    entityId: id,
    oldValue: { status: sample.status },
    newValue: { status: "COLLECTED" },
    context: reqContext,
  });

  return updated;
}

export async function receiveSample(db, id, auth, reqContext) {
  const sample = await repo.findById(db, id);
  if (!sample) throw ApiError.notFound("Sample not found");
  if (sample.status !== "COLLECTED") {
    throw ApiError.conflict(`Sample must be collected before it can be received (status: ${sample.status})`, {
      code: "SAMPLE_NOT_COLLECTED",
    });
  }

  const updated = await repo.update(db, id, { status: "RECEIVED", updatedBy: auth.userId });

  // Receipt in the lab starts processing: collected items move to IN_PROGRESS.
  await orderRepo.advanceItems(db, sample.orderId, "SAMPLE_COLLECTED", "IN_PROGRESS");
  await recalcOrderStatus(db, sample.orderId, auth, reqContext);

  await writeAudit({
    action: AUDIT_ACTIONS.SAMPLE_RECEIVE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Sample",
    entityId: id,
    oldValue: { status: sample.status },
    newValue: { status: "RECEIVED" },
    context: reqContext,
  });

  return updated;
}

export async function rejectSample(db, id, reason, auth, reqContext) {
  const sample = await repo.findById(db, id);
  if (!sample) throw ApiError.notFound("Sample not found");
  if (sample.status === "REJECTED") {
    throw ApiError.conflict("Sample is already rejected", { code: "SAMPLE_ALREADY_REJECTED" });
  }

  const updated = await repo.update(db, id, { status: "REJECTED", updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.SAMPLE_REJECT,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Sample",
    entityId: id,
    oldValue: { status: sample.status },
    newValue: { status: "REJECTED", reason },
    context: reqContext,
  });

  return updated;
}

export default {
  createSample,
  getSample,
  listSamples,
  collectSample,
  receiveSample,
  rejectSample,
};

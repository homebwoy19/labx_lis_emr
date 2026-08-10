/**
 * Test order repository — orders and their line items.
 *
 * Every function receives the TENANT-SCOPED client (`db` = req.db), which injects
 * organizationId + branchId filters on TestOrder. TestOrderItem carries no tenant
 * columns of its own — it is reached only through an order that has already been
 * tenant-checked, so item queries key off a validated orderId.
 *
 * Prisma returns Decimal money as Decimal objects; the shapers coerce them to
 * plain numbers for the JSON response contract.
 */

const ITEM_SELECT = {
  id: true,
  testId: true,
  testName: true,
  unitPrice: true,
  status: true,
  createdAt: true,
};

const ORDER_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  totalAmount: true,
  notes: true,
  patientId: true,
  branchId: true,
  patient: { select: { id: true, patientCode: true, firstName: true, lastName: true } },
  items: { select: ITEM_SELECT, orderBy: { createdAt: "asc" } },
  createdAt: true,
  updatedAt: true,
};

/** Coerces Decimal money fields on an order (and its items) to plain numbers. */
export function shapeOrder(order) {
  if (!order) return order;
  return {
    ...order,
    totalAmount: order.totalAmount == null ? null : Number(order.totalAmount),
    items: (order.items ?? []).map((it) => ({
      ...it,
      unitPrice: it.unitPrice == null ? null : Number(it.unitPrice),
    })),
  };
}

export async function findById(db, id) {
  const order = await db.testOrder.findFirst({
    where: { id, deletedAt: null },
    select: ORDER_SELECT,
  });
  return shapeOrder(order);
}

export async function list(db, { skip, take, sortBy, sortOrder, search, status, patientId }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (search) where.orderCode = { contains: search, mode: "insensitive" };

  const [total, data] = await Promise.all([
    db.testOrder.count({ where }),
    db.testOrder.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: ORDER_SELECT,
    }),
  ]);

  return { total, data: data.map(shapeOrder) };
}

/**
 * Creates an order with its line items in one call. Must run inside a
 * transaction (`tx`) alongside the order-code allocation so a failure rolls the
 * sequence increment back. The scoped client stamps organizationId/branchId onto
 * the order; items inherit tenancy through the parent.
 */
export async function createWithItems(tx, { orderCode, patientId, notes, totalAmount, items, createdBy }) {
  const order = await tx.testOrder.create({
    data: {
      orderCode,
      patientId,
      notes: notes ?? null,
      totalAmount,
      status: "PENDING_PAYMENT",
      createdBy,
      items: {
        create: items.map((it) => ({
          testId: it.testId,
          testName: it.testName,
          unitPrice: it.unitPrice,
        })),
      },
    },
    select: ORDER_SELECT,
  });
  return shapeOrder(order);
}

export async function update(db, id, data) {
  const order = await db.testOrder.update({ where: { id }, data, select: ORDER_SELECT });
  return shapeOrder(order);
}

export async function softDelete(db, id, deletedBy) {
  return db.testOrder.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, status: "CANCELLED" },
    select: { id: true },
  });
}

// ── Line items ────────────────────────────────────────────────────────────────
// Reached only via a tenant-validated orderId, so these need no tenant filter.

/** Loads a single order item together with its (tenant-checked) parent order id. */
export async function findItemById(db, itemId) {
  return db.testOrderItem.findFirst({
    where: { id: itemId },
    select: { id: true, orderId: true, testId: true, testName: true, status: true },
  });
}

/** Advances every item of an order that is currently `fromStatus` to `toStatus`. */
export async function advanceItems(db, orderId, fromStatus, toStatus) {
  return db.testOrderItem.updateMany({
    where: { orderId, status: fromStatus },
    data: { status: toStatus },
  });
}

/** Sets a single item's status. */
export async function setItemStatus(db, itemId, status) {
  return db.testOrderItem.update({ where: { id: itemId }, data: { status } });
}

export default {
  shapeOrder,
  findById,
  list,
  createWithItems,
  update,
  softDelete,
  findItemById,
  advanceItems,
  setItemStatus,
};

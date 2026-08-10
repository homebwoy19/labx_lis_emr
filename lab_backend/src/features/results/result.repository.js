/**
 * Result repository.
 *
 * Result is a tenant model (organizationId + branchId) so the scoped client
 * auto-filters and stamps it. A result maps one-to-one to an order item
 * (orderItemId is unique). Lookups use findFirst so the tenant filter composes
 * with the id predicate.
 */

const RESULT_SELECT = {
  id: true,
  orderId: true,
  orderItemId: true,
  type: true,
  status: true,
  data: true,
  interpretation: true,
  documentId: true,
  enteredBy: true,
  enteredAt: true,
  approvedBy: true,
  approvedAt: true,
  rejectedBy: true,
  rejectedAt: true,
  rejectionReason: true,
  releasedBy: true,
  releasedAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function findById(db, id) {
  return db.result.findFirst({ where: { id, deletedAt: null }, select: RESULT_SELECT });
}

export async function findByOrderItem(db, orderItemId) {
  return db.result.findFirst({ where: { orderItemId, deletedAt: null }, select: RESULT_SELECT });
}

export async function create(db, data) {
  return db.result.create({ data, select: RESULT_SELECT });
}

export async function update(db, id, data) {
  return db.result.update({ where: { id }, data, select: RESULT_SELECT });
}

export async function list(db, { skip, take, sortBy, sortOrder, status, orderId }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;

  const [total, data] = await Promise.all([
    db.result.count({ where }),
    db.result.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: RESULT_SELECT,
    }),
  ]);

  return { total, data };
}

export default { findById, findByOrderItem, create, update, list };

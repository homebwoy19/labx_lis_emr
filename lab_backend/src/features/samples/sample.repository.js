/**
 * Sample repository.
 *
 * Sample is a tenant model (organizationId + branchId), so the scoped client
 * (`db` = req.db) auto-filters and stamps it. Lookups use findFirst so the
 * injected tenant filter composes with the id predicate.
 */

const SAMPLE_SELECT = {
  id: true,
  barcode: true,
  sampleType: true,
  status: true,
  orderId: true,
  branchId: true,
  collectedBy: true,
  collectedAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function findById(db, id) {
  return db.sample.findFirst({ where: { id, deletedAt: null }, select: SAMPLE_SELECT });
}

export async function countForOrder(db, orderId) {
  return db.sample.count({ where: { orderId } });
}

export async function create(db, data) {
  return db.sample.create({ data, select: SAMPLE_SELECT });
}

export async function list(db, { skip, take, sortBy, sortOrder, search, status, orderId }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  if (search) where.barcode = { contains: search, mode: "insensitive" };

  const [total, data] = await Promise.all([
    db.sample.count({ where }),
    db.sample.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: SAMPLE_SELECT,
    }),
  ]);

  return { total, data };
}

export async function update(db, id, data) {
  return db.sample.update({ where: { id }, data, select: SAMPLE_SELECT });
}

export default { findById, countForOrder, create, list, update };

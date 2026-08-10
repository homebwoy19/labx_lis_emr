/**
 * Branch repository.
 *
 * Branch is a tenant model scoped by organizationId. A Lab Admin's `req.db`
 * therefore only ever sees branches in their own laboratory; a Super Admin's
 * `req.db` is unscoped, so approval flows can reach any pending branch.
 *
 * Lookups use findFirst so the injected organization filter composes with the id.
 */

const PUBLIC_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  code: true,
  email: true,
  phone: true,
  address: true,
  isHeadOffice: true,
  status: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function findById(db, id) {
  return db.branch.findFirst({
    where: { id, deletedAt: null },
    select: PUBLIC_SELECT,
  });
}

export async function findByCode(db, code) {
  return db.branch.findFirst({
    where: { code, deletedAt: null },
    select: { id: true, code: true },
  });
}

export async function create(db, data) {
  return db.branch.create({ data, select: PUBLIC_SELECT });
}

export async function list(db, { skip, take, sortBy, sortOrder, search, status }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, data] = await Promise.all([
    db.branch.count({ where }),
    db.branch.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: PUBLIC_SELECT,
    }),
  ]);

  return { total, data };
}

export async function update(db, id, data) {
  return db.branch.update({ where: { id }, data, select: PUBLIC_SELECT });
}

export default { findById, findByCode, create, list, update, PUBLIC_SELECT };

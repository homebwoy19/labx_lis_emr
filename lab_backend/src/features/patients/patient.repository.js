/**
 * Patient repository.
 *
 * Every function receives the TENANT-SCOPED client (`db` = req.db). Because that
 * client auto-injects organizationId/branchId filters, these queries stay clean
 * and cross-tenant access is impossible even if a where clause is forgotten.
 *
 * Note: we use findFirst (not findUnique) for lookups so the injected tenant
 * filter composes with the id predicate.
 */

const PUBLIC_SELECT = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  phone: true,
  email: true,
  address: true,
  status: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
};

export async function findById(db, id) {
  return db.patient.findFirst({
    where: { id, deletedAt: null },
    select: PUBLIC_SELECT,
  });
}

export async function list(db, { skip, take, sortBy, sortOrder, search }) {
  const where = { deletedAt: null };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { patientCode: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, data] = await Promise.all([
    db.patient.count({ where }),
    db.patient.findMany({
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
  return db.patient.update({
    where: { id },
    data,
    select: PUBLIC_SELECT,
  });
}

export async function softDelete(db, id, deletedBy) {
  return db.patient.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy,
      status: "ARCHIVED",
    },
    select: { id: true },
  });
}

export default { findById, list, update, softDelete, PUBLIC_SELECT };

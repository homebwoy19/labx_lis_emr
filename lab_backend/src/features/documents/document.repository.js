/**
 * Document repository.
 *
 * Document is a tenant model (organizationId + branchId), so the scoped client
 * (`db` = req.db) auto-filters and stamps it.
 */

// Mirrors the Document model exactly: the columns are `kind` (DocumentKind) and
// `sizeBytes`, and there is no `updatedAt`. Selecting non-existent fields would
// make every read throw at the Prisma layer.
const DOCUMENT_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  kind: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  checksum: true,
  createdAt: true,
};

export async function create(db, data) {
  return db.document.create({ data, select: DOCUMENT_SELECT });
}

export async function findById(db, id) {
  return db.document.findFirst({ where: { id, deletedAt: null }, select: DOCUMENT_SELECT });
}

export async function list(db, { skip, take, type }) {
  const where = { deletedAt: null };
  if (type) where.type = type;

  const [total, data] = await Promise.all([
    db.document.count({ where }),
    db.document.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: DOCUMENT_SELECT,
    }),
  ]);

  return { total, data };
}

export async function softDelete(db, id) {
  // Document has no `deletedBy` column — only `deletedAt`.
  return db.document.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true },
  });
}

export default { create, findById, list, softDelete };

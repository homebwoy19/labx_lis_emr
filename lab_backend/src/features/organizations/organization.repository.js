/**
 * Organization repository.
 *
 * Organizations are a PLATFORM resource: only the Super Admin manages them, and
 * the Super Admin's `req.db` is the unscoped base client, so these queries are
 * intentionally not tenant-filtered. Organization is not a TENANT_MODEL.
 */

const PUBLIC_SELECT = {
  id: true,
  name: true,
  acronym: true,
  slug: true,
  email: true,
  phone: true,
  address: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export async function findById(db, id) {
  return db.organization.findFirst({
    where: { id, deletedAt: null },
    select: PUBLIC_SELECT,
  });
}

export async function findByAcronymOrSlug(db, acronym, slug) {
  return db.organization.findFirst({
    where: { OR: [{ acronym }, { slug }] },
    select: { id: true, acronym: true, slug: true },
  });
}

export async function create(db, data) {
  return db.organization.create({ data, select: PUBLIC_SELECT });
}

export async function list(db, { skip, take, sortBy, sortOrder, search, status }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { acronym: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, data] = await Promise.all([
    db.organization.count({ where }),
    db.organization.findMany({
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
  return db.organization.update({ where: { id }, data, select: PUBLIC_SELECT });
}

export default { findById, findByAcronymOrSlug, create, list, update, PUBLIC_SELECT };

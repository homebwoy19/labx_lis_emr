/**
 * Test catalog repository — categories and tests.
 *
 * Both models are organization-scoped (no branch dimension): a laboratory's
 * catalog is shared across all its branches. The scoped client injects the
 * organizationId filter; lookups use findFirst so it composes with the id.
 *
 * Prisma returns Decimal prices as Decimal objects — the shapers below coerce
 * them to plain numbers for the JSON response contract.
 */

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORY_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export async function findCategoryById(db, id) {
  return db.testCategory.findFirst({ where: { id, deletedAt: null }, select: CATEGORY_SELECT });
}

export async function findCategoryByName(db, name) {
  return db.testCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, deletedAt: null },
    select: { id: true, name: true },
  });
}

export async function createCategory(db, data) {
  return db.testCategory.create({ data, select: CATEGORY_SELECT });
}

export async function listCategories(db, { skip, take, sortBy, sortOrder, search }) {
  const where = { deletedAt: null };
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [total, data] = await Promise.all([
    db.testCategory.count({ where }),
    db.testCategory.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: CATEGORY_SELECT,
    }),
  ]);

  return { total, data };
}

export async function updateCategory(db, id, data) {
  return db.testCategory.update({ where: { id }, data, select: CATEGORY_SELECT });
}

export async function softDeleteCategory(db, id, deletedBy) {
  return db.testCategory.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, status: "ARCHIVED" },
    select: { id: true },
  });
}

export async function countTestsInCategory(db, categoryId) {
  return db.test.count({ where: { categoryId, deletedAt: null } });
}

// ── Tests ────────────────────────────────────────────────────────────────────

const TEST_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  price: true,
  turnaroundHrs: true,
  resultTemplate: true,
  status: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};

/** Coerces the Decimal price to a plain number for the response. */
export function shapeTest(test) {
  if (!test) return test;
  return { ...test, price: test.price == null ? null : Number(test.price) };
}

export async function findTestById(db, id) {
  const test = await db.test.findFirst({ where: { id, deletedAt: null }, select: TEST_SELECT });
  return shapeTest(test);
}

export async function findTestsByIds(db, ids) {
  const tests = await db.test.findMany({
    where: { id: { in: ids }, deletedAt: null, status: "ACTIVE" },
    select: TEST_SELECT,
  });
  return tests.map(shapeTest);
}

export async function findTestByCode(db, code) {
  return db.test.findFirst({ where: { code, deletedAt: null }, select: { id: true, code: true } });
}

export async function createTest(db, data) {
  const test = await db.test.create({ data, select: TEST_SELECT });
  return shapeTest(test);
}

export async function listTests(db, { skip, take, sortBy, sortOrder, search, type, categoryId }) {
  const where = { deletedAt: null };
  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, data] = await Promise.all([
    db.test.count({ where }),
    db.test.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: TEST_SELECT,
    }),
  ]);

  return { total, data: data.map(shapeTest) };
}

export async function updateTest(db, id, data) {
  const test = await db.test.update({ where: { id }, data, select: TEST_SELECT });
  return shapeTest(test);
}

export async function softDeleteTest(db, id, deletedBy) {
  return db.test.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, status: "ARCHIVED" },
    select: { id: true },
  });
}

export default {
  findCategoryById,
  findCategoryByName,
  createCategory,
  listCategories,
  updateCategory,
  softDeleteCategory,
  countTestsInCategory,
  shapeTest,
  findTestById,
  findTestsByIds,
  findTestByCode,
  createTest,
  listTests,
  updateTest,
  softDeleteTest,
};

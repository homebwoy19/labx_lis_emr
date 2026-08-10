import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { parseListQuery } from "../../utils/pagination.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./catalog.repository.js";

/**
 * Test catalog service — categories and tests.
 *
 * A laboratory's catalog is organization-wide and shared across branches. Tests
 * carry a price that is later snapshotted onto order items, so historic orders
 * are unaffected by future price changes.
 */

// ── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(db, input, auth, reqContext) {
  const clash = await repo.findCategoryByName(db, input.name);
  if (clash) {
    throw ApiError.conflict("A category with this name already exists", {
      code: "CATEGORY_EXISTS",
    });
  }

  const category = await repo.createCategory(db, {
    name: input.name,
    description: input.description ?? null,
    createdBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.CATEGORY_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestCategory",
    entityId: category.id,
    newValue: { name: category.name },
    context: reqContext,
  });

  return category;
}

export async function getCategory(db, id) {
  const category = await repo.findCategoryById(db, id);
  if (!category) throw ApiError.notFound("Category not found");
  return category;
}

export async function listCategories(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "name",
  });
  const { total, data } = await repo.listCategories(db, { skip, take, sortBy, sortOrder, search });
  return { data, total, page, limit };
}

export async function updateCategory(db, id, input, auth, reqContext) {
  const existing = await repo.findCategoryById(db, id);
  if (!existing) throw ApiError.notFound("Category not found");

  const updated = await repo.updateCategory(db, id, { ...input, updatedBy: auth.userId });

  await writeAudit({
    action: AUDIT_ACTIONS.CATEGORY_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestCategory",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    context: reqContext,
  });

  return updated;
}

export async function deleteCategory(db, id, auth, reqContext) {
  const existing = await repo.findCategoryById(db, id);
  if (!existing) throw ApiError.notFound("Category not found");

  const testCount = await repo.countTestsInCategory(db, id);
  if (testCount > 0) {
    throw ApiError.conflict("Cannot delete a category that still has tests", {
      code: "CATEGORY_NOT_EMPTY",
    });
  }

  await repo.softDeleteCategory(db, id, auth.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.CATEGORY_DELETE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "TestCategory",
    entityId: id,
    oldValue: existing,
    context: reqContext,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

/** Validates a referenced category exists within the organization. */
async function assertCategory(db, categoryId) {
  if (!categoryId) return;
  const category = await repo.findCategoryById(db, categoryId);
  if (!category) throw ApiError.notFound("Category not found", { code: "CATEGORY_NOT_FOUND" });
}

export async function createTest(db, input, auth, reqContext) {
  await assertCategory(db, input.categoryId);

  const clash = await repo.findTestByCode(db, input.code);
  if (clash) {
    throw ApiError.conflict("A test with this code already exists", { code: "TEST_CODE_EXISTS" });
  }

  const test = await repo.createTest(db, {
    code: input.code,
    name: input.name,
    type: input.type,
    price: input.price,
    turnaroundHrs: input.turnaroundHrs ?? null,
    categoryId: input.categoryId ?? null,
    resultTemplate: input.resultTemplate ?? undefined,
    createdBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.TEST_CREATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Test",
    entityId: test.id,
    newValue: { code: test.code, name: test.name, price: test.price },
    context: reqContext,
  });

  return test;
}

export async function getTest(db, id) {
  const test = await repo.findTestById(db, id);
  if (!test) throw ApiError.notFound("Test not found");
  return test;
}

export async function listTests(db, query) {
  const { skip, take, sortBy, sortOrder, search, page, limit } = parseListQuery(query, {
    defaultSort: "name",
  });
  const { total, data } = await repo.listTests(db, {
    skip,
    take,
    sortBy,
    sortOrder,
    search,
    type: query.type,
    categoryId: query.categoryId,
  });
  return { data, total, page, limit };
}

export async function updateTest(db, id, input, auth, reqContext) {
  const existing = await repo.findTestById(db, id);
  if (!existing) throw ApiError.notFound("Test not found");

  if (input.categoryId) await assertCategory(db, input.categoryId);

  const data = { ...input, updatedBy: auth.userId };
  // resultTemplate is nullable JSON; Prisma treats undefined as "leave as-is".
  if (input.resultTemplate === undefined) delete data.resultTemplate;

  const updated = await repo.updateTest(db, id, data);

  await writeAudit({
    action: AUDIT_ACTIONS.TEST_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Test",
    entityId: id,
    oldValue: { price: existing.price, status: existing.status },
    newValue: { price: updated.price, status: updated.status },
    context: reqContext,
  });

  return updated;
}

export async function deleteTest(db, id, auth, reqContext) {
  const existing = await repo.findTestById(db, id);
  if (!existing) throw ApiError.notFound("Test not found");

  await repo.softDeleteTest(db, id, auth.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.TEST_DELETE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Test",
    entityId: id,
    oldValue: { code: existing.code, name: existing.name },
    context: reqContext,
  });
}

export default {
  createCategory,
  getCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  createTest,
  getTest,
  listTests,
  updateTest,
  deleteTest,
};

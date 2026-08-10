import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as catalogService from "./catalog.service.js";

/**
 * Catalog controller — HTTP adapter for test categories and tests.
 */

// ── Categories ───────────────────────────────────────────────────────────────

export const createCategory = asyncHandler(async (req, res) => {
  const category = await catalogService.createCategory(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "Category created", data: { category } });
});

export const listCategories = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await catalogService.listCategories(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { categories: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await catalogService.getCategory(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await catalogService.updateCategory(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Category updated", data: { category } });
});

export const removeCategory = asyncHandler(async (req, res) => {
  await catalogService.deleteCategory(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Category archived" });
});

// ── Tests ────────────────────────────────────────────────────────────────────

export const createTest = asyncHandler(async (req, res) => {
  const test = await catalogService.createTest(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "Test created", data: { test } });
});

export const listTests = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await catalogService.listTests(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { tests: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getTest = asyncHandler(async (req, res) => {
  const test = await catalogService.getTest(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { test } });
});

export const updateTest = asyncHandler(async (req, res) => {
  const test = await catalogService.updateTest(
    req.db,
    req.params.id,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Test updated", data: { test } });
});

export const removeTest = asyncHandler(async (req, res) => {
  await catalogService.deleteTest(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Test archived" });
});

export default {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  removeCategory,
  createTest,
  listTests,
  getTest,
  updateTest,
  removeTest,
};

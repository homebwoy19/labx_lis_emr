import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as sampleService from "./sample.service.js";

/**
 * Sample controller — HTTP adapter for the collection lifecycle.
 */

export const create = asyncHandler(async (req, res) => {
  const sample = await sampleService.createSample(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "Sample registered", data: { sample } });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await sampleService.listSamples(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { samples: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const sample = await sampleService.getSample(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { sample } });
});

export const collect = asyncHandler(async (req, res) => {
  const sample = await sampleService.collectSample(req.db, req.params.id, req.body, req.auth, req.context);
  return sendSuccess(res, { message: "Sample collected", data: { sample } });
});

export const receive = asyncHandler(async (req, res) => {
  const sample = await sampleService.receiveSample(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Sample received", data: { sample } });
});

export const reject = asyncHandler(async (req, res) => {
  const sample = await sampleService.rejectSample(
    req.db,
    req.params.id,
    req.body.reason,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Sample rejected", data: { sample } });
});

export default { create, list, getOne, collect, receive, reject };

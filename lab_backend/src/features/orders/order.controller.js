import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as orderService from "./order.service.js";

/**
 * Order controller — HTTP adapter for the order lifecycle.
 */

export const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "Order created", data: { order } });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await orderService.listOrders(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { orders: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { order } });
});

export const update = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.db, req.params.id, req.body, req.auth, req.context);
  return sendSuccess(res, { message: "Order updated", data: { order } });
});

export const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.db,
    req.params.id,
    req.body?.reason,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Order cancelled", data: { order } });
});

export default { create, list, getOne, update, cancel };

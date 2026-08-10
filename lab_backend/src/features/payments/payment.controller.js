import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as paymentService from "./payment.service.js";

/**
 * Payment controller — HTTP adapter for recording and reading payments.
 */

export const create = asyncHandler(async (req, res) => {
  const { payment, order } = await paymentService.createPayment(
    req.db,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: "Payment recorded",
    data: { payment, order },
  });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await paymentService.listPayments(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { payments: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { payment } });
});

export default { create, list, getOne };

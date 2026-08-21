import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess, paginationMeta } from "../../core/ApiResponse.js";
import * as resultService from "./result.service.js";

/**
 * Result controller — HTTP adapter for result entry and the approval workflow.
 */

export const enter = asyncHandler(async (req, res) => {
  const result = await resultService.enterResult(req.db, req.body, req.auth, req.context);
  return sendSuccess(res, { statusCode: 201, message: "Result submitted", data: { result } });
});

export const list = asyncHandler(async (req, res) => {
  const { data, total, page, limit } = await resultService.listResults(
    req.db,
    req.validatedQuery ?? req.query,
  );
  return sendSuccess(res, {
    message: "OK",
    data: { results: data },
    meta: paginationMeta({ total, page, limit }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const result = await resultService.getResult(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { result } });
});

export const approve = asyncHandler(async (req, res) => {
  const result = await resultService.approveResult(req.db, req.params.id, req.auth, req.context);
  return sendSuccess(res, { message: "Result approved", data: { result } });
});

export const reject = asyncHandler(async (req, res) => {
  const result = await resultService.rejectResult(
    req.db,
    req.params.id,
    req.body.reason,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Result rejected", data: { result } });
});

export const prepare = asyncHandler(async (req, res) => {
  const result = await resultService.prepareResult(
    req.db,
    req.params.id,
    { preparedReport: req.body.preparedReport, submit: req.body.submit },
    req.auth,
    req.context,
  );
  const message = req.body.submit ? "Report submitted to Lab Admin" : "Report saved";
  return sendSuccess(res, { message, data: { result } });
});

export const release = asyncHandler(async (req, res) => {
  const order = await resultService.releaseOrder(req.db, req.params.orderId, req.auth, req.context);
  return sendSuccess(res, { message: "Order released", data: { order } });
});

export const downloadOrderPdf = asyncHandler(async (req, res) => {
  const { pdfBuffer, fileName } = await resultService.getOrderPdf(req.db, req.params.orderId, req.auth);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.send(pdfBuffer);
});

export const sendReport = asyncHandler(async (req, res) => {
  const outcome = await resultService.sendOrderReport(
    req.db,
    req.params.orderId,
    req.auth,
    req.context,
  );
  const message = outcome.emailConfigured
    ? "Report sent to the patient's email"
    : "Report queued — email delivery is not configured on this server (logged only)";
  return sendSuccess(res, { message, data: outcome });
});

export default {
  enter,
  list,
  getOne,
  approve,
  reject,
  prepare,
  release,
  downloadOrderPdf,
  sendReport,
};


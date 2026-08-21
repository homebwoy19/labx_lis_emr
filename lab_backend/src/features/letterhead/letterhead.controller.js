import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess } from "../../core/ApiResponse.js";
import * as letterheadService from "./letterhead.service.js";

/**
 * Letterhead controller — HTTP adapter for reading/updating the lab's letterhead.
 */

export const get = asyncHandler(async (req, res) => {
  const letterhead = await letterheadService.getLetterhead(req.db, req.auth);
  return sendSuccess(res, { message: "OK", data: { letterhead } });
});

export const update = asyncHandler(async (req, res) => {
  const letterhead = await letterheadService.updateLetterhead(
    req.db,
    req.body,
    req.auth,
    req.context,
  );
  return sendSuccess(res, { message: "Letterhead saved", data: { letterhead } });
});

export default { get, update };

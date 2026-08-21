import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess } from "../../core/ApiResponse.js";
import * as documentService from "./document.service.js";

/**
 * Document controller — upload, metadata inspection, and downloading.
 */

export const upload = asyncHandler(async (req, res) => {
  const { fileName, mimeType, kind, type, data } = req.body;
  let buffer;

  if (data) {
    // Base64-encoded payload — optionally a data: URL, whose prefix we strip.
    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    buffer = Buffer.from(base64Data, "base64");
  } else if (Buffer.isBuffer(req.body)) {
    buffer = req.body;
  }

  const document = await documentService.uploadDocument(
    req.db,
    {
      buffer,
      fileName: fileName || "document",
      mimeType: mimeType || "application/octet-stream",
      // Accept `kind` (or the legacy `type`); the service validates and defaults.
      kind: kind || type,
    },
    req.auth,
    req.context,
  );

  return sendSuccess(res, { statusCode: 201, message: "Document uploaded", data: { document } });
});

export const getOne = asyncHandler(async (req, res) => {
  const document = await documentService.getDocument(req.db, req.params.id);
  return sendSuccess(res, { message: "OK", data: { document } });
});

export const download = asyncHandler(async (req, res) => {
  const { buffer, fileName, mimeType } = await documentService.downloadDocument(req.db, req.params.id);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.send(buffer);
});

export default { upload, getOne, download };

import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { saveFile, getFile } from "../../core/storage.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./document.repository.js";

/**
 * Document service — uploads and manages clinical documents, scans, and attachments.
 */

// The Prisma DocumentKind enum. Guarding the incoming value keeps a bad client
// payload from surfacing as a raw Prisma enum error.
const DOCUMENT_KINDS = new Set([
  "LOGO",
  "LETTERHEAD",
  "SIGNATURE",
  "FOOTER",
  "RESULT_PDF",
  "RESULT_UPLOAD",
  "OTHER",
]);

export async function uploadDocument(db, { buffer, fileName, mimeType, kind = "RESULT_UPLOAD" }, auth, reqContext) {
  if (!buffer || !buffer.length || !fileName) {
    throw ApiError.badRequest("File content and fileName are required");
  }

  const safeKind = DOCUMENT_KINDS.has(kind) ? kind : "RESULT_UPLOAD";
  const resolvedMime = mimeType || "application/octet-stream";

  const { storageKey, fileSizeBytes, checksum } = await saveFile(buffer, {
    fileName,
    mimeType: resolvedMime,
    organizationId: auth.organizationId,
  });

  // Column names are `kind` and `sizeBytes`; organizationId/branchId are stamped
  // by the scoped client (Document is a tenant model).
  const doc = await repo.create(db, {
    kind: safeKind,
    fileName,
    mimeType: resolvedMime,
    sizeBytes: fileSizeBytes,
    storageKey,
    checksum,
    createdBy: auth.userId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.DOCUMENT_CREATE || "DOCUMENT_CREATE",
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Document",
    entityId: doc.id,
    newValue: { fileName, kind: safeKind, sizeBytes: fileSizeBytes },
    context: reqContext,
  });

  return doc;
}

export async function getDocument(db, id) {
  const doc = await repo.findById(db, id);
  if (!doc) throw ApiError.notFound("Document not found");
  return doc;
}

export async function downloadDocument(db, id) {
  const doc = await repo.findById(db, id);
  if (!doc) throw ApiError.notFound("Document not found");

  const fileBuffer = await getFile(doc.storageKey);
  return {
    buffer: fileBuffer,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
  };
}

export default {
  uploadDocument,
  getDocument,
  downloadDocument,
};

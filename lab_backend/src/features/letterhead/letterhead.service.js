import { ApiError } from "../../core/ApiError.js";
import { writeAudit } from "../../core/audit.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";
import * as repo from "./letterhead.repository.js";

/**
 * Letterhead service.
 *
 * A laboratory's letterhead (logo/banner/signature images + contact text) is a
 * per-organization singleton used to brand generated diagnostic reports. Managing
 * it is a Lab Admin capability (LETTERHEAD_MANAGE); the org context comes from the
 * tenant-scoped client, so a caller can only ever read/write their own lab's row.
 */

// Only these keys may be written; unknown keys are ignored, and absent keys are
// left untouched (partial update — sending just { phone } won't clear the logo).
const WRITABLE_FIELDS = [
  "logoDocumentId",
  "letterheadDocumentId",
  "signatureDocumentId",
  "footerText",
  "address",
  "phone",
  "email",
];

export async function getLetterhead(db, auth) {
  if (!auth.organizationId) {
    throw ApiError.badRequest("An organization context is required", {
      code: "ORG_CONTEXT_REQUIRED",
    });
  }
  return repo.findByOrg(db, auth.organizationId);
}

export async function updateLetterhead(db, input, auth, reqContext) {
  if (!auth.organizationId) {
    throw ApiError.badRequest("An organization context is required", {
      code: "ORG_CONTEXT_REQUIRED",
    });
  }

  const data = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in input) data[key] = input[key];
  }

  const letterhead = await repo.upsertForOrg(db, auth.organizationId, data, auth.userId);

  await writeAudit({
    action: AUDIT_ACTIONS.LETTERHEAD_UPDATE,
    organizationId: auth.organizationId,
    actorId: auth.userId,
    entityType: "Letterhead",
    entityId: letterhead.id,
    // Record which fields were touched, not their values (some are asset ids).
    newValue: { fields: Object.keys(data) },
    context: reqContext,
  });

  return letterhead;
}

export default { getLetterhead, updateLetterhead };

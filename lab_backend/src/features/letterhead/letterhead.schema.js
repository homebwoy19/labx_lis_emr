import { z } from "zod";

/**
 * Letterhead schemas.
 *
 * All fields are optional so the Lab Admin can patch one thing at a time; a field
 * sent as null clears it (e.g. remove the logo). Image assets are uploaded first
 * through POST /documents/upload, and their returned document ids are stored here.
 */

// A trimmed string that may also be null (to clear) — absent means "leave as is".
const clearableText = (max) => z.string().trim().max(max).nullable().optional();
const clearableUuid = (label) => z.string().uuid(label).nullable().optional();

export const updateLetterheadSchema = {
  body: z.object({
    logoDocumentId: clearableUuid("Invalid logo document id"),
    letterheadDocumentId: clearableUuid("Invalid letterhead document id"),
    signatureDocumentId: clearableUuid("Invalid signature document id"),
    footerText: clearableText(2000),
    address: clearableText(500),
    phone: clearableText(50),
    // Allow a valid email, an empty string (treated as clear), or null.
    email: z
      .union([z.string().trim().email("Invalid email"), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
  }),
};

export default { updateLetterheadSchema };

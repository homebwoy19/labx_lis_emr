/**
 * Letterhead repository.
 *
 * Letterhead is a per-organization singleton (organizationId is unique). It is a
 * tenant model, so the scoped client also filters/stamps organizationId; we pass
 * it explicitly here too for clarity and defense-in-depth.
 */

const LETTERHEAD_SELECT = {
  id: true,
  organizationId: true,
  logoDocumentId: true,
  letterheadDocumentId: true,
  signatureDocumentId: true,
  footerText: true,
  address: true,
  phone: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};

export async function findByOrg(db, organizationId) {
  return db.letterhead.findFirst({ where: { organizationId }, select: LETTERHEAD_SELECT });
}

export async function upsertForOrg(db, organizationId, data, actorId) {
  return db.letterhead.upsert({
    where: { organizationId },
    // updatedBy is stamped on every write; createdBy is set once, on create,
    // and never rewritten by later edits.
    update: { ...data, updatedBy: actorId ?? null },
    create: { organizationId, ...data, createdBy: actorId ?? null, updatedBy: actorId ?? null },
    select: LETTERHEAD_SELECT,
  });
}

export default { findByOrg, upsertForOrg };

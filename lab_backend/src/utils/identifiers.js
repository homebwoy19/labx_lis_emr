import { prisma } from "../core/prisma.js";

/**
 * Sequence generators for human-readable identifiers.
 *
 * Both patient and order codes must be unique per laboratory and gapless-ish.
 * We use an atomic increment on the Organization row inside a transaction so
 * concurrent requests cannot allocate the same number (the row update takes a
 * lock for the duration of the transaction).
 *
 *   Patient: <ACRONYM>-PID-0000001   e.g. MDL-PID-0000001
 *   Order:   ORD-<YEAR>-0000001
 */
const PID_WIDTH = 7;
const ORDER_WIDTH = 4;

function pad(num, width) {
  return String(num).padStart(width, "0");
}

/**
 * Allocates the next patient code for an organization.
 * Must be called within a Prisma transaction (`tx`) for atomicity.
 */
export async function nextPatientCode(tx, organizationId) {
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { patientSeq: { increment: 1 } },
    select: { acronym: true, patientSeq: true },
  });
  return `${org.acronym}-PID-${pad(org.patientSeq, PID_WIDTH)}`;
}

/**
 * Allocates the next order code for an organization.
 * Must be called within a Prisma transaction (`tx`).
 */
export async function nextOrderCode(tx, organizationId, year) {
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { orderSeq: { increment: 1 } },
    select: { orderSeq: true },
  });
  return `ORD-${year}-${pad(org.orderSeq, ORDER_WIDTH)}`;
}

const SAMPLE_WIDTH = 2;

/**
 * Formats a sample accession barcode from its order code + per-order index.
 * Because orderCode is unique per laboratory, `<orderCode>-S01` is also unique
 * per laboratory (enforced by the Sample @@unique([organizationId, barcode])).
 *
 *   ORD-2026-0141  +  1  ->  ORD-2026-0141-S01
 */
export function formatSampleBarcode(orderCode, index) {
  return `${orderCode}-S${pad(index, SAMPLE_WIDTH)}`;
}

/**
 * Convenience wrapper that runs the allocation in its own transaction when the
 * caller isn't already inside one.
 */
export async function allocatePatientCode(organizationId) {
  return prisma.$transaction((tx) => nextPatientCode(tx, organizationId));
}

export default {
  nextPatientCode,
  nextOrderCode,
  formatSampleBarcode,
  allocatePatientCode,
};

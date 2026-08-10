/**
 * Payment repository.
 *
 * Payment is a tenant model (organizationId + branchId) so the scoped client
 * auto-filters and stamps it. Prisma returns Decimal amounts as Decimal objects;
 * the shaper coerces them to plain numbers for the JSON response contract.
 */

const PAYMENT_SELECT = {
  id: true,
  orderId: true,
  amount: true,
  method: true,
  status: true,
  reference: true,
  paidAt: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
};

/** Coerces the Decimal amount to a plain number for the response. */
export function shapePayment(payment) {
  if (!payment) return payment;
  return { ...payment, amount: payment.amount == null ? null : Number(payment.amount) };
}

export async function findById(db, id) {
  const payment = await db.payment.findFirst({ where: { id, deletedAt: null }, select: PAYMENT_SELECT });
  return shapePayment(payment);
}

export async function create(db, data) {
  const payment = await db.payment.create({ data, select: PAYMENT_SELECT });
  return shapePayment(payment);
}

export async function list(db, { skip, take, sortBy, sortOrder, status, method, orderId }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (method) where.method = method;
  if (orderId) where.orderId = orderId;

  const [total, data] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: PAYMENT_SELECT,
    }),
  ]);

  return { total, data: data.map(shapePayment) };
}

/** Sums settled (PAID) payments for an order as a plain number. */
export async function sumSettledForOrder(db, orderId) {
  const agg = await db.payment.aggregate({
    where: { orderId, status: "PAID", deletedAt: null },
    _sum: { amount: true },
  });
  return agg._sum.amount == null ? 0 : Number(agg._sum.amount);
}

export default { shapePayment, findById, create, list, sumSettledForOrder };

/**
 * Standard success-response envelope.
 *
 * Every successful endpoint returns the same shape so the frontend can rely on
 * a single contract:
 *   { success: true, message, data, meta }
 */
export function sendSuccess(
  res,
  { statusCode = 200, message = "OK", data = null, meta } = {},
) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Build a pagination meta object from total count + query params.
 */
export function paginationMeta({ total, page, limit }) {
  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

export default sendSuccess;

import { randomUUID } from "node:crypto";

/**
 * Assigns each request a stable ID (echoed back in the response header and used
 * in logs + audit records) and captures client metadata used for auditing.
 */
export function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.id = requestId;
  req.context = {
    requestId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || null,
  };
  res.setHeader("X-Request-Id", requestId);
  next();
}

export default requestContext;

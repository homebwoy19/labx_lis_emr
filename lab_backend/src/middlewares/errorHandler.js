import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../core/ApiError.js";
import { logger } from "../core/logger.js";
import { config } from "../config/index.js";

/**
 * Centralized error handler — the single place that converts any thrown error
 * into a consistent failure envelope. Stack traces are NEVER sent to clients;
 * unexpected errors are logged in full and reported generically.
 *
 * Failure shape:
 *   { success: false, error: { code, message, details }, requestId }
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    ({ statusCode, code, message, details } = mapPrismaError(err));
  } else if (err?.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request payload too large";
  }

  const logPayload = {
    err,
    requestId: req.id,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
  };

  if (statusCode >= 500) {
    logger.error(logPayload, "unhandled error");
  } else {
    logger.warn(logPayload, "request error");
  }

  const body = {
    success: false,
    error: { code, message },
    requestId: req.id,
  };
  if (details) body.error.details = details;
  // Expose stack only in non-production to aid local debugging.
  if (!config.isProd && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}

function mapPrismaError(err) {
  switch (err.code) {
    case "P2002":
      return {
        statusCode: 409,
        code: "DUPLICATE",
        message: "A record with these values already exists",
        details: { fields: err.meta?.target },
      };
    case "P2025":
      return { statusCode: 404, code: "NOT_FOUND", message: "Record not found" };
    case "P2003":
      return {
        statusCode: 409,
        code: "FOREIGN_KEY_CONSTRAINT",
        message: "Related record constraint failed",
        details: err.meta,
      };
    default: {
      const cleanMsg = err.message ? err.message.split("\n").filter(Boolean).pop()?.trim() : null;
      return {
        statusCode: 400,
        code: "DATABASE_ERROR",
        message: cleanMsg || "Database request failed",
        details: err.meta || { code: err.code },
      };
    }
  }
}

export default errorHandler;

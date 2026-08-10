/**
 * Operational (expected) application error.
 *
 * Anything thrown as an ApiError is a known, handled condition and is safe to
 * surface to the client. Unexpected errors (bugs) are caught by the global
 * handler and reported generically so stack traces never leak.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code || httpCodeFor(statusCode);
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad request", opts) {
    return new ApiError(400, message, opts);
  }
  static unauthorized(message = "Unauthorized", opts) {
    return new ApiError(401, message, opts);
  }
  static forbidden(message = "Forbidden", opts) {
    return new ApiError(403, message, opts);
  }
  static notFound(message = "Resource not found", opts) {
    return new ApiError(404, message, opts);
  }
  static conflict(message = "Conflict", opts) {
    return new ApiError(409, message, opts);
  }
  static unprocessable(message = "Unprocessable entity", opts) {
    return new ApiError(422, message, opts);
  }
  static tooManyRequests(message = "Too many requests", opts) {
    return new ApiError(429, message, opts);
  }
  static internal(message = "Internal server error", opts) {
    return new ApiError(500, message, opts);
  }
}

function httpCodeFor(statusCode) {
  const map = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "UNPROCESSABLE_ENTITY",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
  };
  return map[statusCode] || "ERROR";
}

export default ApiError;

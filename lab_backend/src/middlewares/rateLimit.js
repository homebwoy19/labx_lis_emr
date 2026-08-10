import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

/**
 * Rate limiting configurations.
 *
 * General API limiter applies to all routes; stricter auth limiter protects
 * login/refresh/password-reset endpoints. Both are disabled in test mode.
 */

const skip = () => config.isTest;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again later",
      },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 auth attempts per 15 min
  skipSuccessfulRequests: true, // only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many authentication attempts, please try again later",
      },
    });
  },
});

export default { apiLimiter, authLimiter };

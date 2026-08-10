import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { config } from "../config/index.js";

/**
 * Signs a short-lived access token carrying identity + tenant claims.
 * The access token is stateless: middleware trusts its claims without a DB hit.
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
    issuer: config.appName,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: config.appName });
}

/**
 * Refresh tokens are opaque random strings (not JWTs). We persist only a SHA-256
 * hash; the raw value lives solely in the client's HttpOnly cookie. On use, the
 * token is rotated: the old row is revoked and a fresh token issued.
 */
export function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString("base64url");
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Opaque single-use token for email verification / password reset.
 */
export function generateVerificationToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export default {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateVerificationToken,
};

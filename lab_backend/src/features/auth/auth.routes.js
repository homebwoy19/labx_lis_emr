import { Router } from "express";
import * as controller from "./auth.controller.js";
import * as schema from "./auth.schema.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authLimiter } from "../../middlewares/rateLimit.js";

/**
 * Auth routes — mounted at /api/v1/auth.
 *
 * Public endpoints (login, refresh, forgot/reset password) are protected by the
 * stricter authLimiter. Session-bound endpoints (logout, change-password, me)
 * require a valid access token.
 */
const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and receive an access token + refresh cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               deviceId: { type: string }
 *               deviceName: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post("/login", authLimiter, validate(schema.loginSchema), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh cookie and issue a new access token
 *     responses:
 *       200: { description: Token refreshed }
 *       401: { description: Invalid or reused refresh token }
 */
router.post("/refresh", authLimiter, validate(schema.refreshSchema), controller.refresh);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     responses:
 *       200: { description: Uniform acknowledgement }
 */
router.post(
  "/forgot-password",
  authLimiter,
  validate(schema.forgotPasswordSchema),
  controller.forgotPassword,
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using a single-use token
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
router.post(
  "/reset-password",
  authLimiter,
  validate(schema.resetPasswordSchema),
  controller.resetPassword,
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current device session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post("/logout", authenticate, validate(schema.logoutSchema), controller.logout);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the authenticated user's password
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Password changed }
 *       400: { description: Current password incorrect }
 */
router.post(
  "/change-password",
  authenticate,
  validate(schema.changePasswordSchema),
  controller.changePassword,
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 */
router.get("/me", authenticate, controller.me);

export default router;

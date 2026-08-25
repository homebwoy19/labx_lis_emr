import { asyncHandler } from "../../core/asyncHandler.js";
import { sendSuccess } from "../../core/ApiResponse.js";
import {
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} from "../../utils/cookies.js";
import * as authService from "./auth.service.js";

/**
 * Auth controller — thin HTTP adapter over the auth service.
 *
 * Responsibilities: read validated input + context, call the service, translate
 * the result into HTTP (status, cookies, envelope). No business logic here.
 */

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(
    { ...req.body, tenantId: req.tenant?.id, tenantSlug: req.tenant?.slug },
    req.context,
  );

  setRefreshCookie(res, result.refreshToken, result.refreshTokenMaxAge);

  return sendSuccess(res, {
    message: "Login successful",
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const result = await authService.refresh(rawToken, req.context);

  setRefreshCookie(res, result.refreshToken, result.refreshTokenMaxAge);

  return sendSuccess(res, {
    message: "Token refreshed",
    data: { user: result.user, accessToken: result.accessToken },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(rawToken, req.context, req.auth?.userId);

  clearRefreshCookie(res);

  return sendSuccess(res, { message: "Logged out" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email, req.context);

  // Uniform response regardless of whether the email exists.
  return sendSuccess(res, {
    message: "If an account exists for that email, a reset link has been sent",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body, req.context);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: "Password has been reset. Please log in again." });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(
    {
      userId: req.auth.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      currentSessionId: req.auth.sessionId,
    },
    req.context,
  );

  return sendSuccess(res, { message: "Password changed successfully" });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.auth.userId);
  return sendSuccess(res, { message: "OK", data: { user } });
});

export default {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
};

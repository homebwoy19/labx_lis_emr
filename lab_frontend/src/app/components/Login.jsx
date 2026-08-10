import React, { useState } from "react";
import { HeartPulse, RefreshCw, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Card, FormField, Input, Alert, Btn } from "./UIComponents";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";

/**
 * Login screen — real, credential-only authentication.
 *
 * There is no role selection: the user enters their email + password and the
 * backend returns their actual role and permissions. `mode` decides the surface:
 *   • "platform" — the Super Admin login (`/super-admin`), no tenant
 *   • "tenant"   — a laboratory login (`/foundation`, `/medlab`); `tenant`
 *                  carries the resolved organization (name/slug) for branding and
 *                  is sent to the backend so cross-tenant logins are rejected.
 *
 * On success `onSuccess(user)` is called so the router can redirect by role.
 */
export function LoginScreen({ mode = "tenant", tenant = null, onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("login");

  const isPlatform = mode === "platform";
  const title = isPlatform
    ? "Platform Administration"
    : tenant?.name || "Laboratory Login";
  const subtitle = isPlatform
    ? "Super Admin sign-in"
    : "Laboratory Information System";

  async function handleLogin(e) {
    e?.preventDefault?.();
    setError("");
    setLoading(true);
    try {
      const user = await login({
        email: email.trim(),
        password,
        slug: isPlatform ? undefined : tenant?.slug,
        tenant: isPlatform ? null : tenant,
      });
      onSuccess?.(user);
    } catch (err) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (screen === "forgot") {
    return <ForgotPassword onBack={() => setScreen("login")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
              isPlatform ? "bg-indigo-500" : "bg-blue-500"
            }`}
          >
            {isPlatform ? (
              <ShieldCheck className="w-6 h-6 text-white" />
            ) : (
              <HeartPulse className="w-6 h-6 text-white" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="text-sm text-white/60 mt-1">{subtitle}</p>
        </div>

        <Card className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError("")} />}
          <form className="space-y-4" onSubmit={handleLogin}>
            <FormField label="Email Address" required>
              <Input
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Password" required>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </FormField>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />{" "}
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setScreen("forgot")}
              >
                Forgot password?
              </button>
            </div>
            <Btn
              type="submit"
              variant="primary"
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}

/** Forgot-password sub-screen — hits the real endpoint (uniform ack). */
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
    } catch {
      // Endpoint is intentionally uniform; ignore errors client-side.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Reset Password</h1>
          <p className="text-sm text-white/60 mt-1">
            Enter your email to receive a reset link
          </p>
        </div>
        <Card className="p-6 space-y-4">
          {sent ? (
            <Alert
              type="success"
              message="If an account exists for that email, a reset link has been sent."
            />
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <FormField label="Email Address" required>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>
              <Btn
                type="submit"
                variant="primary"
                className="w-full justify-center"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </Btn>
            </form>
          )}
          <button
            type="button"
            className="w-full text-sm text-center text-primary hover:underline"
            onClick={onBack}
          >
            Back to Login
          </button>
        </Card>
      </div>
    </div>
  );
}

export default LoginScreen;

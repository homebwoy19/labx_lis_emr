import React, { useState } from "react";
import { HeartPulse, RefreshCw } from "lucide-react";
import { Card, FormField, Input, Alert, Btn } from "./UIComponents";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("alice@medlab.co.ke");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState("login");

  function handleLogin() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin("admin");
    }, 1000);
  }

  if (screen === "forgot")
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
            <Alert
              type="info"
              message="A reset link will be sent to your registered email address."
            />
            <FormField label="Email Address" required>
              <Input type="email" placeholder="you@medlab.co.ke" />
            </FormField>
            <Btn
              variant="primary"
              className="w-full justify-center"
              onClick={() => setScreen("login")}
            >
              Send Reset Link
            </Btn>
            <button
              className="w-full text-sm text-center text-primary hover:underline"
              onClick={() => setScreen("login")}
            >
              Back to Login
            </button>
          </Card>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">
            Foundation Lab LIS
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Laboratory Information System
          </p>
        </div>
        <Card className="p-6 space-y-4">
          <FormField label="Email Address">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" />{" "}
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <button
              className="text-primary hover:underline"
              onClick={() => setScreen("forgot")}
            >
              Forgot password?
            </button>
          </div>
          <Btn
            variant="primary"
            className="w-full justify-center"
            onClick={handleLogin}
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
        </Card>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {[
            "admin",
            "receptionist",
            "phlebotomist",
            "lab_tech",
            "radiographer",
          ].map((r) => (
            <button
              key={r}
              onClick={() => onLogin(r)}
              className="px-2 py-1.5 rounded text-xs bg-white/10 text-white hover:bg-white/20 transition-colors capitalize"
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

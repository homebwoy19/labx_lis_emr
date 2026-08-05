import React, { useState } from "react";
import { HeartPulse, CheckCircle } from "lucide-react";
import { Card, FormField, Input, Alert, Btn } from "./UIComponents";

export function ResetPasswordScreen({ onComplete }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setError("");
    setSuccess(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e3d] to-[#1a3a6e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Change Password</h1>
          <p className="text-xs text-white/60 mt-1">
            Set your new account password
          </p>
        </div>

        <Card className="p-6 space-y-4">
          {error && (
            <Alert type="error" message={error} onClose={() => setError("")} />
          )}
          {success && (
            <Alert
              type="success"
              message="Password updated successfully! Redirecting..."
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Current / Temp Password" required>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </FormField>
            <FormField label="New Password" required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>
            <FormField label="Confirm New Password" required>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormField>
            <Btn
              type="submit"
              variant="primary"
              className="w-full justify-center"
            >
              Update Password
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}

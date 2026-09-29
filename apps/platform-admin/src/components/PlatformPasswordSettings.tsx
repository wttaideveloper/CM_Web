"use client";

import { useState, type FormEvent } from "react";

type ResetStep = "send-code" | "verify-code" | "new-password" | "complete";
type ResetAction = "forgot-password" | "verify-reset-code" | "reset-password";

async function submitPasswordReset(action: ResetAction, payload: Record<string, string>): Promise<void> {
  const response = await fetch(`/api/platform-super-admin/password-reset/${action}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.ok) return;

  const responseBody: unknown = await response.json().catch(() => null);
  const details = typeof responseBody === "object" && responseBody !== null
    ? (responseBody as { detail?: unknown; message?: unknown })
    : null;
  const errorMessage = typeof details?.detail === "string"
    ? details.detail
    : typeof details?.message === "string"
      ? details.message
      : `Unable to complete the password reset (HTTP ${response.status}).`;
  throw new Error(errorMessage);
}

/** Provides the documented Super Admin email-code password reset flow from Account Settings. */
export function PlatformPasswordSettings({ email }: { email: string }) {
  const [step, setStep] = useState<ResetStep>("send-code");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPasswordReset("forgot-password", { email });
      setStep("verify-code");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a password reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPasswordReset("verify-reset-code", { email, otp });
      setStep("new-password");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to verify the reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await submitPasswordReset("reset-password", { email, otp, password });
      setOtp("");
      setPassword("");
      setConfirmation("");
      setStep("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update your password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPasswordReset("forgot-password", { email });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend a password reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#06201c]">Password &amp; security</h2>
      <p className="mt-1 text-sm text-[#52736a]">Reset the password for {email || "your Super Admin account"} using an email verification code.</p>

      {step === "send-code" ? (
        <form onSubmit={sendCode} className="mt-5">
          {!email ? <p role="alert" className="mb-3 text-sm font-semibold text-[#b42318]">Your Super Admin profile does not include an email address, so a reset code cannot be requested.</p> : null}
          <button type="submit" disabled={!email || isSubmitting} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-50">
            {isSubmitting ? "Sending code…" : "Send verification code"}
          </button>
        </form>
      ) : null}
      {step === "verify-code" ? (
        <form onSubmit={verifyCode} className="mt-5 space-y-4">
          <p role="status" className="text-sm text-[#52736a]">If this email is eligible, a verification code will be sent.</p>
          <label className="block text-sm font-semibold text-[#16332b]">
            Six-digit verification code
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
              className="mt-1.5 h-10 w-full max-w-xs rounded-xl border border-[#d7e5df] px-3 text-sm tracking-[0.3em]"
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <button type="submit" disabled={isSubmitting || otp.length !== 6} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-50">
              {isSubmitting ? "Verifying…" : "Verify code"}
            </button>
            <button type="button" onClick={() => void resendCode()} disabled={isSubmitting} className="text-sm font-semibold text-[#1f6a58] underline disabled:opacity-50">
              Resend code
            </button>
          </div>
        </form>
      ) : null}
      {step === "new-password" ? (
        <form onSubmit={resetPassword} className="mt-5 max-w-md space-y-4">
          <label className="block text-sm font-semibold text-[#16332b]">
            New password
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
          </label>
          <label className="block text-sm font-semibold text-[#16332b]">
            Confirm new password
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(null); }} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
          </label>
          <button type="submit" disabled={isSubmitting} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-50">
            {isSubmitting ? "Updating password…" : "Update password"}
          </button>
        </form>
      ) : null}
      {step === "complete" ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p role="status" className="text-sm font-semibold text-[#167550]">Your password has been updated.</p>
          <button type="button" onClick={() => setStep("send-code")} className="text-sm font-semibold text-[#1f6a58] underline">Reset password again</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    </section>
  );
}

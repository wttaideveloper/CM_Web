"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  requestPasswordResetCode,
  resetPassword,
  verifyPasswordResetCode,
} from "@/services/auth.service";
import {
  getPasswordRequirements,
  type PasswordRequirementsResponse,
} from "@/services/registration-ui.service";

type PasswordResetModalProps = {
  email: string;
  onClose: () => void;
  onSuccess: () => void;
};

type ResetStep = "send" | "verify" | "password" | "success";
type PasswordRule = { label: string; passes: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function findRequirementValue(response: PasswordRequirementsResponse | null, keys: string[]) {
  const candidates: unknown[] = [];
  if (response) {
    candidates.push(response.data, response.raw);
  }

  for (const source of candidates) {
    if (!isRecord(source)) {
      continue;
    }

    for (const container of [source, source.policy, source.requirements, source.rules, source.data]) {
      if (!isRecord(container)) {
        continue;
      }

      for (const key of keys) {
        if (key in container) {
          return container[key];
        }
      }
    }
  }

  return null;
}

function getPasswordRules(response: PasswordRequirementsResponse | null, password: string): PasswordRule[] | null {
  const minimumLength = ["minLength", "minimumLength", "min_length", "passwordMinLength", "password_min_length"]
    .map((key) => readPositiveNumber(findRequirementValue(response, [key])))
    .find((value): value is number => value !== null);

  const rules: PasswordRule[] = [];
  if (minimumLength) {
    rules.push({ label: `At least ${minimumLength} characters`, passes: password.length >= minimumLength });
  }

  const ruleDefinitions = [
    { label: "At least one uppercase letter", keys: ["requireUppercase", "requiresUppercase", "uppercaseRequired", "uppercase"] as string[], test: /[A-Z]/ },
    { label: "At least one lowercase letter", keys: ["requireLowercase", "requiresLowercase", "lowercaseRequired", "lowercase"] as string[], test: /[a-z]/ },
    { label: "At least one number", keys: ["requireNumber", "requiresNumber", "numberRequired", "number"] as string[], test: /\d/ },
    { label: "At least one special character", keys: ["requireSpecialCharacter", "requiresSpecialCharacter", "specialCharacterRequired", "special"] as string[], test: /[^A-Za-z0-9]/ },
  ];

  for (const definition of ruleDefinitions) {
    if (findRequirementValue(response, definition.keys) === true) {
      rules.push({ label: definition.label, passes: definition.test.test(password) });
    }
  }

  return rules.length > 0 ? rules : null;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  try {
    const payload = JSON.parse(error.message) as { detail?: unknown; message?: unknown };
    const message = typeof payload.message === "string" ? payload.message : null;
    const detail = typeof payload.detail === "string"
      ? payload.detail
      : Array.isArray(payload.detail)
        ? payload.detail
          .map((item) => isRecord(item) && typeof item.msg === "string" ? item.msg : null)
          .filter((item): item is string => Boolean(item))
          .join(", ")
        : null;

    return detail || message || fallback;
  } catch {
    return error.message;
  }
}

export default function PasswordResetModal({ email, onClose, onSuccess }: PasswordResetModalProps) {
  const [step, setStep] = useState<ResetStep>("send");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirementsResponse | null>(null);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);

  useEffect(() => {
    if (step !== "password") {
      return;
    }

    let isActive = true;
    // Loading state is synchronized with the Step 3 requirements request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingRequirements(true);
    setError(null);

    void getPasswordRequirements()
      .then((response) => {
        if (isActive) {
          setPasswordRequirements(response);
        }
      })
      .catch(() => {
        if (isActive) {
          setPasswordRequirements(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingRequirements(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [step]);

  useEffect(() => {
    if (step !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      onSuccess();
      onClose();
    }, 1300);

    return () => window.clearTimeout(timeout);
  }, [onClose, onSuccess, step]);

  const passwordRules = useMemo(
    () => getPasswordRules(passwordRequirements, password),
    [password, passwordRequirements],
  );
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canResetPassword = Boolean(passwordRules?.every((rule) => rule.passes) && passwordsMatch);

  const sendCode = async () => {
    setIsSubmitting(true);
    setError(null);
    setResendMessage(null);

    try {
      await requestPasswordResetCode(email);
      setStep("verify");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not send a verification code. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await verifyPasswordResetCode(email, otp);
      setStep("password");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "The verification code could not be confirmed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    setIsSubmitting(true);
    setError(null);
    setResendMessage(null);

    try {
      await requestPasswordResetCode(email);
      setResendMessage("A new verification code was sent.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not send a new verification code. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordRules) {
      setError("Password requirements are not available. Please try again shortly.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordRules.every((rule) => rule.passes)) {
      setError("Your password does not meet the required rules.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await resetPassword(email, password);
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setStep("success");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not reset your password. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = step === "verify" ? "Verify Your Email" : step === "password" ? "Create New Password" : "Reset Password";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="reset-password-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="reset-password-title" className="text-lg font-bold text-[#06201c]">{title}</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              {step === "send" ? "We\'ll send a verification code to your account email." : null}
              {step === "verify" ? `Enter the 6-digit verification code sent to ${email}.` : null}
              {step === "password" ? "Choose a new password that meets your account requirements." : null}
              {step === "success" ? "Password updated successfully." : null}
            </p>
          </div>
          {step !== "success" ? (
            <button type="button" onClick={onClose} disabled={isSubmitting} className="text-sm font-semibold text-[#52736a] hover:text-[#06201c]">
              Close
            </button>
          ) : null}
        </div>

        {step === "send" ? (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Email</p>
              <p className="mt-1 text-sm font-semibold text-[#16332b]">{email}</p>
            </div>
            {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}
            <button type="button" onClick={() => void sendCode()} disabled={isSubmitting} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Sending..." : "Send Verification Code"}
            </button>
          </div>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={verifyCode} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-[#16332b]">
              Verification Code
              <input
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm tracking-[0.3em] text-[#06201c] outline-none transition focus:border-[#1f6a58]"
              />
            </label>
            {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}
            {resendMessage ? <p className="text-sm font-medium text-[#167550]">{resendMessage}</p> : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => void resendCode()} disabled={isSubmitting} className="text-sm font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">
                Resend Code
              </button>
              <button type="submit" disabled={isSubmitting || otp.length !== 6} className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={submitPassword} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-[#16332b]">
              New Password
              <input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} autoComplete="new-password" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]" />
            </label>
            <label className="block text-sm font-semibold text-[#16332b]">
              Confirm New Password
              <input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(null); }} autoComplete="new-password" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]" />
            </label>
            {isLoadingRequirements ? <p className="text-sm text-[#52736a]">Loading password requirements...</p> : null}
            {!isLoadingRequirements && passwordRules ? (
              <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#52736a]">Password requirements</p>
                <div className="mt-2 space-y-1.5">
                  {passwordRules.map((rule) => <p key={rule.label} className={`text-xs font-medium ${rule.passes ? "text-[#1f6a58]" : "text-[#667085]"}`}>{rule.passes ? "Met" : "Required"}: {rule.label}</p>)}
                </div>
              </div>
            ) : null}
            {!isLoadingRequirements && !passwordRules ? <p className="text-sm font-medium text-[#b42318]">Password requirements are unavailable. Please try again shortly.</p> : null}
            {confirmPassword.length > 0 && !passwordsMatch ? <p className="text-sm font-medium text-[#b42318]">Passwords do not match.</p> : null}
            {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}
            <button type="submit" disabled={isSubmitting || isLoadingRequirements || !canResetPassword} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : null}

        {step === "success" ? <div className="mt-5 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-medium text-[#167550]">Password updated successfully.</div> : null}
      </div>
    </div>
  );
}

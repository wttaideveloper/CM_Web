"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type ResetStep = "forgot_email" | "verify_otp" | "reset_password" | "success";

type PasswordResetFlowProps = { onBackToLogin: () => void };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestReset(path: string, body: Record<string, string>): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`/api/platform-super-admin/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("password-reset-service-unavailable");
  }
  const responseBody: unknown = await response.json().catch(() => null);
  const responseCode = isRecord(responseBody) && typeof responseBody.code === "string"
    ? responseBody.code.toLowerCase()
    : "";
  const responseDetail = isRecord(responseBody)
    ? [responseBody.detail, responseBody.message].filter((value): value is string => typeof value === "string").join(" ").toLowerCase()
    : "";
  const responseReason = `${responseCode} ${responseDetail}`;
  if (responseCode === "id_not_registered") {
    throw new Error("password-reset-id-not-registered");
  }
  if (response.ok) return true;
  if (response.status === 429) throw new Error("password-reset-rate-limited");
  if (response.status >= 500) throw new Error("password-reset-service-unavailable");
  if (path === "reset-password" && /(reuse|reused|previous|old password|recently used|password history|same as (the )?(current|last|old)|already used)/.test(responseReason)) {
    throw new Error("password-reset-password-reused");
  }
  if (path === "reset-password" && /(at least eight|at least 8|minimum.{0,12}8|8 characters)/.test(responseReason)) {
    throw new Error("password-reset-password-too-short");
  }
  if (path === "reset-password" && /(otp|verification code|expired code|invalid code)/.test(responseReason)) {
    throw new Error("password-reset-invalid-code");
  }
  if (path === "reset-password" && /(password|character|uppercase|lowercase|number|symbol|special)/.test(responseReason)) {
    throw new Error("password-reset-password-policy");
  }
  if (response.status === 403) return false;
  throw new Error("password-reset-request-failed");
}

function getResetErrorMessage(error: unknown, fallback: string, t: (key: string) => string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.message === "password-reset-id-not-registered") return t("superAdminReset.idNotRegistered");
  if (error.message === "password-reset-service-unavailable") return t("superAdminReset.serviceUnavailable");
  if (error.message === "password-reset-rate-limited") return t("superAdminReset.rateLimited");
  if (error.message === "password-reset-password-reused") return t("superAdminReset.passwordPreviouslyUsed");
  if (error.message === "password-reset-password-too-short") return t("superAdminReset.passwordTooShort");
  if (error.message === "password-reset-password-policy") return t("superAdminReset.passwordPolicy");
  if (error.message === "password-reset-invalid-code") return t("superAdminReset.invalidOrExpiredCode");
  return fallback;
}

/** Implements the in-memory-only dedicated Super Admin password reset sequence inside the Shell login page. */
export default function SuperAdminPasswordResetFlow({ onBackToLogin }: PasswordResetFlowProps) {
  const { t } = useTranslation("shell");
  const [step, setStep] = useState<ResetStep>("forgot_email");
  const [email, setEmailValue] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [neutralSent, setNeutralSent] = useState(false);

  const setEmail = (value: string) => {
    setEmailValue(value);
    setError(null);
  };

  const returnToLogin = () => {
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    onBackToLogin();
  };

  const goBack = () => {
    setError(null);
    if (step === "verify_otp") {
      setOtp("");
      setNeutralSent(false);
      setStep("forgot_email");
      return;
    }
    if (step === "reset_password") {
      setStep("verify_otp");
      return;
    }
    returnToLogin();
  };

  const backLabel = step === "verify_otp"
    ? t("superAdminReset.backToEmail")
    : step === "reset_password"
      ? t("superAdminReset.backToVerificationCode")
      : t("superAdminReset.backToLogin");

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await requestReset("forgot-password", { email: email.trim() });
      setNeutralSent(true);
      setStep("verify_otp");
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === "password-reset-id-not-registered") {
        setStep("forgot_email");
        setNeutralSent(false);
      }
      setError(getResetErrorMessage(requestError, t("superAdminReset.genericError"), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setNeutralSent(false);
    try {
      await requestReset("forgot-password", { email: email.trim() });
      setNeutralSent(true);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message === "password-reset-id-not-registered") {
        setStep("forgot_email");
      }
      setError(getResetErrorMessage(requestError, t("superAdminReset.genericError"), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError(t("superAdminReset.invalidCode"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const verified = await requestReset("verify-reset-code", { email: email.trim(), otp });
      if (!verified) throw new Error("password-reset-request-failed");
      setStep("reset_password");
    } catch (requestError) {
      setError(getResetErrorMessage(requestError, t("superAdminReset.genericError"), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(t("superAdminReset.passwordsDoNotMatch"));
      return;
    }
    if (!password || isSubmitting) return;
    if (password.length < 8) {
      setError(t("superAdminReset.passwordTooShort"));
      return;
    }
    if (password.length > 500 || confirmPassword.length > 500) {
      setError(t("superAdminReset.passwordTooLong"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const reset = await requestReset("reset-password", { email: email.trim(), password, otp });
      if (!reset) throw new Error("password-reset-request-failed");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setStep("success");
    } catch (requestError) {
      setError(getResetErrorMessage(requestError, t("superAdminReset.genericError"), t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="space-y-4"><button type="button" onClick={goBack} disabled={isSubmitting} className="text-[13px] font-semibold text-[#0b5b4e] underline disabled:opacity-50">{backLabel}</button>{step === "forgot_email" ? <form onSubmit={sendCode} className="space-y-3.5"><div><h2 className="text-[24px] font-extrabold tracking-tight text-[#041a16]">{t("superAdminReset.emailTitle")}</h2><p className="mt-1.5 text-[14px] text-[#55746b]">{t("superAdminReset.emailDescription")}</p></div><label className="block text-[13px] font-semibold text-[#35544b]">{t("superAdminReset.email")}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-[13px] border border-[#c9ddd7] px-3 text-[14px]" /></label>{error ? <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p> : null}<button type="submit" disabled={isSubmitting} className="h-10 w-full rounded-[13px] bg-[#1f6a58] text-[14px] font-bold text-white disabled:opacity-60">{isSubmitting ? t("superAdminReset.sendingCode") : t("superAdminReset.sendCode")}</button></form> : null}{step === "verify_otp" ? <form onSubmit={verifyOtp} className="space-y-3.5"><div><h2 className="text-[24px] font-extrabold tracking-tight text-[#041a16]">{t("superAdminReset.otpTitle")}</h2><p className="mt-1.5 text-[14px] text-[#55746b]">{t("superAdminReset.otpDescription")}</p></div>{neutralSent ? <p role="status" className="rounded-[13px] bg-[#e9f4ee] px-3 py-2 text-[13px] text-[#1f6a58]">{t("superAdminReset.neutralSent")}</p> : null}<label className="block text-[13px] font-semibold text-[#35544b]">{t("superAdminReset.verificationCode")}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} className="mt-1.5 h-10 w-full rounded-[13px] border border-[#c9ddd7] px-3 text-[14px] tracking-[0.3em]" /></label>{error ? <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p> : null}<div className="flex items-center justify-between gap-3"><button type="button" onClick={() => void resendCode()} disabled={isSubmitting} className="text-[13px] font-semibold text-[#0b5b4e] underline disabled:opacity-50">{isSubmitting ? t("superAdminReset.resendingCode") : t("superAdminReset.resendCode")}</button><button type="submit" disabled={isSubmitting || otp.length !== 6} className="h-10 rounded-[13px] bg-[#1f6a58] px-4 text-[14px] font-bold text-white disabled:opacity-60">{isSubmitting ? t("superAdminReset.verifyingCode") : t("superAdminReset.verifyCode")}</button></div></form> : null}{step === "reset_password" ? <form onSubmit={resetPassword} className="space-y-3.5"><div><h2 className="text-[24px] font-extrabold tracking-tight text-[#041a16]">{t("superAdminReset.resetTitle")}</h2><p className="mt-1.5 text-[14px] text-[#55746b]">{t("superAdminReset.resetDescription")}</p></div><label className="block text-[13px] font-semibold text-[#35544b]">{t("superAdminReset.newPassword")}<input required type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} className="mt-1.5 h-10 w-full rounded-[13px] border border-[#c9ddd7] px-3 text-[14px]" /></label><label className="block text-[13px] font-semibold text-[#35544b]">{t("superAdminReset.confirmPassword")}<input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(null); }} className="mt-1.5 h-10 w-full rounded-[13px] border border-[#c9ddd7] px-3 text-[14px]" /></label>{error ? <p role="alert" className="text-sm font-medium text-[#b42318]">{error}</p> : null}<button type="submit" disabled={isSubmitting || !password || !confirmPassword} className="h-10 w-full rounded-[13px] bg-[#1f6a58] text-[14px] font-bold text-white disabled:opacity-60">{isSubmitting ? t("superAdminReset.resettingPassword") : t("superAdminReset.resetPassword")}</button></form> : null}{step === "success" ? <div className="space-y-4"><h2 className="text-[24px] font-extrabold tracking-tight text-[#041a16]">{t("superAdminReset.successTitle")}</h2><p className="text-[14px] text-[#55746b]">{t("superAdminReset.successDescription")}</p><button type="button" onClick={returnToLogin} className="h-10 w-full rounded-[13px] bg-[#1f6a58] text-[14px] font-bold text-white">{t("superAdminReset.returnToLogin")}</button></div> : null}</div>;
}

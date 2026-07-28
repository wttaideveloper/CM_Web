"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRegistration } from "@/contexts/RegistrationContext";
import { resendVerification, RegistrationApiError, verifyEmail } from "@/services/registration-ui.service";

type VerifyEmailStepProps = {
  onBack: () => void;
  onVerified: () => void;
};

const OTP_LENGTH = 6;

function getOtpErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  return <p className="mt-2 text-sm font-medium text-[#b42318]">{error}</p>;
}

export default function VerifyEmailStep({ onBack, onVerified }: VerifyEmailStepProps) {
  const { email } = useRegistration();
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(45);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);
  const allDigitsEntered = otpDigits.every((digit) => /^\d$/.test(digit));

  useEffect(() => {
    const next = inputRefs.current.find((input) => input && input.value.length === 0);
    next?.focus();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [cooldownSeconds]);

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setErrorMessage(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (!pastedDigits) {
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];
      pastedDigits.split("").forEach((digit, offset) => {
        if (index + offset < OTP_LENGTH) {
          next[index + offset] = digit;
        }
      });
      return next;
    });

    const focusIndex = Math.min(index + pastedDigits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
    setErrorMessage(null);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!allDigitsEntered || isSubmitting) {
      setErrorMessage("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await verifyEmail({
        email: email.trim(),
        otp: otpValue,
      });
      onVerified();
    } catch (error) {
      if (error instanceof RegistrationApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to verify your email.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending || cooldownSeconds > 0) {
      return;
    }

    setIsResending(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await resendVerification({
        email: email.trim(),
      });

      setStatusMessage(response.message || "Verification code resent.");
      setCooldownSeconds(45);
    } catch (error) {
      if (error instanceof RegistrationApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to resend verification code.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#06201c]">Verify your email</h2>
          <p className="text-sm leading-6 text-[#52736a]">
            We&apos;ve sent a 6-digit verification code to
          </p>
          <p className="text-sm font-semibold text-[#06201c]">{email}</p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-[#06201c]">Enter the verification code sent to your email</p>
          <div className="grid grid-cols-6 gap-2 sm:gap-3">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onPaste={(event) => handlePaste(event, index)}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digit && index > 0) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                className="h-11 rounded-[14px] border border-[#d8e4df] bg-white text-center text-lg font-bold text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-[#52736a]">Enter the verification code sent to your email</p>
          {getOtpErrorMessage(errorMessage ?? undefined)}
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-[#d1fadf] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#027a48]">
            {statusMessage}
          </div>
        ) : null}

        <div className="space-y-2 rounded-[14px] border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3">
          <p className="text-sm text-[#35544b]">
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={isResending || cooldownSeconds > 0}
              className="font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Resend code
            </button>
          </p>
          <p className="text-sm text-[#52736a]">
            {cooldownSeconds > 0 ? `Resend available in ${cooldownSeconds}s` : "Resend available now"}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 mt-5 border-t border-[#e5ece8] bg-white/95 pt-4 backdrop-blur-sm">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm font-bold text-[#06201c] transition hover:bg-[#f7fbf9]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 items-center justify-center rounded-[14px] text-sm font-semibold text-[#1f6a58] transition hover:underline"
          >
            Edit email
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-auto inline-flex h-11 items-center justify-center rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
          >
            {isSubmitting ? "Verifying..." : "Verify Email"}
          </button>
        </div>
      </div>
    </form>
  );
}

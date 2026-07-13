"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useRegistration } from "@/contexts/RegistrationContext";
import {
  getPasswordRequirements,
  registerOwnerAccount,
  type PasswordRequirementsResponse,
  RegistrationApiError,
} from "@/services/auth.service";
import { countryDialOptions, type CountryDialOption } from "./register.constants";

type PasswordRuleKey = "minLength" | "uppercase" | "lowercase" | "number" | "special";

type PasswordRuleState = Record<PasswordRuleKey, boolean>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PASSWORD_MIN_LENGTH = 8;

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 1.4-.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.2C3.9 7.8 2 10.3 2 12c0 0 3.5 7 10 7 1.9 0 3.6-.5 5.1-1.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.8 17.8C20.1 16.2 22 13.7 22 12c0 0-3.5-7-10-7-1.1 0-2.1.1-3 .4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
      <path d="m4.5 10.5 3.1 3.1 7.9-7.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
      <path d="m5.5 5.5 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m14.5 5.5-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SuccessMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#1f6a58]" viewBox="0 0 20 20" fill="none">
      <path d="m4.5 10.5 3.1 3.1 7.9-7.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getFieldError(message?: string | null) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b42318]">{message}</p>;
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCountryByName(countryName: string): CountryDialOption | null {
  return countryDialOptions.find((country) => country.name === countryName) ?? null;
}

function sanitizeLocalPhone(value: string) {
  return value.replace(/\D/g, "");
}

function splitLocalPhoneValue(country: CountryDialOption | null, phoneValue: string) {
  const digitsOnly = sanitizeLocalPhone(phoneValue);

  if (!country) {
    return digitsOnly;
  }

  const compactPhoneValue = phoneValue.replace(/\s+/g, "");
  const dialCode = country.dialCode.replace(/\s+/g, "");

  if (compactPhoneValue.startsWith(dialCode)) {
    return sanitizeLocalPhone(compactPhoneValue.slice(dialCode.length));
  }

  return digitsOnly;
}

function buildCombinedPhone(country: CountryDialOption | null, localPhone: string) {
  if (!country) {
    return "";
  }

  const sanitizedLocalPhone = sanitizeLocalPhone(localPhone);
  if (!sanitizedLocalPhone) {
    return "";
  }

  return `${country.dialCode}${sanitizedLocalPhone}`;
}

function extractPasswordMinimumLength(response: PasswordRequirementsResponse | null) {
  const fallbacks: unknown[] = [];

  if (response) {
    fallbacks.push(response.data, response.raw);
  }

  for (const source of fallbacks) {
    if (!isRecord(source)) {
      continue;
    }

    const directCandidates = [
      source.minLength,
      source.minimumLength,
      source.min_length,
      source.passwordMinLength,
      source.password_min_length,
    ];

    for (const candidate of directCandidates) {
      const parsed = readPositiveNumber(candidate);
      if (parsed) {
        return parsed;
      }
    }

    const nestedCandidates = [source.policy, source.data, source.result, source.payload, source.requirements, source.rules];
    for (const nested of nestedCandidates) {
      if (!isRecord(nested)) {
        continue;
      }

      const nestedMinimumLength = [
        nested.minLength,
        nested.minimumLength,
        nested.min_length,
        nested.passwordMinLength,
        nested.password_min_length,
      ]
        .map(readPositiveNumber)
        .find((value): value is number => Boolean(value));

      if (nestedMinimumLength) {
        return nestedMinimumLength;
      }
    }
  }

  return DEFAULT_PASSWORD_MIN_LENGTH;
}

function getPasswordStrengthLabel(passedRuleCount: number) {
  if (passedRuleCount <= 1) {
    return "Weak";
  }

  if (passedRuleCount === 2) {
    return "Fair";
  }

  if (passedRuleCount <= 4) {
    return "Good";
  }

  return "Strong";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function OwnerDetailsStep() {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    phone,
    country,
    userId,
    ownerAccountCreated,
    emailVerified,
    registeredEmail,
    updateRegistration,
    advanceToStep,
  } = useRegistration();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [pendingEmailChange, setPendingEmailChange] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirementsResponse | null>(null);
  const [localPhone, setLocalPhone] = useState(() => splitLocalPhoneValue(getCountryByName(country), phone));
  const passwordRequirementsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    void getPasswordRequirements()
      .then((response) => {
        if (!isActive) {
          return;
        }

        setPasswordRequirements(response);
      })
      .catch(() => {
        if (isActive) {
          setPasswordRequirements(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const selectedCountry = useMemo(() => getCountryByName(country), [country]);
  const passwordMinimumLength = useMemo(
    () => extractPasswordMinimumLength(passwordRequirements),
    [passwordRequirements],
  );

  const passwordRules = useMemo<PasswordRuleState>(
    () => ({
      minLength: password.length >= passwordMinimumLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password, passwordMinimumLength],
  );

  const passedPasswordRuleCount = Object.values(passwordRules).filter(Boolean).length;
  const passwordStrengthLabel = getPasswordStrengthLabel(passedPasswordRuleCount);
  const passwordStrengthWidth = `${(passedPasswordRuleCount / 5) * 100}%`;
  const shouldShowPasswordPanel = isPasswordFocused || password.length > 0;

  useEffect(() => {
    if (!isPasswordFocused) {
      return;
    }

    const timeout = window.setTimeout(() => {
      passwordRequirementsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isPasswordFocused]);

  const isFullNameValid = fullName.trim().length > 0;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isCountrySelected = Boolean(selectedCountry);
  const isPhoneValid = sanitizeLocalPhone(localPhone).length > 0;
  const arePasswordRulesMet = Object.values(passwordRules).every(Boolean);
  const arePasswordsMatching = confirmPassword.length > 0 && password.length > 0 && confirmPassword === password;
  const isFormReady =
    isFullNameValid &&
    isEmailValid &&
    arePasswordRulesMet &&
    arePasswordsMatching &&
    isCountrySelected &&
    isPhoneValid &&
    agreeToTerms &&
    !isSubmitting;

  const confirmPasswordLiveMismatch =
    confirmPassword.length > 0 && password.length > 0 && confirmPassword !== password;

  const normalizedEmail = normalizeEmail(email);
  const normalizedRegisteredEmail = normalizeEmail(registeredEmail);
  const hasActiveRegistration = ownerAccountCreated && Boolean(userId) && Boolean(normalizedRegisteredEmail);
  const isSameRegisteredEmail = hasActiveRegistration && normalizedEmail === normalizedRegisteredEmail;

  function clearError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleTextChange(field: "fullName" | "email" | "password" | "confirmPassword") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      if (field === "fullName") {
        updateRegistration({ fullName: nextValue });
      } else if (field === "email") {
        updateRegistration({ email: nextValue });
      } else if (field === "password") {
        updateRegistration({ password: nextValue });
      } else {
        updateRegistration({ confirmPassword: nextValue });
      }

      setFormError(null);
      setConfirmationMessage(null);
      setPendingEmailChange(false);
      clearError(field);
    };
  }

  function handleCountryChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCountryName = event.target.value;
    const nextCountry = getCountryByName(nextCountryName);

    setFormError(null);
    clearError("country");
    clearError("phone");
    updateRegistration({
      country: nextCountryName,
      phone: nextCountry ? buildCombinedPhone(nextCountry, localPhone) : localPhone,
    });
  }

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const sanitizedValue = sanitizeLocalPhone(event.target.value);

    setLocalPhone(sanitizedValue);
    setFormError(null);
    clearError("phone");

    updateRegistration({
      phone: buildCombinedPhone(selectedCountry, sanitizedValue),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedConfirmPassword = confirmPassword;
    const trimmedLocalPhone = sanitizeLocalPhone(localPhone);
    const trimmedCountry = country.trim();
    const nextFieldErrors: Record<string, string> = {};

    if (!trimmedFullName) {
      nextFieldErrors.fullName = "Full name is required.";
    }

    if (!trimmedEmail) {
      nextFieldErrors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextFieldErrors.email = "Enter a valid email address.";
    }

    if (!arePasswordRulesMet) {
      nextFieldErrors.password = "Please meet all password requirements.";
    }

    if (!trimmedConfirmPassword) {
      nextFieldErrors.confirmPassword = "Please confirm your password.";
    } else if (trimmedPassword !== trimmedConfirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (!trimmedCountry || !selectedCountry) {
      nextFieldErrors.country = "Country is required.";
    }

    if (!trimmedLocalPhone) {
      nextFieldErrors.phone = "Phone number is required.";
    }

    if (!agreeToTerms) {
      nextFieldErrors.terms = "You must agree to the terms to continue.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    const combinedPhone = buildCombinedPhone(selectedCountry, trimmedLocalPhone);

    if (isSameRegisteredEmail && userId) {
      setFormError(null);
      setConfirmationMessage(null);
      setPendingEmailChange(false);
      setFieldErrors({});

      updateRegistration({
        userId,
        ownerAccountCreated: true,
        registeredEmail: trimmedEmail,
        emailVerified,
        email: trimmedEmail,
        password: trimmedPassword,
        confirmPassword: trimmedConfirmPassword,
        fullName: trimmedFullName,
        phone: combinedPhone,
        country: trimmedCountry,
      });

      advanceToStep(emailVerified ? 3 : 2);
      return;
    }

    if (hasActiveRegistration && normalizedEmail !== normalizedRegisteredEmail) {
      if (!pendingEmailChange) {
        setConfirmationMessage("Changing the email will restart email verification.");
        setFormError(null);
        setPendingEmailChange(true);
        return;
      }

      updateRegistration({
        userId: "",
        ownerAccountCreated: false,
        emailVerified: false,
        registeredEmail: "",
      });
      setPendingEmailChange(false);
      setConfirmationMessage(null);
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setConfirmationMessage(null);
    setPendingEmailChange(false);
    setFieldErrors({});

    try {
      const response = await registerOwnerAccount({
        email: trimmedEmail,
        password: trimmedPassword,
        confirmPassword: trimmedConfirmPassword,
        fullName: trimmedFullName,
        phone: combinedPhone,
        country: trimmedCountry,
      });

      const resumedExistingSession =
        response.data.accountExists &&
        userId &&
        response.data.userId === userId &&
        normalizedRegisteredEmail === normalizedEmail;

      if (response.data.errorMessage && !resumedExistingSession) {
        setFormError(response.data.errorMessage);
      }

      updateRegistration({
        userId: response.data.userId,
        ownerAccountCreated: true,
        emailVerified: false,
        registeredEmail: trimmedEmail,
        email: trimmedEmail,
        password: trimmedPassword,
        confirmPassword: trimmedConfirmPassword,
        fullName: trimmedFullName,
        phone: combinedPhone,
        country: trimmedCountry,
      });

      advanceToStep(2);
    } catch (error) {
      if (error instanceof RegistrationApiError) {
        setFormError(error.message);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(error.fieldErrors).map(([key, values]) => [key, values[0] ?? ""]),
          ),
        );
      } else {
        setFormError(error instanceof Error ? error.message : "Unable to create your account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!selectedCountry) {
      return;
    }

    setLocalPhone(splitLocalPhoneValue(selectedCountry, phone));
  }, [phone, selectedCountry]);

  useEffect(() => {
    if (!selectedCountry) {
      return;
    }

    const combinedPhone = buildCombinedPhone(selectedCountry, localPhone);
    if (combinedPhone === phone) {
      return;
    }

    updateRegistration({
      phone: combinedPhone,
    });
  }, [localPhone, phone, selectedCountry, updateRegistration]);

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {formError ? (
          <div className="rounded-2xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
            {formError}
          </div>
        ) : null}

        {confirmationMessage ? (
          <div className="rounded-2xl border border-[#f2c94c] bg-[#fff8e6] px-4 py-3 text-sm text-[#8a5b00]">
            {confirmationMessage}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Full Name</span>
          <input
            type="text"
            value={fullName}
            onChange={handleTextChange("fullName")}
            placeholder="Enter your full name"
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          />
          {getFieldError(fieldErrors.fullName)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Email Address</span>
          <input
            type="email"
            value={email}
            onChange={handleTextChange("email")}
            placeholder="Enter your email address"
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          />
          {getFieldError(fieldErrors.email)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Password</span>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handleTextChange("password")}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              placeholder="Create a password"
              className="h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 pr-11 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52736a] transition hover:text-[#1f6a58]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {shouldShowPasswordPanel ? (
            <div
              ref={passwordRequirementsRef}
              className="mt-3 space-y-2 rounded-[16px] border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52736a]">
                  Password strength
                </p>
                <p className="text-xs font-semibold text-[#52736a]">{passwordStrengthLabel}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e5ece8]">
                <div
                  className="h-full rounded-full bg-[#1f6a58] transition-all"
                  style={{ width: passwordStrengthWidth }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#52736a]">
                  <span className="font-semibold text-[#06201c]">Strength:</span>
                  <span>{passwordStrengthLabel}</span>
                </div>
                {[
                  { key: "minLength", label: "At least 8 characters" },
                  { key: "uppercase", label: "At least 1 uppercase letter" },
                  { key: "lowercase", label: "At least 1 lowercase letter" },
                  { key: "number", label: "At least 1 number" },
                  { key: "special", label: "At least 1 special character" },
                ].map((rule) => {
                  const passed = passwordRules[rule.key as PasswordRuleKey];

                  return (
                    <div
                      key={rule.key}
                      className={`flex items-center gap-2 text-xs font-medium ${
                        passed ? "text-[#1f6a58]" : "text-[#667085]"
                      }`}
                    >
                      {passed ? <CheckIcon /> : <CrossIcon />}
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {getFieldError(fieldErrors.password)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Confirm Password</span>
          <div className="relative mt-1">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleTextChange("confirmPassword")}
              placeholder="Confirm your password"
              className="h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 pr-11 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52736a] transition hover:text-[#1f6a58]"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {fieldErrors.confirmPassword ? (
            getFieldError(fieldErrors.confirmPassword)
          ) : confirmPasswordLiveMismatch ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#b42318]">
              <CrossIcon />
              <span>Passwords do not match</span>
            </p>
          ) : confirmPassword.length > 0 && arePasswordsMatching ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#1f6a58]">
              <SuccessMark />
              <span>Passwords match</span>
            </p>
          ) : null}
        </label>
      </div>

      <div className="mt-4 border-t border-[#e5ece8] pt-4">
        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Country</span>
          <select
            value={country}
            onChange={handleCountryChange}
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          >
            <option value="">Select your country</option>
            {countryDialOptions.map((option) => (
              <option key={option.isoCode} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          {getFieldError(fieldErrors.country)}
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-[#06201c]">Phone Number</span>
          <div
            className={`mt-1 flex h-11 overflow-hidden rounded-[14px] border bg-white transition ${
              selectedCountry
                ? "border-[#d8e4df] focus-within:border-[#1f6a58] focus-within:ring-4 focus-within:ring-[#1f6a58]/10"
                : "cursor-not-allowed border-[#e5ece8] bg-[#f7fbf9]"
            }`}
          >
            <div
              className={`flex items-center border-r px-3 text-sm font-semibold ${
                selectedCountry ? "border-[#d8e4df] text-[#1f6a58]" : "border-[#e5ece8] text-[#8aa19a]"
              }`}
            >
              {selectedCountry ? selectedCountry.dialCode : "+"}
            </div>
            <input
              type="tel"
              value={localPhone}
              onChange={handlePhoneChange}
              disabled={!selectedCountry}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={selectedCountry ? "Enter phone number" : "Select country first"}
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8aa19a] disabled:cursor-not-allowed disabled:text-[#8aa19a]"
            />
          </div>
          {getFieldError(fieldErrors.phone)}
        </label>

        <label className="mt-4 flex items-start gap-3 rounded-[14px] border border-[#d8e4df] bg-[#f7fbf9] px-4 py-3">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(event) => {
              setAgreeToTerms(event.target.checked);
              setFormError(null);
              clearError("terms");
            }}
            className="mt-1 h-4 w-4 rounded border-[#9fb5ad] text-[#1f6a58] focus:ring-[#1f6a58]"
          />
          <span className="text-sm text-[#35544b]">
            I agree to the Terms of Service and Privacy Policy
            {getFieldError(fieldErrors.terms)}
          </span>
        </label>
      </div>

      <div className="sticky bottom-0 mt-5 border-t border-[#e5ece8] bg-white/95 pt-4 backdrop-blur-sm">
        <button
          type="submit"
          disabled={!isFormReady}
          className="flex h-11 w-full items-center justify-center rounded-[14px] bg-[#1f6a58] text-sm font-bold text-white transition hover:bg-[#185746] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
        >
          {isSubmitting
            ? "Creating Account..."
            : pendingEmailChange
              ? "Confirm Email Change"
              : "Create Account"}
        </button>

        <p className="mt-4 text-center text-sm text-[#52736a]">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-[#1f6a58] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

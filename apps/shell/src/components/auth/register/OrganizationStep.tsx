"use client";

import { useEffect, useState } from "react";

import { useRegistration } from "@/contexts/RegistrationContext";
import { companySizeOptions, industryOptions, countryOptions, normalizeWorkspaceSlug, isValidWorkspaceSlug } from "./register.constants";

type OrganizationStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

function getFieldError(message?: string | null) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-[#b42318]">{message}</p>;
}

export default function OrganizationStep({ onBack, onContinue }: OrganizationStepProps) {
  const {
    country,
    tenantName,
    tenantSlug,
    tenantSlugTouched,
    industryType,
    companySize,
    updateRegistration,
  } = useRegistration();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenantSlugTouched) {
      return;
    }

    updateRegistration({
      tenantSlug: tenantName ? normalizeWorkspaceSlug(tenantName) : "",
    });
  }, [tenantName, tenantSlugTouched, updateRegistration]);

  const handleChange = (field: "tenantName" | "tenantSlug" | "industryType" | "companySize" | "country") =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;

      updateRegistration({
        [field]: value,
        ...(field === "tenantSlug" ? { tenantSlugTouched: true } : {}),
      } as never);

      setFormError(null);
      setFieldErrors((current) => {
        if (!current[field]) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
    };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTenantName = tenantName.trim();
    const trimmedTenantSlug = tenantSlug.trim();
    const nextFieldErrors: Record<string, string> = {};

    if (!trimmedTenantName) nextFieldErrors.tenantName = "Organization name is required.";
    if (!trimmedTenantSlug) nextFieldErrors.tenantSlug = "Workspace URL is required.";
    else if (!isValidWorkspaceSlug(trimmedTenantSlug)) {
      nextFieldErrors.tenantSlug = "Use only lowercase letters, numbers, and hyphens.";
    }
    if (!industryType) nextFieldErrors.industryType = "Industry is required.";
    if (!companySize) nextFieldErrors.companySize = "Company size is required.";
    if (!country) nextFieldErrors.country = "Country is required.";

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    updateRegistration({
      tenantName: trimmedTenantName,
      tenantSlug: trimmedTenantSlug,
      country,
      tenantSlugTouched: true,
    });
    setFormError(null);
    setFieldErrors({});
    onContinue();
  }

  return (
    <form className="flex h-full flex-col" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#06201c]">Tell us about your organization</h2>
          <p className="text-sm leading-6 text-[#52736a]">Help us personalize your workspace</p>
        </div>

        {formError ? (
          <div className="rounded-2xl border border-[#fecdca] bg-[#fff6f6] px-4 py-3 text-sm text-[#b42318]">
            {formError}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Organization Name</span>
          <input
            type="text"
            value={tenantName}
            onChange={handleChange("tenantName")}
            placeholder="Enter your organization name"
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition placeholder:text-[#8aa19a] focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          />
          {getFieldError(fieldErrors.tenantName)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Workspace URL</span>
          <div className="mt-1 flex overflow-hidden rounded-[14px] border border-[#d8e4df] bg-white focus-within:border-[#1f6a58] focus-within:ring-4 focus-within:ring-[#1f6a58]/10">
            <span className="inline-flex items-center border-r border-[#d8e4df] bg-[#f7fbf9] px-3 text-sm font-semibold text-[#52736a]">
              invigorate.health/
            </span>
            <input
              type="text"
              value={tenantSlug}
              onChange={handleChange("tenantSlug")}
              placeholder="workspace-name"
              className="h-11 flex-1 px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8aa19a]"
            />
          </div>
          <p className="mt-1 text-xs text-[#52736a]">This maps to your tenant slug.</p>
          {getFieldError(fieldErrors.tenantSlug)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Industry</span>
          <select
            value={industryType}
            onChange={handleChange("industryType")}
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          >
            <option value="">Select your industry</option>
            {industryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {getFieldError(fieldErrors.industryType)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Company Size</span>
          <select
            value={companySize}
            onChange={handleChange("companySize")}
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          >
            <option value="">Select company size</option>
            {companySizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {getFieldError(fieldErrors.companySize)}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[#06201c]">Country</span>
          <select
            value={country}
            onChange={handleChange("country")}
            className="mt-1 h-11 w-full rounded-[14px] border border-[#d8e4df] bg-white px-4 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] focus:ring-4 focus:ring-[#1f6a58]/10"
          >
            <option value="">Select your country</option>
            {countryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {getFieldError(fieldErrors.country)}
        </label>
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
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746]"
          >
            Continue
          </button>
        </div>
      </div>
    </form>
  );
}

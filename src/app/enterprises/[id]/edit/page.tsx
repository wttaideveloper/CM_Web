"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getEnterpriseById, updateEnterprise } from "@/services/enterprise.service";
import type { EnterpriseDto } from "@/types/enterprise.types";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function inputClass() {
  return "mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function selectClass() {
  return inputClass();
}

const businessCategoryOptions = [
  "Fitness & Wellness",
  "Nutrition",
  "Mental Health",
  "Preventive Care",
  "Rehabilitation",
  "Corporate Wellness",
  "Other",
];

const yearFoundedOptions = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"];

function formatText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasOption(value: string, options: string[]) {
  return options.includes(value);
}

const phoneCodeOptions = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+1", label: "🇨🇦 +1" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
].sort((left, right) => right.code.length - left.code.length);

const defaultPhoneCode = "+91";

function phoneCodeClass() {
  return "h-[46px] w-[110px] shrink-0 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-2 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";
}

function phoneNumberClass() {
  return "h-[46px] min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function combinePhone(code: string, number: string) {
  const trimmedNumber = number.trim();

  if (!trimmedNumber) {
    return "";
  }

  return `${code} ${trimmedNumber}`;
}

function splitPhoneValue(value: unknown) {
  const text = formatText(value);

  if (!text) {
    return { code: defaultPhoneCode, number: "" };
  }

  const matchedCode = phoneCodeOptions.find((option) => {
    return text === option.code || text.startsWith(`${option.code} `) || text.startsWith(`${option.code}-`);
  });

  if (!matchedCode) {
    return { code: defaultPhoneCode, number: text };
  }

  const number = text.slice(matchedCode.code.length).trim().replace(/^[-\s]+/, "");

  return {
    code: matchedCode.code,
    number,
  };
}

function addressesMatch(
  registeredAddress: string,
  businessAddress: string,
  communicationAddress: string,
) {
  return (
    registeredAddress.trim() === businessAddress.trim() &&
    registeredAddress.trim() === communicationAddress.trim()
  );
}

type EditEnterprisePageProps = {
  enterpriseId?: string;
  successRedirect?: string;
  backHref?: string;
};

export function EditEnterprisePage({
  enterpriseId,
  successRedirect,
  backHref,
}: EditEnterprisePageProps = {}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const resolvedEnterpriseId = enterpriseId ?? params.id;
  const resolvedSuccessRedirect = successRedirect ?? `/enterprises/${resolvedEnterpriseId}`;
  const resolvedBackHref = backHref ?? `/enterprises/${resolvedEnterpriseId}`;
  const [enterprise, setEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [yearFounded, setYearFounded] = useState("");
  const [description, setDescription] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhoneCode, setBusinessPhoneCode] = useState(defaultPhoneCode);
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [secondaryPhoneCode, setSecondaryPhoneCode] = useState(defaultPhoneCode);
  const [secondaryPhoneNumber, setSecondaryPhoneNumber] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [communicationAddress, setCommunicationAddress] = useState("");
  const [useRegisteredAddressForOtherAddresses, setUseRegisteredAddressForOtherAddresses] =
    useState(true);
  const [suiteUnit, setSuiteUnit] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [businessImages, setBusinessImages] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [tagline, setTagline] = useState("");
  const [status, setStatus] = useState("Active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchEnterprise() {
    if (!resolvedEnterpriseId) {
      setError("Unable to load enterprise.");
      setIsNotFound(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      const data = await getEnterpriseById(resolvedEnterpriseId);
      setEnterprise(data);
      setEnterpriseName(formatText(data.business_legal_name || data.name));
      setTradingName(formatText(data.business_short_name));
      setRegistrationNumber(formatText(data.registration_number));
      setBusinessCategory(formatText(data.business_category));
      setWebsiteUrl(formatText(data.website_url));
      setYearFounded(formatText(data.year_founded));
      setDescription(formatText(data.business_description || data.description));
      setBusinessEmail(formatText(data.business_email));
      const primaryPhone = splitPhoneValue(data.business_phone);
      setBusinessPhoneCode(primaryPhone.code);
      setBusinessPhoneNumber(primaryPhone.number);
      setPrimaryContactName(formatText(data.primary_contact_name));
      setPrimaryContactTitle(formatText(data.primary_contact_title));
      setSecondaryEmail(formatText(data.secondary_email));
      const secondaryPhone = splitPhoneValue(data.secondary_phone);
      setSecondaryPhoneCode(secondaryPhone.code);
      setSecondaryPhoneNumber(secondaryPhone.number);
      setRegisteredAddress(formatText(data.registered_address));
      setBusinessAddress(formatText(data.business_address));
      setCommunicationAddress(formatText(data.communication_address));
      setSuiteUnit(formatText(data.suite_unit));
      setUseRegisteredAddressForOtherAddresses(
        addressesMatch(
          formatText(data.registered_address),
          formatText(data.business_address) || formatText(data.registered_address),
          formatText(data.communication_address) || formatText(data.registered_address),
        ),
      );
      setLogoUrl(formatText(data.logo_url));
      setBusinessImages(formatText(data.business_images));
      setBrandColor(formatText(data.brand_color));
      setTagline(formatText(data.tagline));
      setStatus(data.status === false ? "Inactive" : "Active");
    } catch (fetchError) {
      const nextError =
        fetchError instanceof Error ? fetchError.message : "Unable to load enterprise.";
      setIsNotFound(nextError.includes("(404"));
      setError(nextError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEnterprise();
  }, [resolvedEnterpriseId]);

  async function handleSubmit() {
    const trimmedName = enterpriseName.trim();
    const trimmedTradingName = tradingName.trim();
    const trimmedRegistrationNumber = optionalText(registrationNumber);
    const trimmedBusinessCategory = optionalText(businessCategory);
    const trimmedWebsiteUrl = optionalText(websiteUrl);
    const trimmedYearFounded = optionalText(yearFounded);
    const trimmedDescription = description.trim();
    const trimmedBusinessEmail = businessEmail.trim();
    const trimmedBusinessPhoneNumber = businessPhoneNumber.trim();
    const trimmedPrimaryContactName = optionalText(primaryContactName);
    const trimmedPrimaryContactTitle = optionalText(primaryContactTitle);
    const trimmedSecondaryEmail = optionalText(secondaryEmail);
    const trimmedSecondaryPhoneNumber = secondaryPhoneNumber.trim();
    const trimmedRegisteredAddress = registeredAddress.trim();
    const trimmedBusinessAddress = businessAddress.trim();
    const trimmedCommunicationAddress = communicationAddress.trim();
    const trimmedSuiteUnit = optionalText(suiteUnit);
    const trimmedBrandColor = optionalText(brandColor);
    const trimmedTagline = optionalText(tagline);

    if (
      !trimmedName ||
      !trimmedTradingName ||
      !trimmedDescription ||
      !trimmedBusinessEmail ||
      !trimmedBusinessPhoneNumber ||
      !trimmedRegisteredAddress ||
      (!useRegisteredAddressForOtherAddresses &&
        (!trimmedBusinessAddress || !trimmedCommunicationAddress))
    ) {
      setError("Please complete all required enterprise fields.");
      return;
    }

    if (!resolvedEnterpriseId || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const trimmedBusinessPhone = combinePhone(businessPhoneCode, trimmedBusinessPhoneNumber);
      const combinedSecondaryPhone = trimmedSecondaryPhoneNumber
        ? combinePhone(secondaryPhoneCode, trimmedSecondaryPhoneNumber)
        : "";

      await updateEnterprise(resolvedEnterpriseId, {
        business_short_name: trimmedTradingName,
        business_legal_name: trimmedName,
        business_description: trimmedDescription,
        business_email: trimmedBusinessEmail,
        business_phone: trimmedBusinessPhone,
        registered_address: trimmedRegisteredAddress,
        business_address: useRegisteredAddressForOtherAddresses
          ? trimmedRegisteredAddress
          : trimmedBusinessAddress,
        communication_address: useRegisteredAddressForOtherAddresses
          ? trimmedRegisteredAddress
          : trimmedCommunicationAddress,
        logo_url: logoUrl.trim(),
        business_images: businessImages.trim(),
        ...(trimmedRegistrationNumber ? { registration_number: trimmedRegistrationNumber } : {}),
        ...(trimmedBusinessCategory ? { business_category: trimmedBusinessCategory } : {}),
        ...(trimmedWebsiteUrl ? { website_url: trimmedWebsiteUrl } : {}),
        ...(trimmedYearFounded ? { year_founded: trimmedYearFounded } : {}),
        ...(trimmedPrimaryContactName ? { primary_contact_name: trimmedPrimaryContactName } : {}),
        ...(trimmedPrimaryContactTitle ? { primary_contact_title: trimmedPrimaryContactTitle } : {}),
        ...(trimmedSecondaryEmail ? { secondary_email: trimmedSecondaryEmail } : {}),
        ...(combinedSecondaryPhone ? { secondary_phone: combinedSecondaryPhone } : {}),
        ...(trimmedSuiteUnit ? { suite_unit: trimmedSuiteUnit } : {}),
        ...(trimmedBrandColor ? { brand_color: trimmedBrandColor } : {}),
        ...(trimmedTagline ? { tagline: trimmedTagline } : {}),
        status: status !== "Inactive",
      });

      router.push(resolvedSuccessRedirect);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update enterprise.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading enterprise...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
        </section>
      </AppShell>
    );
  }

  if (error && !enterprise) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">
            {isNotFound ? "Enterprise not found." : "Unable to load enterprise."}
          </p>
          <p className="mt-2 text-sm text-[#52736a]">{error}</p>
          {!isNotFound ? (
            <button
              type="button"
              onClick={() => void fetchEnterprise()}
              className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              Retry
            </button>
          ) : null}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            aria-label="Back"
            onClick={() => router.push(resolvedBackHref)}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Edit Enterprise</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              Update the enterprise profile and status.
            </p>
          </div>
        </div>
        <Link
          href={resolvedBackHref}
          className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]"
        >
          Cancel
        </Link>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#06201c]">Business Information</h3>
          <p className="mt-1 text-sm text-[#52736a]">
            Edit the enterprise details used across the profile.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Enterprise Name*</FieldLabel>
            <input
              type="text"
              value={enterpriseName}
              onChange={(event) => setEnterpriseName(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Trading / DBA Name*</FieldLabel>
            <input
              type="text"
              value={tradingName}
              onChange={(event) => setTradingName(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Registration Number</FieldLabel>
            <input
              type="text"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Business Category</FieldLabel>
            <select
              className={selectClass()}
              value={businessCategory}
              onChange={(event) => setBusinessCategory(event.target.value)}
            >
              <option value="">Select business category</option>
              {businessCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {businessCategory && !hasOption(businessCategory, businessCategoryOptions) ? (
                <option value={businessCategory}>{businessCategory}</option>
              ) : null}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Website URL</FieldLabel>
            <input
              type="text"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Year Founded</FieldLabel>
            <select
              className={selectClass()}
              value={yearFounded}
              onChange={(event) => setYearFounded(event.target.value)}
            >
              <option value="">Select year founded</option>
              {yearFoundedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {yearFounded && !hasOption(yearFounded, yearFoundedOptions) ? (
                <option value={yearFounded}>{yearFounded}</option>
              ) : null}
            </select>
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>Description*</FieldLabel>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-bold text-[#06201c]">Contact</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Primary Contact Name</FieldLabel>
              <input
                type="text"
                value={primaryContactName}
                onChange={(event) => setPrimaryContactName(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Job Title</FieldLabel>
              <input
                type="text"
                value={primaryContactTitle}
                onChange={(event) => setPrimaryContactTitle(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Email Address*</FieldLabel>
              <input
                type="email"
                value={businessEmail}
                onChange={(event) => setBusinessEmail(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Phone Number*</FieldLabel>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={businessPhoneCode}
                  onChange={(event) => setBusinessPhoneCode(event.target.value)}
                  className={phoneCodeClass()}
                >
                  {phoneCodeOptions.map((option, index) => (
                    <option key={`${option.label}-${index}`} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={businessPhoneNumber}
                  onChange={(event) => setBusinessPhoneNumber(event.target.value)}
                  placeholder="415 555 0192"
                  className={phoneNumberClass()}
                />
              </div>
            </label>
            <label className="block">
              <FieldLabel>Secondary Email</FieldLabel>
              <input
                type="email"
                value={secondaryEmail}
                onChange={(event) => setSecondaryEmail(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Secondary Phone</FieldLabel>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={secondaryPhoneCode}
                  onChange={(event) => setSecondaryPhoneCode(event.target.value)}
                  className={phoneCodeClass()}
                >
                  {phoneCodeOptions.map((option, index) => (
                    <option key={`${option.label}-${index}`} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={secondaryPhoneNumber}
                  onChange={(event) => setSecondaryPhoneNumber(event.target.value)}
                  placeholder="415 555 0134"
                  className={phoneNumberClass()}
                />
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-bold text-[#06201c]">Addresses</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <FieldLabel>Registered Address*</FieldLabel>
              <input
                type="text"
                value={registeredAddress}
                onChange={(event) => setRegisteredAddress(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Suite / Unit</FieldLabel>
              <input
                type="text"
                value={suiteUnit}
                onChange={(event) => setSuiteUnit(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                checked={useRegisteredAddressForOtherAddresses}
                onChange={(event) =>
                  setUseRegisteredAddressForOtherAddresses(event.target.checked)
                }
                className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58] focus:ring-[#1f6a58]"
              />
              <span className="text-sm font-semibold text-[#06201c]">
                Use registered address for business and communication address
              </span>
            </label>
            {!useRegisteredAddressForOtherAddresses ? (
              <>
                <label className="block md:col-span-2">
                  <FieldLabel>Business Address*</FieldLabel>
                  <textarea
                    value={businessAddress}
                    onChange={(event) => setBusinessAddress(event.target.value)}
                    className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>
                <label className="block md:col-span-2">
                  <FieldLabel>Communication Address*</FieldLabel>
                  <textarea
                    value={communicationAddress}
                    onChange={(event) => setCommunicationAddress(event.target.value)}
                    className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-bold text-[#06201c]">Branding</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Logo URL</FieldLabel>
              <input
                type="text"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Business Images</FieldLabel>
              <input
                type="text"
                value={businessImages}
                onChange={(event) => setBusinessImages(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Brand Color</FieldLabel>
              <input
                type="text"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block">
              <FieldLabel>Tagline</FieldLabel>
              <input
                type="text"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                className={inputClass()}
              />
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>Status</FieldLabel>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={selectClass()}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push(resolvedBackHref)}
            className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}

export default function SuperAdminEditEnterprisePage() {
  return <EditEnterprisePage />;
}

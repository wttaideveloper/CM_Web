"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { City, Country, State } from "country-state-city";

import AppShell from "@/components/layout/AppShell";
import { getAuthTenants, type AuthTenant } from "@/services/auth.service";
import { createEnterprise } from "@/services/enterprise.service";

const steps = ["Business Info", "Contact", "Address", "Branding", "Review"];
const countryOptions = Country.getAllCountries().sort((left, right) =>
  left.name.localeCompare(right.name),
);

type EnterpriseFieldKey =
  | "tenantId"
  | "enterpriseName"
  | "tradingName"
  | "registrationNumber"
  | "businessCategory"
  | "websiteUrl"
  | "yearFounded"
  | "description"
  | "primaryContactName"
  | "primaryContactTitle"
  | "businessEmail"
  | "businessPhoneNumber"
  | "secondaryEmail"
  | "secondaryPhoneNumber"
  | "streetAddress"
  | "suiteUnit"
  | "country"
  | "stateProvince"
  | "city"
  | "postalCode"
  | "businessAddress"
  | "communicationAddress"
  | "logoUrl"
  | "businessImages"
  | "brandColor"
  | "tagline";

const backendFieldToEnterpriseFieldKey: Record<string, EnterpriseFieldKey> = {
  tenant_id: "tenantId",
  business_legal_name: "enterpriseName",
  business_short_name: "tradingName",
  registration_number: "registrationNumber",
  business_category: "businessCategory",
  website_url: "websiteUrl",
  year_founded: "yearFounded",
  business_description: "description",
  business_email: "businessEmail",
  business_phone: "businessPhoneNumber",
  primary_contact_name: "primaryContactName",
  primary_contact_title: "primaryContactTitle",
  secondary_email: "secondaryEmail",
  secondary_phone: "secondaryPhoneNumber",
  registered_address: "streetAddress",
  street_address: "streetAddress",
  suite_unit: "suiteUnit",
  country: "country",
  state: "stateProvince",
  state_province: "stateProvince",
  city: "city",
  postal_code: "postalCode",
  business_address: "businessAddress",
  communication_address: "communicationAddress",
  logo_url: "logoUrl",
  business_images: "businessImages",
  brand_color: "brandColor",
  tagline: "tagline",
};

const enterpriseFieldLabels: Record<EnterpriseFieldKey, string> = {
  tenantId: "Tenant / Organization",
  enterpriseName: "Enterprise Name",
  tradingName: "Trading / DBA Name",
  registrationNumber: "Registration Number",
  businessCategory: "Business Category",
  websiteUrl: "Website URL",
  yearFounded: "Year Founded",
  description: "Description",
  primaryContactName: "Primary Contact Name",
  primaryContactTitle: "Job Title",
  businessEmail: "Email Address",
  businessPhoneNumber: "Phone Number",
  secondaryEmail: "Secondary Email",
  secondaryPhoneNumber: "Secondary Phone",
  streetAddress: "Street Address",
  suiteUnit: "Suite / Unit",
  country: "Country",
  stateProvince: "State / Province",
  city: "City",
  postalCode: "Postal Code",
  businessAddress: "Business Address",
  communicationAddress: "Communication Address",
  logoUrl: "Logo URL",
  businessImages: "Banner Image URL",
  brandColor: "Brand Color",
  tagline: "Tagline",
};

const enterpriseFieldSteps: Record<EnterpriseFieldKey, number> = {
  tenantId: 0,
  enterpriseName: 0,
  tradingName: 0,
  registrationNumber: 0,
  businessCategory: 0,
  websiteUrl: 0,
  yearFounded: 0,
  description: 0,
  primaryContactName: 1,
  primaryContactTitle: 1,
  businessEmail: 1,
  businessPhoneNumber: 1,
  secondaryEmail: 1,
  secondaryPhoneNumber: 1,
  streetAddress: 2,
  suiteUnit: 2,
  country: 2,
  stateProvince: 2,
  city: 2,
  postalCode: 2,
  businessAddress: 2,
  communicationAddress: 2,
  logoUrl: 3,
  businessImages: 3,
  brandColor: 3,
  tagline: 3,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function inputClass() {
  return "mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function selectClass() {
  return inputClass();
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStateOptions(countryCode: string) {
  return State.getStatesOfCountry(countryCode).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function getCityOptions(countryCode: string, stateCode: string) {
  return City.getCitiesOfState(countryCode, stateCode).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function normalizeEnterpriseErrorMessage(fieldKey: EnterpriseFieldKey, message: string) {
  const trimmed = message.trim();

  if (!trimmed) {
    return `Please check ${enterpriseFieldLabels[fieldKey]}.`;
  }

  return `${enterpriseFieldLabels[fieldKey]}: ${trimmed}`;
}

function getFirstEnterpriseValidationError(
  fieldErrors: Record<string, string[]> | undefined,
): { fieldKey: EnterpriseFieldKey; message: string } | null {
  if (!fieldErrors) {
    return null;
  }

  for (const [backendField, messages] of Object.entries(fieldErrors)) {
    const fieldKey = backendFieldToEnterpriseFieldKey[backendField];
    const message = messages.find((item) => item.trim())?.trim();

    if (fieldKey && message) {
      return {
        fieldKey,
        message: normalizeEnterpriseErrorMessage(fieldKey, message),
      };
    }
  }

  return null;
}

const phoneCodeOptions = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+1", label: "🇨🇦 +1" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
];

const defaultPhoneCode = "+91";

type EnterpriseCreateStatus = "draft" | "active";

function phoneCodeClass() {
  return "h-[46px] w-[110px] shrink-0 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-2 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";
}

function phoneNumberClass() {
  return "h-[46px] min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function combinePhone(code: string, number: string) {
  const trimmedNumber = number.trim();

  if (!trimmedNumber) {
    return "";
  }

  return `${code} ${trimmedNumber}`;
}

function buildCreateEnterprisePayload({
  tenantId,
  enterpriseName,
  tradingName,
  description,
  businessEmail,
  businessPhone,
  registeredAddress,
  businessAddress,
  communicationAddress,
  logoUrl,
  businessImages,
  registrationNumber,
  businessCategory,
  websiteUrl,
  yearFounded,
  primaryContactName,
  primaryContactTitle,
  secondaryEmail,
  secondaryPhone,
  suiteUnit,
  brandColor,
  tagline,
  status,
  useRegisteredAddressForOtherAddresses,
}: {
  tenantId: string;
  enterpriseName: string;
  tradingName: string;
  description: string;
  businessEmail: string;
  businessPhone: string;
  registeredAddress: string;
  businessAddress: string;
  communicationAddress: string;
  logoUrl: string;
  businessImages: string;
  registrationNumber?: string;
  businessCategory?: string;
  websiteUrl?: string;
  yearFounded?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  suiteUnit?: string;
  brandColor?: string;
  tagline?: string;
  status: EnterpriseCreateStatus;
  useRegisteredAddressForOtherAddresses: boolean;
}) {
  return {
    tenant_id: tenantId,
    business_legal_name: enterpriseName,
    business_short_name: tradingName,
    business_description: description,
    business_email: businessEmail,
    business_phone: businessPhone,
    registered_address: registeredAddress,
    business_address: useRegisteredAddressForOtherAddresses ? registeredAddress : businessAddress,
    communication_address: useRegisteredAddressForOtherAddresses ? registeredAddress : communicationAddress,
    logo_url: logoUrl,
    business_images: businessImages,
    status,
    ...(registrationNumber ? { registration_number: registrationNumber } : {}),
    ...(businessCategory ? { business_category: businessCategory } : {}),
    ...(websiteUrl ? { website_url: websiteUrl } : {}),
    ...(yearFounded ? { year_founded: yearFounded } : {}),
    ...(primaryContactName ? { primary_contact_name: primaryContactName } : {}),
    ...(primaryContactTitle ? { primary_contact_title: primaryContactTitle } : {}),
    ...(secondaryEmail ? { secondary_email: secondaryEmail } : {}),
    ...(secondaryPhone ? { secondary_phone: secondaryPhone } : {}),
    ...(suiteUnit ? { suite_unit: suiteUnit } : {}),
    ...(brandColor ? { brand_color: brandColor } : {}),
    ...(tagline ? { tagline: tagline } : {}),
  };
}

function StepCircle({
  index,
  currentStep,
}: {
  index: number;
  currentStep: number;
}) {
  const isCompleted = index < currentStep;
  const isCurrent = index === currentStep;

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
        isCurrent
          ? "border-[#1f6a58] bg-[#1f6a58] text-white"
          : isCompleted
            ? "border-[#2f8a66] bg-[#e9f4ee] text-[#1f6a58]"
          : "border-[#d7e5df] bg-white text-[#8ca69e]"
      }`}
    >
      {isCompleted ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m5 12 4 4 10-10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        index + 1
      )}
    </div>
  );
}

export default function CreateEnterprisePage() {
  const router = useRouter();
  const fieldRefs = useRef<Partial<Record<EnterpriseFieldKey, HTMLElement | null>>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [tenants, setTenants] = useState<AuthTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [tenantLoadError, setTenantLoadError] = useState<string | null>(null);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [yearFounded, setYearFounded] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhoneCode, setBusinessPhoneCode] = useState(defaultPhoneCode);
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [secondaryPhoneCode, setSecondaryPhoneCode] = useState(defaultPhoneCode);
  const [secondaryPhoneNumber, setSecondaryPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState("");
  const [useRegisteredAddressForOtherAddresses, setUseRegisteredAddressForOtherAddresses] =
    useState(true);
  const [suiteUnit, setSuiteUnit] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [communicationAddress, setCommunicationAddress] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [businessImages, setBusinessImages] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<EnterpriseFieldKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const reviewBusinessPhone = combinePhone(businessPhoneCode, businessPhoneNumber);
  const reviewSecondaryPhone = secondaryPhoneNumber.trim()
    ? combinePhone(secondaryPhoneCode, secondaryPhoneNumber)
    : "";
  const cityOptions = selectedCountryCode && selectedStateCode
    ? getCityOptions(selectedCountryCode, selectedStateCode)
    : [];

  useEffect(() => {
    let isActive = true;

    void getAuthTenants()
      .then((nextTenants) => {
        if (!isActive) return;
        setTenants(nextTenants);
        if (nextTenants.length === 0) {
          setTenantLoadError("No tenants are available to link to this enterprise.");
        }
      })
      .catch((loadError) => {
        if (!isActive) return;
        setTenantLoadError(loadError instanceof Error ? loadError.message : "Unable to load tenants.");
      })
      .finally(() => {
        if (isActive) setIsLoadingTenants(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingFocusField) {
      return;
    }

    const targetStep = enterpriseFieldSteps[pendingFocusField];
    if (currentStep !== targetStep) {
      return;
    }

    const target = fieldRefs.current[pendingFocusField];
    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingFocusField(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep, pendingFocusField]);

  function registerFieldRef(fieldKey: EnterpriseFieldKey) {
    return (element: HTMLElement | null) => {
      fieldRefs.current[fieldKey] = element;
    };
  }

  function focusEnterpriseField(fieldKey: EnterpriseFieldKey) {
    const targetStep = enterpriseFieldSteps[fieldKey];
    setCurrentStep(targetStep);
    setPendingFocusField(fieldKey);
  }

  function handleEnterpriseValidationError(
    fieldErrors: Record<string, string[]> | undefined,
    fallbackMessage: string,
  ) {
    const mappedFieldError = getFirstEnterpriseValidationError(fieldErrors);

    if (mappedFieldError) {
      setError(mappedFieldError.message);
      focusEnterpriseField(mappedFieldError.fieldKey);
      return;
    }

    setPendingFocusField(null);
    setError(fallbackMessage);
  }

  async function handleSubmit(status: EnterpriseCreateStatus) {
    const trimmedTenantId = selectedTenantId.trim();
    const trimmedName = enterpriseName.trim();
    const trimmedTradingName = tradingName.trim();
    const trimmedRegistrationNumber = optionalText(registrationNumber);
    const trimmedBusinessCategory = optionalText(businessCategory);
    const trimmedWebsiteUrl = optionalText(websiteUrl);
    const trimmedYearFounded = optionalText(yearFounded);
    const trimmedBusinessEmail = businessEmail.trim();
    const trimmedBusinessPhoneNumber = businessPhoneNumber.trim();
    const trimmedPrimaryContactName = optionalText(primaryContactName);
    const trimmedPrimaryContactTitle = optionalText(primaryContactTitle);
    const trimmedSecondaryEmail = optionalText(secondaryEmail);
    const trimmedSecondaryPhoneNumber = secondaryPhoneNumber.trim();
    const trimmedDescription = description.trim();
    const trimmedStreetAddress = streetAddress.trim();
    const trimmedCity = city.trim();
    const trimmedStateProvince = stateProvince.trim();
    const trimmedPostalCode = postalCode.trim();
    const trimmedCountry = country.trim();
    const trimmedSuiteUnit = optionalText(suiteUnit);
    const registeredAddress = `${trimmedStreetAddress}, ${trimmedCity}, ${trimmedStateProvince} ${trimmedPostalCode}, ${trimmedCountry}`;
    const trimmedBusinessAddress = businessAddress.trim();
    const trimmedCommunicationAddress = communicationAddress.trim();
    const trimmedBrandColor = optionalText(brandColor);
    const trimmedTagline = optionalText(tagline);

    if (
      !trimmedTenantId ||
      !trimmedName ||
      !trimmedTradingName ||
      !trimmedDescription ||
      !trimmedBusinessEmail ||
      !trimmedBusinessPhoneNumber ||
      !trimmedStreetAddress ||
      !trimmedCity ||
      !trimmedStateProvince ||
      !trimmedPostalCode ||
      !trimmedCountry ||
      (!useRegisteredAddressForOtherAddresses &&
        (!trimmedBusinessAddress || !trimmedCommunicationAddress))
    ) {
      setError(trimmedTenantId ? "Please complete all required enterprise fields." : "Select a tenant / organization before creating this enterprise.");
      setCurrentStep(0);
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const trimmedBusinessPhone = combinePhone(businessPhoneCode, trimmedBusinessPhoneNumber);
      const trimmedSecondaryPhone = trimmedSecondaryPhoneNumber
        ? combinePhone(secondaryPhoneCode, trimmedSecondaryPhoneNumber)
        : "";

      await createEnterprise(
        buildCreateEnterprisePayload({
          tenantId: trimmedTenantId,
          enterpriseName: trimmedName,
          tradingName: trimmedTradingName,
          description: trimmedDescription,
          businessEmail: trimmedBusinessEmail,
          businessPhone: trimmedBusinessPhone,
          registeredAddress,
          businessAddress: trimmedBusinessAddress,
          communicationAddress: trimmedCommunicationAddress,
          logoUrl: logoUrl.trim(),
          businessImages: businessImages.trim(),
          registrationNumber: trimmedRegistrationNumber,
          businessCategory: trimmedBusinessCategory,
          websiteUrl: trimmedWebsiteUrl,
          yearFounded: trimmedYearFounded,
          primaryContactName: trimmedPrimaryContactName,
          primaryContactTitle: trimmedPrimaryContactTitle,
          secondaryEmail: trimmedSecondaryEmail,
          secondaryPhone: trimmedSecondaryPhone,
          suiteUnit: trimmedSuiteUnit,
          brandColor: trimmedBrandColor,
          tagline: trimmedTagline,
          status,
          useRegisteredAddressForOtherAddresses,
        }),
      );

      router.push("/enterprises");
    } catch (submitError) {
      const enterpriseError = submitError as Error & {
        fieldErrors?: Record<string, string[]>;
      };

      if (enterpriseError.fieldErrors) {
        handleEnterpriseValidationError(
          enterpriseError.fieldErrors,
          enterpriseError.message || "Unable to create enterprise.",
        );
        return;
      }

      setPendingFocusField(null);
      setError(submitError instanceof Error ? submitError.message : "Unable to create enterprise.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            aria-label="Back"
            disabled={isFirstStep}
            onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Create Enterprise</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              Add a wellness business profile to the platform.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4 overflow-x-auto pb-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step} className="flex min-w-[132px] items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className="flex items-center gap-3 text-left"
                >
                  <StepCircle index={index} currentStep={currentStep} />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isCurrent || isCompleted ? "text-[#06201c]" : "text-[#8ca69e]"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {currentStep === 0 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Business Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Enter the core details used across the enterprise profile.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Tenant / Organization*</FieldLabel>
                <select
                  ref={registerFieldRef("tenantId")}
                  value={selectedTenantId}
                  onChange={(event) => {
                    setSelectedTenantId(event.target.value);
                    setError(null);
                  }}
                  disabled={isLoadingTenants || Boolean(tenantLoadError)}
                  className={selectClass()}
                >
                  <option value="">
                    {isLoadingTenants ? "Loading tenants..." : tenantLoadError ? "Unable to load tenants" : "Select tenant / organization"}
                  </option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.slug ? `${tenant.name} (${tenant.slug})` : tenant.name}
                    </option>
                  ))}
                </select>
                {tenantLoadError ? <p className="mt-1.5 text-sm text-[#b42318]">{tenantLoadError}</p> : null}
              </label>
              <label className="block">
                <FieldLabel>Enterprise Name*</FieldLabel>
                <input
                  ref={registerFieldRef("enterpriseName")}
                  type="text"
                  placeholder="Pinnacle Wellness Co."
                  value={enterpriseName}
                  onChange={(event) => setEnterpriseName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Trading / DBA Name</FieldLabel>
                <input
                  ref={registerFieldRef("tradingName")}
                  type="text"
                  placeholder="Pinnacle Wellness"
                  value={tradingName}
                  onChange={(event) => setTradingName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Registration Number</FieldLabel>
                <input
                  ref={registerFieldRef("registrationNumber")}
                  type="text"
                  placeholder="REG-2026-0142"
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Business Category</FieldLabel>
                <select
                  ref={registerFieldRef("businessCategory")}
                  className={selectClass()}
                  value={businessCategory}
                  onChange={(event) => setBusinessCategory(event.target.value)}
                >
                  <option value="">Select business category</option>
                  {[
                    "Fitness & Wellness",
                    "Nutrition",
                    "Mental Health",
                    "Physical Therapy",
                    "Sports Medicine",
                    "Mindfulness",
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Website URL</FieldLabel>
                <input
                  ref={registerFieldRef("websiteUrl")}
                  type="text"
                  placeholder="https://pinnaclewellness.com"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Year Founded</FieldLabel>
                <select
                  ref={registerFieldRef("yearFounded")}
                  className={selectClass()}
                  value={yearFounded}
                  onChange={(event) => setYearFounded(event.target.value)}
                >
                  <option value="">Select year founded</option>
                  {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  ref={registerFieldRef("description")}
                  placeholder="Describe the enterprise, services, and wellness focus."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Contact</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Add the primary and backup contact details.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Primary Contact Name</FieldLabel>
                <input
                  ref={registerFieldRef("primaryContactName")}
                  type="text"
                  placeholder="Sarah Johnson"
                  value={primaryContactName}
                  onChange={(event) => setPrimaryContactName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Job Title</FieldLabel>
                <input
                  ref={registerFieldRef("primaryContactTitle")}
                  type="text"
                  placeholder="Founder & CEO"
                  value={primaryContactTitle}
                  onChange={(event) => setPrimaryContactTitle(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Email Address*</FieldLabel>
                <input
                  ref={registerFieldRef("businessEmail")}
                  type="email"
                  placeholder="sarah@pinnacle.com"
                  value={businessEmail}
                  onChange={(event) => setBusinessEmail(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Phone Number*</FieldLabel>
                <div className="mt-1.5 flex gap-2">
                  <select
                    ref={registerFieldRef("businessPhoneNumber")}
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
                    ref={registerFieldRef("businessPhoneNumber")}
                    type="text"
                    placeholder="415 555 0192"
                    value={businessPhoneNumber}
                    onChange={(event) => setBusinessPhoneNumber(sanitizePhoneNumber(event.target.value))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={phoneNumberClass()}
                  />
                </div>
              </label>
              <label className="block">
                <FieldLabel>Secondary Email</FieldLabel>
                <input
                  ref={registerFieldRef("secondaryEmail")}
                  type="email"
                  placeholder="ops@pinnacle.com"
                  value={secondaryEmail}
                  onChange={(event) => setSecondaryEmail(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Secondary Phone</FieldLabel>
                <div className="mt-1.5 flex gap-2">
                  <select
                    ref={registerFieldRef("secondaryPhoneNumber")}
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
                    ref={registerFieldRef("secondaryPhoneNumber")}
                    type="text"
                    placeholder="415 555 0134"
                    value={secondaryPhoneNumber}
                    onChange={(event) =>
                      setSecondaryPhoneNumber(sanitizePhoneNumber(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={phoneNumberClass()}
                  />
                </div>
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Address</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Capture the enterprise location and mailing details.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Street Address*</FieldLabel>
                <input
                  ref={registerFieldRef("streetAddress")}
                  type="text"
                  placeholder="124 Wellness Ave"
                  value={streetAddress}
                  onChange={(event) => setStreetAddress(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Suite / Unit</FieldLabel>
                <input
                  ref={registerFieldRef("suiteUnit")}
                  type="text"
                  placeholder="Suite 400"
                  value={suiteUnit}
                  onChange={(event) => setSuiteUnit(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Country*</FieldLabel>
                <select
                  ref={registerFieldRef("country")}
                  className={selectClass()}
                  value={selectedCountryCode}
                  onChange={(event) => {
                    const nextCountry = countryOptions.find(
                      (option) => option.isoCode === event.target.value,
                    );

                    setSelectedCountryCode(event.target.value);
                    setCountry(nextCountry?.name ?? "");
                    setSelectedStateCode("");
                    setStateProvince("");
                    setCity("");
                  }}
                >
                  <option value="">Select country</option>
                  {countryOptions.map((option) => (
                    <option key={option.isoCode} value={option.isoCode}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>State / Province*</FieldLabel>
                <select
                  ref={registerFieldRef("stateProvince")}
                  className={selectClass()}
                  value={selectedStateCode}
                  onChange={(event) => {
                    const nextState = selectedCountryCode
                      ? getStateOptions(selectedCountryCode).find(
                          (state) => state.isoCode === event.target.value,
                        )
                      : undefined;

                    setSelectedStateCode(event.target.value);
                    setStateProvince(nextState?.name ?? "");
                    setCity("");
                  }}
                  disabled={!selectedCountryCode}
                >
                  <option value="">{selectedCountryCode ? "Select state" : "Select country first"}</option>
                  {selectedCountryCode
                    ? getStateOptions(selectedCountryCode).map((option) => (
                        <option key={option.isoCode} value={option.isoCode}>
                          {option.name}
                        </option>
                      ))
                    : null}
                </select>
              </label>
              <label className="block">
                <FieldLabel>City*</FieldLabel>
                <select
                  ref={registerFieldRef("city")}
                  className={selectClass()}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  disabled={!selectedStateCode}
                >
                  <option value="">{selectedStateCode ? "Select city" : "Select state first"}</option>
                  {cityOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Postal Code*</FieldLabel>
                <input
                  ref={registerFieldRef("postalCode")}
                  type="text"
                  placeholder="94105"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
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
                      ref={registerFieldRef("businessAddress")}
                      placeholder="Enter business address"
                      value={businessAddress}
                      onChange={(event) => setBusinessAddress(event.target.value)}
                      className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <FieldLabel>Communication Address*</FieldLabel>
                    <textarea
                      ref={registerFieldRef("communicationAddress")}
                      placeholder="Enter communication address"
                      value={communicationAddress}
                      onChange={(event) => setCommunicationAddress(event.target.value)}
                      className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                    />
                  </label>
                </>
              ) : null}
            </div>
          </>
        ) : null}

        {currentStep === 3 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Branding</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Upload your logo, banner, and brand colors.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-5">
                <p className="text-sm font-bold text-[#06201c]">Enterprise Logo</p>
                <p className="mt-1 text-sm text-[#52736a]">
                  PNG, SVG up to 2MB &middot; Recommended 400x400
                </p>
                <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-[#d7e5df] bg-white text-sm text-[#8ca69e]">
                  Upload logo
                </div>
                <label className="mt-4 block">
                  <FieldLabel>Logo URL</FieldLabel>
                  <input
                    ref={registerFieldRef("logoUrl")}
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(event) => setLogoUrl(event.target.value)}
                    className={inputClass()}
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-5">
                <p className="text-sm font-bold text-[#06201c]">Cover / Banner Image</p>
                <p className="mt-1 text-sm text-[#52736a]">
                  JPG, PNG up to 10MB &middot; Recommended 1200x400
                </p>
                <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-[#d7e5df] bg-white text-sm text-[#8ca69e]">
                  Upload banner
                </div>
                <label className="mt-4 block">
                  <FieldLabel>Banner Image URL</FieldLabel>
                  <input
                    ref={registerFieldRef("businessImages")}
                    type="text"
                    placeholder="https://example.com/banner.png"
                    value={businessImages}
                    onChange={(event) => setBusinessImages(event.target.value)}
                    className={inputClass()}
                  />
                </label>
              </div>
              <label className="block">
                <FieldLabel>Brand Color</FieldLabel>
                <input
                  ref={registerFieldRef("brandColor")}
                  type="text"
                  placeholder="#1F5D4E"
                  value={brandColor}
                  onChange={(event) => setBrandColor(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Tagline</FieldLabel>
                <input
                  ref={registerFieldRef("tagline")}
                  type="text"
                  placeholder="Your wellness, our mission"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className={inputClass()}
                />
              </label>
            </div>
          </>
        ) : null}

        {currentStep === 4 ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review &amp; Submit</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Review the details below before creating the enterprise.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Enterprise Name", enterpriseName.trim() || "N/A"],
                    ["Tenant / Organization", tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? "N/A"],
                    ["Trading / DBA Name", tradingName.trim() || "N/A"],
                    ["Description", description.trim() || "N/A"],
                    ["Email", businessEmail.trim() || "N/A"],
                    ["Phone", reviewBusinessPhone || "N/A"],
                    ["Secondary Phone", reviewSecondaryPhone || "N/A"],
                    [
                      "Address",
                      `${streetAddress.trim() || "N/A"}, ${city.trim() || "N/A"}, ${stateProvince.trim() || "N/A"} ${postalCode.trim() || "N/A"}, ${country.trim() || "N/A"}`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#06201c]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5">
                <div className="rounded-2xl bg-[#e8f6ee] p-4 text-[#16825b] border border-[rgba(56,185,143,0.22)]">
                  <p className="text-sm font-bold text-[#16825b]">All required fields completed</p>
                  <p className="mt-1 text-sm leading-5 text-[#14532d]">
                    Review the details above, then click Submit to create this enterprise.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isSubmitting || !isLastStep || !selectedTenantId}
            onClick={() => void handleSubmit("draft")}
            className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save as Draft
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={isFirstStep}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
              className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting || (isLastStep && !selectedTenantId)}
              onClick={() =>
                isLastStep
                  ? void handleSubmit("active")
                  : setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
              }
              className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLastStep ? (isSubmitting ? "Submitting..." : "Submit Enterprise") : "Continue →"}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

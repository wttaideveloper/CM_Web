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

function formatText(value: string | null | undefined) {
  return value?.trim() || "";
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

export default function EditEnterprisePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [enterprise, setEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [description, setDescription] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [communicationAddress, setCommunicationAddress] = useState("");
  const [useRegisteredAddressForOtherAddresses, setUseRegisteredAddressForOtherAddresses] =
    useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [businessImages, setBusinessImages] = useState("");
  const [status, setStatus] = useState("Active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchEnterprise() {
    if (!params.id) {
      setError("Unable to load enterprise.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getEnterpriseById(params.id);
      setEnterprise(data);
      setEnterpriseName(formatText(data.business_legal_name || data.name));
      setTradingName(formatText(data.business_short_name));
      setDescription(formatText(data.business_description || data.description));
      setBusinessEmail(formatText(data.business_email));
      setBusinessPhone(formatText(data.business_phone));
      setRegisteredAddress(formatText(data.registered_address));
      setBusinessAddress(formatText(data.business_address));
      setCommunicationAddress(formatText(data.communication_address));
      setUseRegisteredAddressForOtherAddresses(
        addressesMatch(
          formatText(data.registered_address),
          formatText(data.business_address) || formatText(data.registered_address),
          formatText(data.communication_address) || formatText(data.registered_address),
        ),
      );
      setLogoUrl(formatText(data.logo_url));
      setBusinessImages(formatText(data.business_images));
      setStatus(data.status === false ? "Inactive" : "Active");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load enterprise.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEnterprise();
  }, [params.id]);

  async function handleSubmit() {
    const trimmedName = enterpriseName.trim();
    const trimmedTradingName = tradingName.trim();
    const trimmedDescription = description.trim();
    const trimmedBusinessEmail = businessEmail.trim();
    const trimmedBusinessPhone = businessPhone.trim();
    const trimmedRegisteredAddress = registeredAddress.trim();
    const trimmedBusinessAddress = businessAddress.trim();
    const trimmedCommunicationAddress = communicationAddress.trim();

    if (
      !trimmedName ||
      !trimmedTradingName ||
      !trimmedDescription ||
      !trimmedBusinessEmail ||
      !trimmedBusinessPhone ||
      !trimmedRegisteredAddress ||
      (!useRegisteredAddressForOtherAddresses &&
        (!trimmedBusinessAddress || !trimmedCommunicationAddress))
    ) {
      setError("Please complete all required enterprise fields.");
      return;
    }

    if (!params.id || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateEnterprise(params.id, {
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
        status: status !== "Inactive",
      });

      router.push(`/enterprises/${params.id}`);
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
          <p className="text-base font-bold text-[#06201c]">Unable to load enterprise.</p>
          <p className="mt-2 text-sm text-[#52736a]">Please try again.</p>
          <button
            type="button"
            onClick={() => void fetchEnterprise()}
            className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Retry
          </button>
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
            onClick={() => router.push(`/enterprises/${params.id}`)}
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
          href={`/enterprises/${params.id}`}
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
              <input
                type="text"
                value={businessPhone}
                onChange={(event) => setBusinessPhone(event.target.value)}
                className={inputClass()}
              />
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
            onClick={() => router.push(`/enterprises/${params.id}`)}
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

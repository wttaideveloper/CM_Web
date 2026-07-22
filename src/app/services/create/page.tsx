"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { formatCurrency } from "@/lib/format-currency";
import { getEnterpriseLocations } from "@/services/enterprise-location.service";
import { createDynamicAttribute } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { createService } from "@/services/service.service";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
import type { AvailabilityScheduleItem } from "@/types/service.types";

const tabs = ["Service Info", "Pricing", "Availability", "Review"];

type WeekdaySchedule = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotLength: string;
};

const initialWeekdays: WeekdaySchedule[] = [
  { day: "Monday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Tuesday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Wednesday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Thursday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Friday", enabled: true, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Saturday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
  { day: "Sunday", enabled: false, startTime: "09:00", endTime: "18:00", slotLength: "60" },
];

function generateHourlyTimeOptions() {
  const options: { value: string; label: string }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    options.push({
      value: `${hour.toString().padStart(2, "0")}:00`,
      label: `${displayHour.toString().padStart(2, "0")}:00 ${period}`,
    });
  }

  return options;
}

const timeOptions = generateHourlyTimeOptions();

const deliveryFormatOptions = [
  { value: "in_person", label: "In-person" },
  { value: "virtual", label: "Virtual (Zoom)" },
  { value: "hybrid", label: "Hybrid" },
];

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
  { value: "EUR", label: "EUR (€)" },
];

const cancellationPolicyOptions = [
  { value: "24-hour cancellation required", label: "Flexible - full refund 24hrs before" },
  { value: "Reschedule only", label: "Moderate - reschedule only" },
  { value: "No refund", label: "Strict - no refund" },
];

const serviceDurationOptions = ["30", "60"] as const;

function resolveOptionValue(value: string, options: { value: string; label: string }[]) {
  const normalized = value.trim().toLowerCase();
  const match = options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized,
  );

  return match?.value ?? "";
}

function resolveOptionLabel(value: string, options: { value: string; label: string }[]) {
  return options.find((option) => option.value === value)?.label || value || "Not provided";
}

function buildAvailabilitySchedule(days: WeekdaySchedule[]): AvailabilityScheduleItem[] {
  return days
    .filter((day) => day.enabled)
    .map((day) => ({
      day: day.day.toLowerCase(),
      is_available: true,
      start_time: day.startTime,
      end_time: day.endTime,
      slot_length: day.slotLength,
    }));
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
}

function selectClass() {
  return inputClass();
}

function scheduleSelectClass() {
  return controlClass();
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isValidServicePrice(value: string) {
  const trimmedValue = value.trim();
  const parsedValue = Number(trimmedValue);

  return Boolean(trimmedValue) && Number.isFinite(parsedValue) && parsedValue >= 0;
}

function isValidServiceDuration(value: string) {
  const trimmedValue = value.trim();
  const parsedValue = Number(trimmedValue);

  return Boolean(trimmedValue) && Number.isFinite(parsedValue) && parsedValue > 0;
}

type EnterpriseOption = Pick<
  EnterpriseDto,
  "id" | "business_legal_name" | "business_short_name" | "name"
>;

type LocationOption = Pick<EnterpriseLocationDto, "id" | "location_name" | "city" | "state">;

type CustomAttributeRow = {
  id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
};

type ServiceCreatePageProps = {
  mode?: "super-admin" | "enterprise-admin";
  redirectTo?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tenantId?: string;
};

function createAttributeRow(): CustomAttributeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attribute_name: "",
    attribute_value: "",
    attribute_type: "text",
  };
}

export function ServiceCreatePage({
  mode = "super-admin",
  redirectTo,
  enterpriseId: ownerEnterpriseId,
  enterpriseName: ownerEnterpriseName,
  tenantId: ownerTenantId,
}: ServiceCreatePageProps = {}) {
  const router = useRouter();
  const isEnterpriseAdmin = mode === "enterprise-admin";
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [weekdays, setWeekdays] = useState(initialWeekdays);
  const [enterpriseId, setEnterpriseId] = useState(() =>
    isEnterpriseAdmin ? ownerEnterpriseId ?? "" : "",
  );
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("IT Services");
  const [servicePrice, setServicePrice] = useState("");
  const [duration, setDuration] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [providerName, setProviderName] = useState("");
  const [deliveryFormat, setDeliveryFormat] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [customAttributes, setCustomAttributes] = useState<CustomAttributeRow[]>([]);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [isLoadingEnterprises, setIsLoadingEnterprises] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  const selectedEnterprise = enterpriseOptions.find((enterprise) => enterprise.id === enterpriseId);
  const availabilityStatus = weekdays.some((day) => day.enabled);
  const trimmedServicePrice = servicePrice.trim();
  const trimmedDuration = duration.trim();
  const parsedServicePrice = Number(trimmedServicePrice);
  const parsedDuration = Number(trimmedDuration);
  const isServicePriceValid = isValidServicePrice(servicePrice);
  const isServiceDurationValid = isValidServiceDuration(duration);
  const reviewComplete =
    Boolean(enterpriseId.trim()) &&
    Boolean(serviceName.trim()) &&
    Boolean(serviceDescription.trim()) &&
    Boolean(serviceCategory.trim()) &&
    isServicePriceValid &&
    isServiceDurationValid;

  const reviewEnterpriseName =
    (isEnterpriseAdmin
      ? ownerEnterpriseName || "Unnamed Enterprise"
      : selectedEnterprise?.business_legal_name ||
        selectedEnterprise?.business_short_name ||
        selectedEnterprise?.name ||
        "Unnamed Enterprise");
  const selectedLocation = locationOptions.find((location) => location.id === locationId);
  const reviewDeliveryFormat = resolveOptionLabel(deliveryFormat, deliveryFormatOptions);
  const reviewCurrency = resolveOptionLabel(currency, currencyOptions);
  const reviewCancellationPolicy = resolveOptionLabel(cancellationPolicy, cancellationPolicyOptions);
  const availabilitySchedule = buildAvailabilitySchedule(weekdays);
  const reviewLocationName = selectedLocation
    ? [
        selectedLocation.location_name?.trim(),
        [selectedLocation.city, selectedLocation.state].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const reviewCustomAttributes = customAttributes.filter(
    (attribute) => attribute.attribute_name.trim() && attribute.attribute_value.trim(),
  );

  async function fetchEnterprises() {
    if (isEnterpriseAdmin) {
      if (!ownerEnterpriseId) {
        setEnterpriseOptions([]);
        setEnterpriseId("");
        setError("No enterprise is linked to this organization yet.");
        setIsLoadingEnterprises(false);
        return;
      }

      setEnterpriseOptions([
        {
          id: ownerEnterpriseId,
          business_legal_name: ownerEnterpriseName ?? "",
          business_short_name: ownerEnterpriseName ?? "",
          name: ownerEnterpriseName ?? "",
        },
      ]);
      setEnterpriseId(ownerEnterpriseId);
      setIsLoadingEnterprises(false);
      return;
    }

    try {
      setIsLoadingEnterprises(true);
      setError(null);

      const data = await getEnterprises();
      setEnterpriseOptions(data);
      setEnterpriseId((current) => current || data[0]?.id || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load enterprises.");
      setEnterpriseOptions([]);
    } finally {
      setIsLoadingEnterprises(false);
    }
  }

  async function fetchLocations(nextEnterpriseId: string) {
    if (!nextEnterpriseId) {
      setLocationOptions([]);
      setLocationId("");
      setLocationError(null);
      return;
    }

    try {
      setIsLoadingLocations(true);
      setLocationError(null);
      setLocationOptions([]);

      const data = await getEnterpriseLocations(nextEnterpriseId);
      setLocationOptions(data);
    } catch (fetchError) {
      setLocationOptions([]);
      setLocationError(
        fetchError instanceof Error ? fetchError.message : "Unable to load locations.",
      );
    } finally {
      setIsLoadingLocations(false);
    }
  }

  useEffect(() => {
    void fetchEnterprises();
  }, [isEnterpriseAdmin, ownerEnterpriseId, ownerEnterpriseName]);

  useEffect(() => {
    setLocationId("");
    void fetchLocations(enterpriseId.trim());
  }, [enterpriseId]);

  useEffect(() => {
    if (!serviceDurationOptions.includes(duration as (typeof serviceDurationOptions)[number])) {
      return;
    }

    setWeekdays((current) =>
      current.map((day) => ({
        ...day,
        slotLength: duration,
      })),
    );
  }, [duration]);

  async function handleCreate() {
    const trimmedEnterpriseId = enterpriseId.trim();
    const trimmedTenantId = ownerTenantId?.trim();
    const trimmedServiceName = serviceName.trim();
    const trimmedServiceDescription = serviceDescription.trim();
    const trimmedServiceCategory = serviceCategory.trim();
    const parsedPrice = Number(servicePrice.trim());
    const parsedMinutes = Number(duration.trim());
    const parsedMaxParticipants = optionalNumber(maxParticipants);
    const trimmedProviderName = optionalText(providerName);
    const trimmedDeliveryFormat = optionalText(deliveryFormat);
    const parsedPackagePrice = optionalNumber(packagePrice);
    const trimmedCurrency = optionalText(currency);
    const trimmedCancellationPolicy = optionalText(cancellationPolicy);

    if (
      !trimmedEnterpriseId ||
      !trimmedServiceName ||
      !trimmedServiceDescription ||
      !trimmedServiceCategory ||
      !isValidServicePrice(servicePrice) ||
      !isValidServiceDuration(duration) ||
      (isEnterpriseAdmin && !trimmedTenantId)
    ) {
      setError("Please complete all required service fields before creating.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const createdService = await createService({
        ...(isEnterpriseAdmin && trimmedTenantId ? { tenant_id: trimmedTenantId } : {}),
        enterprise_id: trimmedEnterpriseId,
        ...(locationId.trim() ? { location_id: locationId.trim() } : {}),
        service_name: trimmedServiceName,
        service_description: trimmedServiceDescription,
        service_category: trimmedServiceCategory,
        service_price: parsedPrice,
        duration: parsedMinutes,
        availability_status: availabilityStatus,
        service_status: true,
        ...(parsedMaxParticipants !== undefined ? { max_participants: parsedMaxParticipants } : {}),
        ...(trimmedProviderName ? { provider_name: trimmedProviderName } : {}),
        ...(trimmedDeliveryFormat ? { delivery_format: trimmedDeliveryFormat } : {}),
        ...(parsedPackagePrice !== undefined ? { package_price: parsedPackagePrice } : {}),
        ...(trimmedCurrency ? { currency: trimmedCurrency } : {}),
        ...(trimmedCancellationPolicy ? { cancellation_policy: trimmedCancellationPolicy } : {}),
        availability_schedule: availabilitySchedule,
      });

      const attributeOperations = customAttributes
        .filter(
          (attribute) => attribute.attribute_name.trim() && attribute.attribute_value.trim(),
        )
        .map((attribute) =>
          createDynamicAttribute({
            entity_type: "service",
            entity_id: createdService.id,
            attribute_name: attribute.attribute_name.trim(),
            attribute_value: attribute.attribute_value.trim(),
            attribute_type: attribute.attribute_type,
          }),
        );

      if (attributeOperations.length > 0) {
        const results = await Promise.allSettled(attributeOperations);
        const hasAttributeFailure = results.some((result) => result.status === "rejected");

        if (hasAttributeFailure) {
          setError("Service was created, but some additional attributes could not be saved.");
        }
      }

      router.push(redirectTo || (isEnterpriseAdmin ? "/admin/services" : "/services"));
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to create service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleContinue() {
    const currentIndex = tabs.indexOf(activeTab);

    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
      return;
    }

    void handleCreate();
  }

  return (
    <AppShell>
      <div className="flex items-start gap-3">
        <button
          aria-label="Back"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
        >
          &larr;
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Create Service</h2>
          <p className="mt-1 text-sm text-[#52736a]">Add a new bookable service</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {activeTab === "Service Info" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Service Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Define the service, delivery details, and booking basics.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Service Name*</FieldLabel>
                <input
                  type="text"
                  placeholder="Personal Training Session"
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Category*</FieldLabel>
                <select
                  className={selectClass()}
                  value={serviceCategory}
                  onChange={(event) => setServiceCategory(event.target.value)}
                >
                  {["IT Services", "Training", "Coaching", "Classes", "Recovery", "Therapy", "Mindfulness"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Enterprise*</FieldLabel>
                {isEnterpriseAdmin ? (
                  <input
                    type="text"
                    value={ownerEnterpriseName || "Unnamed Enterprise"}
                    readOnly
                    className={selectClass()}
                  />
                ) : (
                  <select
                    className={selectClass()}
                    value={enterpriseId}
                    onChange={(event) => setEnterpriseId(event.target.value)}
                    disabled={isLoadingEnterprises || enterpriseOptions.length === 0}
                  >
                    <option value="">
                      {isLoadingEnterprises ? "Loading enterprises..." : "Select enterprise"}
                    </option>
                    {enterpriseOptions.map((enterprise) => (
                      <option key={enterprise.id} value={enterprise.id}>
                        {enterprise.business_legal_name ||
                          enterprise.business_short_name ||
                          enterprise.name ||
                          "Unnamed Enterprise"}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="block">
                <FieldLabel>Location</FieldLabel>
                <select
                  className={selectClass()}
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  disabled={
                    !enterpriseId.trim() ||
                    isLoadingLocations ||
                    locationOptions.length === 0 ||
                    Boolean(locationError)
                  }
                >
                  <option value="">
                    {!enterpriseId.trim()
                      ? "Select enterprise first"
                      : isLoadingLocations
                        ? "Loading locations..."
                        : locationOptions.length === 0
                          ? "No locations available"
                          : "Select location"}
                  </option>
                  {locationOptions.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.location_name ||
                        [location.city, location.state].filter(Boolean).join(", ") ||
                        "Unnamed Location"}
                    </option>
                  ))}
                </select>
                {locationError ? (
                  <p className="mt-1.5 text-xs font-medium text-[#b42318]">{locationError}</p>
                ) : null}
              </label>
              <label className="block">
                <FieldLabel>Duration (minutes)*</FieldLabel>
                <select
                  className={selectClass()}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="">Select duration</option>
                  {serviceDurationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Max Participants</FieldLabel>
                <input
                  type="text"
                  placeholder="1"
                  value={maxParticipants}
                  onChange={(event) => setMaxParticipants(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Provider/Instructor</FieldLabel>
                <input
                  type="text"
                  placeholder="Sarah Jones"
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Delivery Format</FieldLabel>
                <select
                  className={selectClass()}
                  value={deliveryFormat}
                  onChange={(event) =>
                    setDeliveryFormat(resolveOptionValue(event.target.value, deliveryFormatOptions))
                  }
                >
                  <option value="">Select delivery format</option>
                  {deliveryFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  placeholder="Describe the service experience, outcomes, and requirements."
                  value={serviceDescription}
                  onChange={(event) => setServiceDescription(event.target.value)}
                  className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Pricing" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Pricing &amp; Cancellation</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Configure session pricing and cancellation terms.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Currency</FieldLabel>
                <select
                  className={selectClass()}
                  value={currency}
                  onChange={(event) =>
                    setCurrency(resolveOptionValue(event.target.value, currencyOptions))
                  }
                >
                  <option value="">Select currency</option>
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Session Price*</FieldLabel>
                <input
                  type="text"
                  placeholder="15000"
                  value={servicePrice}
                  onChange={(event) => setServicePrice(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Package Price (optional)</FieldLabel>
                <input
                  type="text"
                  placeholder="5-pack for $425"
                  value={packagePrice}
                  onChange={(event) => setPackagePrice(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Cancellation Policy</FieldLabel>
                <select
                  className={selectClass()}
                  value={cancellationPolicy}
                  onChange={(event) =>
                    setCancellationPolicy(
                      resolveOptionValue(event.target.value, cancellationPolicyOptions),
                    )
                  }
                >
                  <option value="">Select cancellation policy</option>
                  {cancellationPolicyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Availability" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Weekly Schedule</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Set bookable days, operating hours, and slot length.
              </p>
            </div>
            <div className="space-y-3">
              {weekdays.map((day, index) => (
                <div
                  key={day.day}
                  className="grid gap-3 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-3 md:grid-cols-[1.1fr_1fr_1fr_1fr]"
                >
                  <label className="flex h-[46px] items-center gap-3 text-sm font-bold text-[#06201c]">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() =>
                        setWeekdays((current) =>
                          current.map((currentDay, currentIndex) =>
                            currentIndex === index
                              ? { ...currentDay, enabled: !currentDay.enabled }
                              : currentDay,
                          ),
                        )
                      }
                      className="h-4 w-4 accent-[#1f6a58]"
                    />
                    {day.day}
                  </label>
                  {day.enabled ? (
                    <>
                      <select
                        className={scheduleSelectClass()}
                        value={day.startTime}
                        onChange={(event) =>
                          setWeekdays((current) =>
                            current.map((currentDay, currentIndex) =>
                              currentIndex === index
                                ? { ...currentDay, startTime: event.target.value }
                                : currentDay,
                            ),
                          )
                        }
                      >
                        {timeOptions.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={scheduleSelectClass()}
                        value={day.endTime}
                        onChange={(event) =>
                          setWeekdays((current) =>
                            current.map((currentDay, currentIndex) =>
                              currentIndex === index
                                ? { ...currentDay, endTime: event.target.value }
                                : currentDay,
                            ),
                          )
                        }
                      >
                        {timeOptions.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={scheduleSelectClass()}
                        value={day.slotLength}
                        onChange={(event) =>
                          setWeekdays((current) =>
                            current.map((currentDay, currentIndex) =>
                              currentIndex === index
                                ? { ...currentDay, slotLength: event.target.value }
                                : currentDay,
                            ),
                          )
                        }
                      >
                        {serviceDurationOptions.map((option) => (
                          <option key={option} value={option}>
                            {option} min
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="flex h-[46px] items-center text-sm text-[#8ca69e] md:col-span-3">
                      Not available
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Add optional custom attributes for this service.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCustomAttributes((current) => [...current, createAttributeRow()])}
              className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]"
            >
              + Add Attribute
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {customAttributes.length === 0 ? (
              <p className="text-sm text-[#52736a]">No additional attributes</p>
            ) : (
              customAttributes.map((attribute) => (
                <div
                  key={attribute.id}
                  className="grid gap-3 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4 lg:grid-cols-[1fr_1fr_180px_auto]"
                >
                  <label className="block">
                    <FieldLabel>Attribute Name</FieldLabel>
                    <input
                      type="text"
                      value={attribute.attribute_name}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item.id === attribute.id
                              ? { ...item, attribute_name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      placeholder="Example"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Attribute Value</FieldLabel>
                    <input
                      type="text"
                      value={attribute.attribute_value}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item.id === attribute.id
                              ? { ...item, attribute_value: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      placeholder="Value"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Attribute Type</FieldLabel>
                    <select
                      className={inputClass()}
                      value={attribute.attribute_type}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item.id === attribute.id
                              ? { ...item, attribute_type: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      {["text", "number", "boolean", "date"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomAttributes((current) => current.filter((item) => item.id !== attribute.id))
                      }
                      className="h-[46px] rounded-full border border-[#f3d0cb] px-4 text-sm font-semibold text-[#b42318]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {activeTab === "Review" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review Service</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Review all details before publishing this service.
              </p>
            </div>
            <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Service</p>
                    <p className="mt-1 text-sm font-semibold text-[#06201c]">
                      {serviceName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Enterprise</p>
                    <p className="mt-1 text-sm font-semibold text-[#06201c]">
                      {reviewEnterpriseName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Location</p>
                    <p className="mt-1 text-sm font-semibold text-[#06201c]">
                      {reviewLocationName || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Category</p>
                    <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {serviceCategory || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Duration</p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {isServiceDurationValid ? `${parsedDuration} min` : "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Price</p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {isServicePriceValid
                      ? formatCurrency(parsedServicePrice, currency)
                      : "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Availability</p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {availabilityStatus ? "Available" : "Unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    Delivery Format
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {reviewDeliveryFormat}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    Currency
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">{reviewCurrency}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    Cancellation Policy
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {reviewCancellationPolicy}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-[#06201c]">
                    {reviewComplete ? "Ready to publish" : "Incomplete"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                  Additional Attributes
                </p>
                {reviewCustomAttributes.length === 0 ? (
                  <p className="mt-2 text-sm text-[#52736a]">No additional attributes</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {reviewCustomAttributes.map((attribute) => (
                      <div key={attribute.id} className="rounded-xl bg-[#f9fcfa] p-3">
                        <p className="text-sm font-bold text-[#06201c]">
                          {attribute.attribute_name.trim()}
                        </p>
                        <p className="mt-1 text-sm text-[#52736a]">
                          {attribute.attribute_value.trim()}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">
                          {attribute.attribute_type}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {error ? (
          <div className="mt-4 flex justify-end">
            <div className="rounded-full border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-bold text-[#b42318]">
              {error}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:justify-end">
          <button className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="h-[46px] rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {activeTab === "Review"
              ? isSubmitting
                ? "Creating..."
                : "Create Service"
              : "Continue →"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}

export default function PublicCreateServicePage() {
  return <ServiceCreatePage />;
}

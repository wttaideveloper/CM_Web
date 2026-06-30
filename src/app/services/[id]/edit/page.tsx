"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import {
  createDynamicAttribute,
  deleteDynamicAttribute,
  getDynamicAttributes,
  updateDynamicAttribute,
} from "@/services/attribute.service";
import { getEnterpriseLocations } from "@/services/enterprise-location.service";
import { getServiceById, updateService } from "@/services/service.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
import type { AvailabilityScheduleItem, ServiceDto } from "@/types/service.types";

type ServiceAttributeRow = {
  id?: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
  isDeleted?: boolean;
};

type WeekdaySchedule = {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotLength: string;
};

const categoryOptions = ["IT Services", "Training", "Coaching", "Classes", "Recovery", "Therapy", "Mindfulness"];

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
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

function generateHourlyTimeOptions() {
  const options: { value: string; label: string }[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    options.push({
      value: `${hour.toString().padStart(2, "0")}:00`,
      label: `${displayHour.toString().padStart(2, "0")}:00 ${period}`,
    });
  }

  return options;
}

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

const timeOptions = generateHourlyTimeOptions();

function resolveOptionValue(value: string | undefined, options: { value: string; label: string }[]) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  const match = options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized,
  );

  return match?.value ?? value.trim();
}

function hasCategoryOption(value: string) {
  return categoryOptions.includes(value);
}

function resolveLocationLabel(location: EnterpriseLocationDto) {
  const locationName = location.location_name?.trim();
  const cityState = [location.city, location.state].filter(Boolean).join(", ");

  if (locationName && cityState) {
    return `${locationName} · ${cityState}`;
  }

  return locationName || cityState || "Unnamed Location";
}

function createInitialWeekdays(): WeekdaySchedule[] {
  return weekdayNames.map((day) => ({
    day,
    enabled: false,
    startTime: "09:00",
    endTime: "18:00",
    slotLength: "60",
  }));
}

function buildWeekdayState(schedule?: AvailabilityScheduleItem[]) {
  const initialWeekdays = createInitialWeekdays();

  if (!schedule || schedule.length === 0) {
    return initialWeekdays;
  }

  const scheduleMap = schedule.reduce<Record<string, AvailabilityScheduleItem>>((acc, item) => {
    acc[item.day.trim().toLowerCase()] = item;
    return acc;
  }, {});

  return initialWeekdays.map((day) => {
    const matched = scheduleMap[day.day.toLowerCase()];

    if (!matched) {
      return day;
    }

    return {
      ...day,
      enabled: matched.is_available !== false,
      startTime: matched.start_time?.trim() || day.startTime,
      endTime: matched.end_time?.trim() || day.endTime,
      slotLength: matched.slot_length?.trim() || day.slotLength,
    };
  });
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

function createAttributeRow(attribute?: DynamicAttributeDto): ServiceAttributeRow {
  return {
    id: attribute?.id,
    attribute_name: attribute?.attribute_name ?? "",
    attribute_value: attribute?.attribute_value ?? "",
    attribute_type: attribute?.attribute_type ?? "text",
    isDeleted: false,
  };
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDto | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [duration, setDuration] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [providerName, setProviderName] = useState("");
  const [deliveryFormat, setDeliveryFormat] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [weekdays, setWeekdays] = useState<WeekdaySchedule[]>(() => createInitialWeekdays());
  const [serviceStatus, setServiceStatus] = useState(true);
  const [customAttributes, setCustomAttributes] = useState<ServiceAttributeRow[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationOptions, setLocationOptions] = useState<EnterpriseLocationDto[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLocations(enterpriseId: string, nextLocationId?: string | null) {
    if (!enterpriseId) {
      setLocationOptions([]);
      setLocationId("");
      setLocationError(null);
      return;
    }

    try {
      setIsLoadingLocations(true);
      setLocationError(null);

      const data = await getEnterpriseLocations(enterpriseId);
      setLocationOptions(data);
      setLocationId(nextLocationId ?? "");
    } catch (fetchError) {
      setLocationOptions([]);
      setLocationId(nextLocationId ?? "");
      setLocationError(fetchError instanceof Error ? fetchError.message : "Unable to load locations.");
    } finally {
      setIsLoadingLocations(false);
    }
  }

  async function fetchService() {
    if (!params.id) {
      setError("Missing service id.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getServiceById(params.id);
      setService(data);
      setServiceName(data.service_name || "");
      setServiceDescription(data.service_description || "");
      setServiceCategory(data.service_category || "");
      setServicePrice(String(data.service_price ?? ""));
      setDuration(String(data.duration ?? ""));
      setMaxParticipants(String(data.max_participants ?? ""));
      setProviderName(data.provider_name || "");
      setDeliveryFormat(resolveOptionValue(data.delivery_format, deliveryFormatOptions));
      setPackagePrice(String(data.package_price ?? ""));
      setCurrency(resolveOptionValue(data.currency, currencyOptions));
      setCancellationPolicy(resolveOptionValue(data.cancellation_policy, cancellationPolicyOptions));
      setWeekdays(buildWeekdayState(data.availability_schedule));
      setServiceStatus(data.service_status !== false);
      setLocationId(data.location_id ?? "");
      setLocationError(null);
      void fetchLocations(data.enterprise_id, data.location_id ?? "");

      try {
        const attributes = await getDynamicAttributes("service", data.id);
        setCustomAttributes(attributes.map((attribute) => createAttributeRow(attribute)));
      } catch {
        setCustomAttributes([]);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load service.");
      setService(null);
      setLocationOptions([]);
      setLocationId("");
      setLocationError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchService();
  }, [params.id]);

  async function handleSave() {
    const trimmedName = serviceName.trim();
    const trimmedDescription = serviceDescription.trim();
    const trimmedCategory = serviceCategory.trim();
    const parsedPrice = Number(servicePrice);
    const parsedDuration = Number(duration);
    const parsedMaxParticipants = optionalNumber(maxParticipants);
    const trimmedProviderName = optionalText(providerName);
    const trimmedDeliveryFormat = optionalText(deliveryFormat);
    const parsedPackagePrice = optionalNumber(packagePrice);
    const trimmedCurrency = optionalText(currency);
    const trimmedCancellationPolicy = optionalText(cancellationPolicy);
    const availabilityStatus = weekdays.some((day) => day.enabled);
    const hasIncompleteSchedule = weekdays.some(
      (day) =>
        day.enabled &&
        (!day.startTime.trim() || !day.endTime.trim() || !day.slotLength.trim()),
    );

    if (
      !trimmedName ||
      !trimmedDescription ||
      !trimmedCategory ||
      !Number.isFinite(parsedPrice) ||
      !Number.isFinite(parsedDuration)
    ) {
      setError("Please complete all required service fields.");
      return;
    }

    if (hasIncompleteSchedule) {
      setError("Please complete start time, end time, and slot length for each available day.");
      return;
    }

    if (!params.id || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateService(params.id, {
        service_name: trimmedName,
        service_description: trimmedDescription,
        service_category: trimmedCategory,
        service_price: parsedPrice,
        duration: parsedDuration,
        availability_status: availabilityStatus,
        service_status: serviceStatus,
        ...(locationId.trim() ? { location_id: locationId.trim() } : {}),
        ...(parsedMaxParticipants !== undefined ? { max_participants: parsedMaxParticipants } : {}),
        ...(trimmedProviderName ? { provider_name: trimmedProviderName } : {}),
        ...(trimmedDeliveryFormat ? { delivery_format: trimmedDeliveryFormat } : {}),
        ...(parsedPackagePrice !== undefined ? { package_price: parsedPackagePrice } : {}),
        ...(trimmedCurrency ? { currency: trimmedCurrency } : {}),
        ...(trimmedCancellationPolicy ? { cancellation_policy: trimmedCancellationPolicy } : {}),
        availability_schedule: buildAvailabilitySchedule(weekdays),
      });

      const attributeOperations: Promise<unknown>[] = [];

      customAttributes.forEach((attribute) => {
        if (attribute.isDeleted) {
          if (attribute.id) {
            attributeOperations.push(deleteDynamicAttribute(attribute.id));
          }
          return;
        }

        const trimmedAttributeName = attribute.attribute_name.trim();
        const trimmedAttributeValue = attribute.attribute_value.trim();

        if (!trimmedAttributeName || !trimmedAttributeValue) {
          return;
        }

        if (attribute.id) {
          attributeOperations.push(
            updateDynamicAttribute(attribute.id, {
              attribute_name: trimmedAttributeName,
              attribute_value: trimmedAttributeValue,
              attribute_type: attribute.attribute_type,
            }),
          );
          return;
        }

        attributeOperations.push(
          createDynamicAttribute({
            entity_type: "service",
            entity_id: params.id,
            attribute_name: trimmedAttributeName,
            attribute_value: trimmedAttributeValue,
            attribute_type: attribute.attribute_type,
          }),
        );
      });

      const results = await Promise.allSettled(attributeOperations);
      const hasAttributeFailure = results.some((result) => result.status === "rejected");

      if (hasAttributeFailure) {
        setError("Service was updated, but some additional attributes could not be saved.");
        return;
      }

      router.push(`/services/${params.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const availabilityStatus = weekdays.some((day) => day.enabled);

  if (isLoading) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading service...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
        </section>
      </AppShell>
    );
  }

  if (error && !service) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load service.</p>
          <p className="mt-2 text-sm text-[#52736a]">{error}</p>
          <button
            type="button"
            onClick={() => void fetchService()}
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
          <Link
            href={`/services/${params.id}`}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
          >
            &larr;
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Edit Service</h2>
            <p className="mt-1 text-sm text-[#52736a]">Update service details</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/services/${params.id}`}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Service Name*</FieldLabel>
            <input
              type="text"
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="block">
            <FieldLabel>Category*</FieldLabel>
            <select
              value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}
              className={inputClass()}
            >
              <option value="">Select category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {serviceCategory && !hasCategoryOption(serviceCategory) ? (
                <option value={serviceCategory}>{serviceCategory}</option>
              ) : null}
            </select>
          </label>

          <label className="block md:col-span-2">
            <FieldLabel>Description*</FieldLabel>
            <textarea
              value={serviceDescription}
              onChange={(event) => setServiceDescription(event.target.value)}
              className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>

          <label className="block">
            <FieldLabel>Price*</FieldLabel>
            <input
              type="number"
              step="0.01"
              value={servicePrice}
              onChange={(event) => setServicePrice(event.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="block">
            <FieldLabel>Duration (minutes)*</FieldLabel>
            <input
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="block">
            <FieldLabel>Availability Status</FieldLabel>
            <select
              value={availabilityStatus ? "Available" : "Unavailable"}
              disabled
              className={inputClass()}
            >
              <option>Available</option>
              <option>Unavailable</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel>Service Status*</FieldLabel>
            <select
              value={serviceStatus ? "Active" : "Inactive"}
              onChange={(event) => setServiceStatus(event.target.value === "Active")}
              className={inputClass()}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>Location</FieldLabel>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className={inputClass()}
              disabled={isLoadingLocations || locationOptions.length === 0}
            >
              <option value="">
                {isLoadingLocations
                  ? "Loading locations..."
                  : locationOptions.length === 0
                    ? "No locations available"
                    : "Select location"}
              </option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {resolveLocationLabel(location)}
                </option>
              ))}
            </select>
            {locationError ? (
              <p className="mt-1.5 text-xs font-medium text-[#b42318]">{locationError}</p>
            ) : null}
          </label>
          <label className="block">
            <FieldLabel>Max Participants</FieldLabel>
            <input
              type="text"
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Provider/Instructor</FieldLabel>
            <input
              type="text"
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Delivery Format</FieldLabel>
            <select
              value={deliveryFormat}
              onChange={(event) => setDeliveryFormat(resolveOptionValue(event.target.value, deliveryFormatOptions))}
              className={inputClass()}
            >
              <option value="">Select delivery format</option>
              {deliveryFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Package Price</FieldLabel>
            <input
              type="text"
              value={packagePrice}
              onChange={(event) => setPackagePrice(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Currency</FieldLabel>
            <select
              value={currency}
              onChange={(event) => setCurrency(resolveOptionValue(event.target.value, currencyOptions))}
              className={inputClass()}
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
            <FieldLabel>Cancellation Policy</FieldLabel>
            <select
              value={cancellationPolicy}
              onChange={(event) =>
                setCancellationPolicy(resolveOptionValue(event.target.value, cancellationPolicyOptions))
              }
              className={inputClass()}
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

        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#06201c]">Weekly Schedule</h3>
            <p className="mt-1 text-sm text-[#52736a]">
              Set the days, hours, and slot length for this service.
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
                      className={controlClass()}
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
                      className={controlClass()}
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
                      className={controlClass()}
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
                      {["30", "45", "60", "90"].map((option) => (
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
        </div>

        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Update custom attributes for this service.
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
              customAttributes.map((attribute, index) => (
                <div
                  key={attribute.id || `new-${index}`}
                  className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_1fr_180px_auto] ${
                    attribute.isDeleted
                      ? "border-[#f3d0cb] bg-[#fff6f5] opacity-75"
                      : "border-[#edf3f0] bg-[#f9fcfa]"
                  }`}
                >
                  <label className="block">
                    <FieldLabel>Attribute Name</FieldLabel>
                    <input
                      type="text"
                      value={attribute.attribute_name}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item === attribute
                              ? { ...item, attribute_name: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      disabled={attribute.isDeleted}
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
                            item === attribute
                              ? { ...item, attribute_value: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      disabled={attribute.isDeleted}
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
                            item === attribute
                              ? { ...item, attribute_type: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      disabled={attribute.isDeleted}
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
                      onClick={() => {
                        if (attribute.id) {
                          setCustomAttributes((current) =>
                            current.map((item) =>
                              item === attribute
                                ? { ...item, isDeleted: !item.isDeleted }
                                : item,
                            ),
                          );
                          return;
                        }

                        setCustomAttributes((current) =>
                          current.filter((item) => item !== attribute),
                        );
                      }}
                      className={`h-[46px] rounded-full border px-4 text-sm font-semibold ${
                        attribute.isDeleted
                          ? "border-[#d7e5df] text-[#1f6a58]"
                          : "border-[#f3d0cb] text-[#b42318]"
                      }`}
                    >
                      {attribute.isDeleted ? "Undo Remove" : "Remove"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-semibold text-[#b42318]">{error}</p>
        ) : null}
      </section>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createDynamicAttribute } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { createService } from "@/services/service.service";
import type { EnterpriseDto } from "@/types/enterprise.types";

const tabs = ["Service Info", "Pricing", "Availability", "Review"];

const initialWeekdays = [
  { day: "Monday", enabled: true },
  { day: "Tuesday", enabled: true },
  { day: "Wednesday", enabled: true },
  { day: "Thursday", enabled: true },
  { day: "Friday", enabled: true },
  { day: "Saturday", enabled: false },
  { day: "Sunday", enabled: false },
];

function generateHourlyTimeOptions() {
  const options: string[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    options.push(`${displayHour.toString().padStart(2, "0")}:00 ${period}`);
  }

  return options;
}

const timeOptions = generateHourlyTimeOptions();

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

type CustomAttributeRow = {
  id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
};

function createAttributeRow(): CustomAttributeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attribute_name: "",
    attribute_value: "",
    attribute_type: "text",
  };
}

export default function CreateServicePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [weekdays, setWeekdays] = useState(initialWeekdays);
  const [enterpriseId, setEnterpriseId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("IT Services");
  const [servicePrice, setServicePrice] = useState("");
  const [duration, setDuration] = useState("");
  const [customAttributes, setCustomAttributes] = useState<CustomAttributeRow[]>([]);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [isLoadingEnterprises, setIsLoadingEnterprises] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    selectedEnterprise?.business_legal_name ||
    selectedEnterprise?.business_short_name ||
    selectedEnterprise?.name ||
    "Unnamed Enterprise";
  const reviewCustomAttributes = customAttributes.filter(
    (attribute) => attribute.attribute_name.trim() && attribute.attribute_value.trim(),
  );

  async function fetchEnterprises() {
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

  useEffect(() => {
    void fetchEnterprises();
  }, []);

  async function handleCreate() {
    const trimmedEnterpriseId = enterpriseId.trim();
    const trimmedServiceName = serviceName.trim();
    const trimmedServiceDescription = serviceDescription.trim();
    const trimmedServiceCategory = serviceCategory.trim();
    const parsedPrice = Number(servicePrice.trim());
    const parsedMinutes = Number(duration.trim());

    if (
      !trimmedEnterpriseId ||
      !trimmedServiceName ||
      !trimmedServiceDescription ||
      !trimmedServiceCategory ||
      !isValidServicePrice(servicePrice) ||
      !isValidServiceDuration(duration)
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
        enterprise_id: trimmedEnterpriseId,
        service_name: trimmedServiceName,
        service_description: trimmedServiceDescription,
        service_category: trimmedServiceCategory,
        service_price: parsedPrice,
        duration: parsedMinutes,
        availability_status: availabilityStatus,
        service_status: true,
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

      router.push("/services");
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
                <select
                  className={selectClass()}
                  value={enterpriseId}
                  onChange={(event) => setEnterpriseId(event.target.value)}
                  disabled={isLoadingEnterprises || enterpriseOptions.length === 0}
                >
                  <option value="">{isLoadingEnterprises ? "Loading enterprises..." : "Select enterprise"}</option>
                  {enterpriseOptions.map((enterprise) => (
                    <option key={enterprise.id} value={enterprise.id}>
                      {enterprise.business_legal_name ||
                        enterprise.business_short_name ||
                        enterprise.name ||
                        "Unnamed Enterprise"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Duration (minutes)*</FieldLabel>
                <input
                  type="text"
                  placeholder="30"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Max Participants</FieldLabel>
                <input type="text" placeholder="1" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Provider/Instructor</FieldLabel>
                <input type="text" placeholder="Sarah Jones" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Delivery Format</FieldLabel>
                <select className={selectClass()} defaultValue="In-person">
                  {["In-person", "Virtual (Zoom)", "Hybrid"].map((option) => (
                    <option key={option}>{option}</option>
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
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Currency</FieldLabel>
                <select className={selectClass()} defaultValue="USD ($)">
                  {["USD ($)", "INR (₹)", "EUR (€)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Cancellation Policy</FieldLabel>
                <select
                  className={selectClass()}
                  defaultValue="Flexible - full refund 24hrs before"
                >
                  {[
                    "Flexible - full refund 24hrs before",
                    "Moderate - full refund 48hrs before",
                    "Strict - no refund",
                  ].map((option) => (
                    <option key={option}>{option}</option>
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
                      <select className={scheduleSelectClass()} defaultValue="09:00 AM">
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <select className={scheduleSelectClass()} defaultValue="06:00 PM">
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <select className={scheduleSelectClass()} defaultValue="60 min">
                        {["30 min", "45 min", "60 min", "90 min"].map((option) => (
                          <option key={option}>{option}</option>
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
                      ? `₹${parsedServicePrice.toFixed(2)}`
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

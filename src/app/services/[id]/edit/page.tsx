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
import { getServiceById, updateService } from "@/services/service.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { ServiceDto } from "@/types/service.types";

type ServiceAttributeRow = {
  id?: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
  isDeleted?: boolean;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
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
  const [availabilityStatus, setAvailabilityStatus] = useState(true);
  const [serviceStatus, setServiceStatus] = useState(true);
  const [customAttributes, setCustomAttributes] = useState<ServiceAttributeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setAvailabilityStatus(data.availability_status !== false);
      setServiceStatus(data.service_status !== false);

      try {
        const attributes = await getDynamicAttributes("service", data.id);
        setCustomAttributes(attributes.map((attribute) => createAttributeRow(attribute)));
      } catch {
        setCustomAttributes([]);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load service.");
      setService(null);
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
            <input
              type="text"
              value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}
              className={inputClass()}
            />
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
            <FieldLabel>Availability Status*</FieldLabel>
            <select
              value={availabilityStatus ? "Available" : "Unavailable"}
              onChange={(event) => setAvailabilityStatus(event.target.value === "Available")}
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

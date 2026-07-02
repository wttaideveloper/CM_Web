"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getDynamicAttributes } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { getLocationById } from "@/services/enterprise-location.service";
import { activateService, getServiceById } from "@/services/service.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
import type { ServiceDto } from "@/types/service.types";

function formatPrice(price: number) {
  return `₹${Number.isFinite(price) ? price.toFixed(2) : "0.00"}`;
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function resolveLocationSummary(location: EnterpriseLocationDto) {
  const locationName = location.location_name?.trim();
  const cityState = [location.city, location.state].filter(Boolean).join(", ");

  if (locationName && cityState) {
    return `${locationName} · ${cityState}`;
  }

  return locationName || cityState || "Not provided";
}

function formatMaybeNumber(value: number | undefined, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value}${suffix}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#06201c]">{value}</p>
    </div>
  );
}

type ServiceDetailsPageProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
};

export function ServiceDetailsPage({
  enterpriseFilterId,
  listHref = "/services",
  editHrefBase = "/services",
}: ServiceDetailsPageProps = {}) {
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDto | null>(null);
  const [enterpriseMap, setEnterpriseMap] = useState<Record<string, EnterpriseDto>>({});
  const [locationSummary, setLocationSummary] = useState("Not provided");
  const [dynamicAttributes, setDynamicAttributes] = useState<DynamicAttributeDto[]>([]);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  async function fetchService() {
    if (!params.id) {
      setError("Missing service id.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setAccessDenied(null);

      const [serviceData, enterpriseData] = await Promise.all([
        getServiceById(params.id),
        getEnterprises(),
      ]);

      if (enterpriseFilterId && serviceData.enterprise_id !== enterpriseFilterId) {
        setService(null);
        setEnterpriseMap({});
        setLocationSummary("Not provided");
        setLocationError(null);
        setIsLoadingLocation(false);
        setDynamicAttributes([]);
        setAttributesError(null);
        setAccessDenied("This service belongs to another enterprise.");
        return;
      }

      const nextEnterpriseMap = enterpriseData.reduce<Record<string, EnterpriseDto>>((acc, enterprise) => {
        acc[enterprise.id] = enterprise;
        return acc;
      }, {});

      setService(serviceData);
      setEnterpriseMap(nextEnterpriseMap);
      setDynamicAttributes([]);
      setAttributesError(null);
      setLocationSummary("Not provided");
      setLocationError(null);
      const serviceLocationId = serviceData.location_id?.trim();
      setIsLoadingLocation(Boolean(serviceLocationId));

      if (serviceLocationId) {
        void (async () => {
          try {
            const locationData = await getLocationById(serviceLocationId);
            setLocationSummary(resolveLocationSummary(locationData));
          } catch {
            setLocationError("Unable to load location");
            setLocationSummary("Unable to load location");
          } finally {
            setIsLoadingLocation(false);
          }
        })();
      }

      void (async () => {
        try {
          const attributesData = await getDynamicAttributes("service", serviceData.id);
          setDynamicAttributes(attributesData);
        } catch {
          setDynamicAttributes([]);
          setAttributesError("Unable to load additional attributes.");
        }
      })();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load service.");
      setService(null);
      setEnterpriseMap({});
      setLocationSummary("Not provided");
      setLocationError(null);
      setIsLoadingLocation(false);
      setDynamicAttributes([]);
      setAttributesError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchService();
  }, [params.id]);

  async function handleActivate() {
    if (!service || isTogglingStatus) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to activate this service?");
    if (!confirmed) {
      return;
    }

    try {
      setIsTogglingStatus(true);
      const updatedService = await activateService(service.id);
      setService(updatedService);
    } catch {
      window.alert("Unable to activate service.");
    } finally {
      setIsTogglingStatus(false);
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

  if (error) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load service.</p>
          <p className="mt-2 text-sm text-[#52736a]">Please try again.</p>
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

  if (accessDenied) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Access denied.</p>
          <p className="mt-2 text-sm text-[#52736a]">{accessDenied}</p>
          <Link
            href={listHref}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Back to Services
          </Link>
        </section>
      </AppShell>
    );
  }

  if (!service) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load service.</p>
        </section>
      </AppShell>
    );
  }

  const enterpriseName =
    enterpriseMap[service.enterprise_id]
      ? resolveEnterpriseName(enterpriseMap[service.enterprise_id])
      : "Unknown Enterprise";
  const locationValue = locationError
    ? locationError
    : isLoadingLocation
      ? "Loading location..."
      : locationSummary;
  const serviceStatus = service.service_status === false ? "Inactive" : "Active";
  const availabilityStatus = service.availability_status === false ? "Unavailable" : "Available";

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">
            {service.service_name || "Unnamed Service"}
          </h2>
          <p className="mt-1 text-sm text-[#52736a]">Service details</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${editHrefBase}/${service.id}/edit`}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Edit Service
          </Link>
          <Link
            href={listHref}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Back to Services
          </Link>
          {serviceStatus !== "Active" ? (
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={isTogglingStatus}
              className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#16825b] shadow-sm disabled:opacity-60"
            >
              Activate
            </button>
          ) : null}
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              serviceStatus === "Active"
                ? "bg-[#e8f6ee] text-[#16825b]"
                : "bg-[#fff1f0] text-[#b42318]"
            }`}
          >
            {serviceStatus}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              availabilityStatus === "Available"
                ? "bg-[#e8f6ee] text-[#16825b]"
                : "bg-[#fff7e5] text-[#b7791f]"
            }`}
          >
            {availabilityStatus}
          </span>
          <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">
            {service.service_category || "N/A"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DetailRow label="Service Name" value={service.service_name || "N/A"} />
          <DetailRow label="Category" value={service.service_category || "N/A"} />
          <DetailRow label="Price" value={formatPrice(service.service_price)} />
          <DetailRow label="Duration" value={`${service.duration || 0} min`} />
          <DetailRow label="Enterprise" value={enterpriseName} />
          <DetailRow label="Location" value={locationValue} />
          <DetailRow label="Status" value={serviceStatus} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailRow
            label="Max Participants"
            value={formatMaybeNumber(service.max_participants)}
          />
          <DetailRow label="Provider / Instructor" value={service.provider_name || "N/A"} />
          <DetailRow label="Delivery Format" value={service.delivery_format || "N/A"} />
          <DetailRow
            label="Package Price"
            value={
              service.package_price !== undefined ? formatPrice(service.package_price) : "N/A"
            }
          />
          <DetailRow label="Currency" value={service.currency || "N/A"} />
          <DetailRow label="Cancellation Policy" value={service.cancellation_policy || "N/A"} />
        </div>

        <div className="mt-4 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
            Description
          </p>
          <p className="mt-2 text-sm leading-6 text-[#52736a]">
            {service.service_description || "N/A"}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
          <p className="mt-1 text-sm text-[#52736a]">
            Extra service details supplied through dynamic attributes.
          </p>
        </div>

        {attributesError ? (
          <p className="mt-4 text-sm text-[#b42318]">{attributesError}</p>
        ) : dynamicAttributes.length === 0 ? (
          <p className="mt-4 text-sm text-[#52736a]">No additional attributes added yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dynamicAttributes.map((attribute) => (
              <div
                key={attribute.id}
                className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#06201c]">
                      {attribute.attribute_name || "Unnamed attribute"}
                    </p>
                    <p className="mt-1 text-sm text-[#52736a]">
                      {attribute.attribute_value || "N/A"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#16825b]">
                    {attribute.attribute_type || "unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default function PublicServiceDetailsPage() {
  return <ServiceDetailsPage />;
}

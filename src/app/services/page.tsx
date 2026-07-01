"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { getEnterprises } from "@/services/enterprise.service";
import { getServices } from "@/services/service.service";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { ServiceDto, ServiceListItem } from "@/types/service.types";

const filters = ["Category", "Enterprise", "Status"];

function statusClass(status: string) {
  return status === "Active"
    ? "bg-[#e8f6ee] text-[#16825b]"
    : "bg-[#fff7e5] text-[#b7791f]";
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function toEnterpriseList(data: EnterpriseDto[] | { items?: EnterpriseDto[] } | null | undefined) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

function mapServiceToListItem(
  service: ServiceDto,
  enterpriseNameMap: Record<string, string>,
): ServiceListItem {
  return {
    id: service.id,
    enterpriseId: service.enterprise_id,
    name: service.service_name || "Unnamed Service",
    description: service.service_description || "",
    category: service.service_category || "N/A",
    price: `₹${Number.isFinite(service.service_price) ? service.service_price.toFixed(2) : "0.00"}`,
    duration: `${Number.isFinite(service.duration) ? service.duration : 0} min`,
    availability: service.availability_status === false ? "Unavailable" : "Available",
    status: service.service_status === false ? "Inactive" : "Active",
    enterprise: enterpriseNameMap[service.enterprise_id] || "Unknown Enterprise",
    bookings: "—",
  };
}

type ServicesPageProps = {
  enterpriseFilterId?: string;
  createHref?: string;
  detailHrefBase?: string;
  editHrefBase?: string;
  enterpriseName?: string;
};

export function ServicesPage({
  enterpriseFilterId,
  createHref = "/services/create",
  detailHrefBase = "/services",
  editHrefBase = "/services",
  enterpriseName,
}: ServicesPageProps = {}) {
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchServices() {
    try {
      setIsLoading(true);
      setError(null);

      const serviceData = await getServices();
      let enterpriseData: EnterpriseDto[] | { items?: EnterpriseDto[] } | null = [];

      try {
        enterpriseData = await getEnterprises();
      } catch {
        enterpriseData = [];
      }

      const nextEnterpriseNameMap = toEnterpriseList(enterpriseData).reduce<Record<string, string>>(
        (acc, enterprise) => {
        acc[enterprise.id] = resolveEnterpriseName(enterprise);
        return acc;
      },
      {});

      const filteredServices = enterpriseFilterId
        ? serviceData.filter((service) => service.enterprise_id === enterpriseFilterId)
        : serviceData;

      setServices(
        filteredServices.map((service) =>
          mapServiceToListItem(
            service,
            enterpriseName
              ? { [service.enterprise_id]: enterpriseName }
              : nextEnterpriseNameMap,
          ),
        ),
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load services.");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchServices();
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Service Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Manage all bookable services across enterprise accounts
          </p>
        </div>
        <Link
          href={createHref}
          className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
        >
          + Add Service
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search services..."
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        {isLoading ? (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">Loading services...</p>
            <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
          </div>
        ) : error ? (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">Unable to load services.</p>
            <p className="mt-2 text-sm text-[#52736a]">Please try again.</p>
            <button
              type="button"
              onClick={() => void fetchServices()}
              className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">No services found.</p>
            <p className="mt-2 text-sm text-[#52736a]">Create a service to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-left">
              <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
                <tr>
                  <th className="w-[22%] px-3 py-3 font-bold">Service</th>
                  <th className="w-[19%] px-3 py-3 font-bold">Enterprise</th>
                  <th className="w-[12%] px-3 py-3 font-bold">Category</th>
                  <th className="w-[9%] px-3 py-3 font-bold">Price</th>
                  <th className="w-[10%] px-3 py-3 font-bold">Duration</th>
                  <th className="w-[10%] px-3 py-3 font-bold">Bookings</th>
                  <th className="w-[10%] px-3 py-3 font-bold">Status</th>
                  <th className="w-[8%] px-3 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f0]">
                {services.map((service, index) => (
                  <tr
                    key={service.id}
                    className="h-16 cursor-pointer text-xs transition-colors duration-150 hover:bg-emerald-50/60"
                  >
                    <td className="px-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">
                          S{index + 1}
                        </span>
                        <span className="truncate font-semibold text-[#06201c]">
                          {service.name}
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-3 text-[#52736a]">{service.enterprise}</td>
                    <td className="truncate px-3 text-[#52736a]">{service.category}</td>
                    <td className="px-3 font-semibold text-[#06201c]">{service.price}</td>
                    <td className="px-3 text-[#52736a]">{service.duration}</td>
                    <td className="px-3 text-[#52736a]">{service.bookings}</td>
                    <td className="px-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          service.status,
                        )}`}
                      >
                        {service.status}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex gap-1.5 text-[#52736a]">
                        <Link
                          href={`${detailHrefBase}/${service.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                          aria-label={`View ${service.name}`}
                        >
                          <EyeIcon />
                        </Link>
                        <Link
                          href={`${editHrefBase}/${service.id}/edit`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                          aria-label={`Edit ${service.name}`}
                        >
                          <EditIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default function PublicServicesPage() {
  return <ServicesPage />;
}

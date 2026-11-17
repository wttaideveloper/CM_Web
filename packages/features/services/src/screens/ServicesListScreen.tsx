"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { getEnterprises, type EnterpriseDto } from "@ihp/enterprises";
import { formatCurrency } from "@ihp/shared";

import { SERVICE_CATEGORY_OPTIONS } from "../constants/service-category-options";
import { serviceBookingCopy } from "../service-booking-copy.en";
import { getServicesPage } from "../services/service.service";
import type { ServiceDto, ServiceListItem, ServiceStatus } from "../types/service.types";
import type { ServicesListScreenProps } from "../types/service-screen-config.types";

const SERVICE_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const SERVICE_STATUS_OPTIONS: Array<{ value: ServiceStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
];

function statusClass(status: string) {
  if (status === "Active") return "bg-[#e8f6ee] text-[#16825b]";
  if (status === "Draft") return "bg-[#eef4ff] text-[#315ea8]";
  return "bg-[#fff7e5] text-[#b7791f]";
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
    description: service.service_description || service.description || "",
    category: service.service_category || service.category || "N/A",
    price: formatCurrency(service.service_price ?? service.price ?? 0, service.currency ?? undefined),
    duration: `${Number.isFinite(service.duration ?? service.duration_minutes) ? service.duration ?? service.duration_minutes : 0} min`,
    availability: service.availability_status === false ? "Unavailable" : "Available",
    status: service.status === "draft"
      ? "Draft"
      : service.service_status === false || service.status === "inactive"
        ? "Inactive"
        : "Active",
    enterprise: enterpriseNameMap[service.enterprise_id] || "Unknown Enterprise",
    bookings: "—",
    rating: typeof service.rating === "number" && Number.isFinite(service.rating) ? service.rating : null,
    reviewsCount: typeof service.reviews_count === "number" ? service.reviews_count : undefined,
  };
}

export default function ServicesListScreen({
  enterpriseFilterId,
  createHref = "/services/create",
  detailHrefBase = "/services",
  editHrefBase = "/services",
  bookingManagementHref,
  enterpriseName,
  enterprisesLoader = getEnterprises,
  readOnly = false,
}: ServicesListScreenProps = {}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ServiceStatus | "">("");
  const [enterpriseId, setEnterpriseId] = useState(enterpriseFilterId ?? "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const serviceQuery = useQuery({
    queryKey: ["services", "list", {
      search: debouncedSearch,
      enterprise_id: enterpriseFilterId ?? enterpriseId,
      category,
      status,
      page,
      page_size: SERVICE_PAGE_SIZE,
    }],
    queryFn: ({ signal }) => getServicesPage({
      search: debouncedSearch || undefined,
      enterprise_id: (enterpriseFilterId ?? enterpriseId) || undefined,
      category: category || undefined,
      status: status || undefined,
      page,
      page_size: SERVICE_PAGE_SIZE,
    }, signal),
    staleTime: 30_000,
    retry: 1,
  });

  const enterpriseQuery = useQuery({
    queryKey: ["services", "enterprise-options"],
    queryFn: enterprisesLoader,
    staleTime: 60_000,
    retry: 1,
  });

  const enterpriseNameMap = useMemo(
    () => toEnterpriseList(enterpriseQuery.data).reduce<Record<string, string>>((acc, enterprise) => {
      acc[enterprise.id] = resolveEnterpriseName(enterprise);
      return acc;
    }, {}),
    [enterpriseQuery.data],
  );

  const services = useMemo<ServiceListItem[]>(
    () => (serviceQuery.data?.items ?? []).map((service) => mapServiceToListItem(
      service,
      enterpriseName
        ? { [service.enterprise_id]: enterpriseName }
        : enterpriseNameMap,
    )),
    [enterpriseName, enterpriseNameMap, serviceQuery.data?.items],
  );

  const pagination = serviceQuery.data?.pagination;
  const currentPage = pagination?.page ?? page;
  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination ? currentPage < pagination.total_pages : false;
  const isLoading = serviceQuery.isPending;
  const error = serviceQuery.error;
  const isRefreshing = serviceQuery.isFetching && !isLoading;

  function resetAndSet<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Service Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Manage all bookable services across enterprise accounts
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!readOnly && bookingManagementHref ? (
            <Link
              href={bookingManagementHref}
              className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58]"
            >
              {serviceBookingCopy.previewLink}
            </Link>
          ) : null}
          {!readOnly ? (
            <Link
              href={createHref}
              className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              + Add Service
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="sr-only" htmlFor="service-search">Search services</label>
          <input
            id="service-search"
            type="search"
            placeholder="Search services..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="service-category-filter">Category</label>
            <select
              id="service-category-filter"
              value={category}
              onChange={(event) => resetAndSet(setCategory, event.target.value)}
              className="h-10 rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#52736a]"
            >
              <option value="">All categories</option>
              {SERVICE_CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {!enterpriseFilterId ? (
              <>
                <label className="sr-only" htmlFor="service-enterprise-filter">Enterprise</label>
                <select
                  id="service-enterprise-filter"
                  value={enterpriseId}
                  onChange={(event) => resetAndSet(setEnterpriseId, event.target.value)}
                  className="h-10 rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#52736a]"
                >
                  <option value="">All enterprises</option>
                  {toEnterpriseList(enterpriseQuery.data).map((enterprise) => (
                    <option key={enterprise.id} value={enterprise.id}>{resolveEnterpriseName(enterprise)}</option>
                  ))}
                </select>
              </>
            ) : null}
            <label className="sr-only" htmlFor="service-status-filter">Status</label>
            <select
              id="service-status-filter"
              value={status}
              onChange={(event) => resetAndSet(setStatus, event.target.value as ServiceStatus | "")}
              className="h-10 rounded-full border border-[#d7e5df] bg-white px-4 text-sm font-semibold text-[#52736a]"
            >
              <option value="">All statuses</option>
              {SERVICE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
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
            <p className="mt-2 text-sm text-[#52736a]">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => void serviceQuery.refetch()}
              className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">No services found.</p>
            <p className="mt-2 text-sm text-[#52736a]">
              {search || category || status || enterpriseId
                ? "Try changing your search or filters."
                : "Create a service to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-left">
              <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
                <tr>
                  <th scope="col" className="w-[22%] px-3 py-3 font-bold">Service</th>
                  <th scope="col" className="w-[19%] px-3 py-3 font-bold">Enterprise</th>
                  <th scope="col" className="w-[12%] px-3 py-3 font-bold">Category</th>
                  <th scope="col" className="w-[9%] px-3 py-3 font-bold">Price</th>
                  <th scope="col" className="w-[10%] px-3 py-3 font-bold">Duration</th>
                  <th scope="col" className="w-[10%] px-3 py-3 font-bold">Bookings</th>
                  <th scope="col" className="w-[10%] px-3 py-3 font-bold">Status</th>
                  <th scope="col" className="w-[8%] px-3 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f0]">
                {services.map((service, index) => (
                  <tr
                    key={service.id}
                    className="h-16 text-xs transition-colors duration-150 hover:bg-emerald-50/60"
                  >
                    <td className="px-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">
                          S{index + 1}
                        </span>
                        <span className="truncate font-semibold text-[#06201c]" title={service.name}>
                          {service.name}
                        </span>
                      </div>
                      {service.reviewsCount !== undefined ? <p className="ml-[46px] text-[11px] font-semibold text-[#805900]">{service.reviewsCount > 0 ? `${service.rating?.toFixed(1) ?? "No rating"} ★ (${service.reviewsCount})` : "No ratings yet"}</p> : null}
                    </td>
                    <td className="truncate px-3 text-[#52736a]" title={service.enterprise}>{service.enterprise}</td>
                    <td className="truncate px-3 text-[#52736a]" title={service.category}>{service.category}</td>
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
                        {!readOnly ? (
                          <Link
                            href={`${editHrefBase}/${service.id}/edit`}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                            aria-label={`Edit ${service.name}`}
                          >
                            <EditIcon />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && !error ? (
          <div className="flex flex-col gap-3 border-t border-[#edf3f0] px-5 py-4 text-sm text-[#52736a] sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pagination.total === 0
                ? "0 services"
                : `Page ${currentPage} of ${pagination.total_pages} · ${pagination.total} service${pagination.total === 1 ? "" : "s"}`}
              {isRefreshing ? " · Updating..." : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoPrevious || isRefreshing}
                onClick={() => setPage(currentPage - 1)}
                className="h-10 rounded-full border border-[#d7e5df] px-4 font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canGoNext || isRefreshing}
                onClick={() => setPage(currentPage + 1)}
                className="h-10 rounded-full border border-[#d7e5df] px-4 font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

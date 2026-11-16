import type {
  CreateServicePayload,
  PaginatedServiceList,
  ServiceDto,
  ServiceListQuery,
  UpdateServicePayload,
} from "../types/service.types";
import { normalizeServiceDetailResponse } from "../service.models.ts";

type ServiceListResponse = ServiceDto[] | { items?: ServiceDto[] };
const SERVICES_API_BASE = "/api/v1/services";

function appendQueryValue(query: URLSearchParams, name: string, value: string | number | undefined) {
  if (value === undefined || value === "") {
    return;
  }

  query.set(name, String(value));
}

/** Builds the documented query string for the paginated Service list endpoint. */
export function buildServiceListUrl(params: ServiceListQuery = {}): string {
  const query = new URLSearchParams();

  appendQueryValue(query, "search", params.search?.trim());
  appendQueryValue(query, "tenant_id", params.tenant_id);
  appendQueryValue(query, "enterprise_id", params.enterprise_id);
  appendQueryValue(query, "category", params.category);
  appendQueryValue(query, "location_id", params.location_id);
  appendQueryValue(query, "status", params.status);
  appendQueryValue(query, "page", params.page);
  appendQueryValue(query, "page_size", params.page_size);

  const queryString = query.toString();
  return queryString ? `${SERVICES_API_BASE}/?${queryString}` : `${SERVICES_API_BASE}/`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Validates the exact paginated Service list envelope documented by OpenAPI. */
export function normalizePaginatedServiceList(data: unknown): PaginatedServiceList {
  if (!isRecord(data) || !Array.isArray(data.items) || !isRecord(data.pagination)) {
    throw new Error("The services response is malformed.");
  }

  const { total, page, page_size: pageSize, total_pages: totalPages } = data.pagination;
  if (
    !isNonNegativeInteger(total) ||
    !isPositiveInteger(page) ||
    !isPositiveInteger(pageSize) ||
    !isNonNegativeInteger(totalPages)
  ) {
    throw new Error("The services pagination metadata is malformed.");
  }

  if (data.items.some((item) => !isRecord(item))) {
    throw new Error("The services response contains a malformed item.");
  }

  return {
    items: data.items as ServiceDto[],
    pagination: {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    },
  };
}

/** Fetches one backend-paginated Service list page without changing legacy consumers. */
export async function getServicesPage(
  params: ServiceListQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedServiceList> {
  const response = await fetch(buildServiceListUrl(params), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load services (${response.status} ${response.statusText}).`);
  }

  return normalizePaginatedServiceList(await response.json());
}

export async function getServices(): Promise<ServiceDto[]> {
  const response = await fetch(`${SERVICES_API_BASE}/`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to load services (${response.status} ${response.statusText}).`);
  }

  const data: ServiceListResponse = await response.json();

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export async function getServiceById(id: string): Promise<ServiceDto> {
  const response = await fetch(`${SERVICES_API_BASE}/${id}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to load service (${response.status} ${response.statusText}).`);
  }

  return normalizeServiceDetailResponse(await response.json());
}

export async function createService(payload: CreateServicePayload): Promise<ServiceDto> {
  const response = await fetch(`${SERVICES_API_BASE}/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create service (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function updateService(
  id: string,
  payload: UpdateServicePayload,
): Promise<ServiceDto> {
  const response = await fetch(`${SERVICES_API_BASE}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update service (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function deactivateService(id: string): Promise<ServiceDto> {
  return updateService(id, { service_status: false });
}

export async function activateService(id: string): Promise<ServiceDto> {
  return updateService(id, { service_status: true });
}

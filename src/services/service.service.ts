import { API_BASE_URL } from "@/lib/api";
import type {
  CreateServicePayload,
  ServiceDto,
  UpdateServicePayload,
} from "@/types/service.types";

type ServiceListResponse = ServiceDto[] | { items?: ServiceDto[] };

export async function getServices(): Promise<ServiceDto[]> {
  const response = await fetch(`${API_BASE_URL}/services/`, {
    method: "GET",
    cache: "no-store",
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
  const response = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load service (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function createService(payload: CreateServicePayload): Promise<ServiceDto> {
  const response = await fetch(`${API_BASE_URL}/services/`, {
    method: "POST",
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
  const response = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: "PUT",
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

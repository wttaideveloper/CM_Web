import type {
  CreateServicePayload,
  ServiceDto,
  UpdateServicePayload,
} from "@/types/service.types";

export async function getServices(): Promise<ServiceDto[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/services/`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load services (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function getServiceById(id: string): Promise<ServiceDto> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/services/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load service (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function createService(payload: CreateServicePayload): Promise<ServiceDto> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/services/`, {
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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/services/${id}`, {
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

export async function deactivateService(id: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/services/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate service (${response.status} ${response.statusText}).`);
  }

  return response.text();
}

export async function activateService(id: string): Promise<ServiceDto> {
  return updateService(id, { service_status: true });
}

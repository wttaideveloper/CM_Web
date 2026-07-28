import { API_BASE_URL } from "@/lib/api";
import type {
  CreateEnterpriseLocationPayload,
  EnterpriseLocationDto,
  UpdateEnterpriseLocationPayload,
} from "@/types/location.types";

type EnterpriseLocationListResponse =
  | EnterpriseLocationDto[]
  | { items?: EnterpriseLocationDto[] };

function isEnterpriseLocationArray(value: unknown): value is EnterpriseLocationDto[] {
  return Array.isArray(value);
}

function isEnterpriseLocationListResponse(
  value: unknown,
): value is { items?: EnterpriseLocationDto[] } {
  return typeof value === "object" && value !== null && "items" in value;
}

function getEnterpriseLocationsBaseUrl(enterpriseId: string): string {
  return `${API_BASE_URL}/enterprises/${enterpriseId}/locations`;
}

function getLocationBaseUrl(locationId: string): string {
  return `${API_BASE_URL}/locations/${locationId}`;
}

export async function getEnterpriseLocations(
  enterpriseId: string,
): Promise<EnterpriseLocationDto[]> {
  const response = await fetch(getEnterpriseLocationsBaseUrl(enterpriseId), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load enterprise locations (${response.status} ${response.statusText}).`,
    );
  }

  const data: EnterpriseLocationListResponse = await response.json();

  if (isEnterpriseLocationArray(data)) {
    return data;
  }

  if (isEnterpriseLocationListResponse(data) && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export async function createEnterpriseLocation(
  enterpriseId: string,
  payload: CreateEnterpriseLocationPayload,
): Promise<EnterpriseLocationDto> {
  const response = await fetch(getEnterpriseLocationsBaseUrl(enterpriseId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create enterprise location (${response.status} ${response.statusText}).`,
    );
  }

  return response.json();
}

export async function getLocationById(locationId: string): Promise<EnterpriseLocationDto> {
  const response = await fetch(getLocationBaseUrl(locationId), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load location (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function updateLocation(
  locationId: string,
  payload: UpdateEnterpriseLocationPayload,
): Promise<EnterpriseLocationDto> {
  const response = await fetch(getLocationBaseUrl(locationId), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update location (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function deleteLocation(locationId: string): Promise<void> {
  const response = await fetch(getLocationBaseUrl(locationId), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete location (${response.status} ${response.statusText}).`);
  }
}

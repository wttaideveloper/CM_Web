import { API_BASE_URL } from "@/lib/api";
import type {
  AttributeEntityType,
  CreateDynamicAttributePayload,
  DynamicAttributeDto,
  UpdateDynamicAttributePayload,
} from "@/types/attribute.types";

export async function getDynamicAttributes(
  entityType: AttributeEntityType,
  entityId: string,
): Promise<DynamicAttributeDto[]> {
  const query = `entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`;

  const response = await fetch(`${API_BASE_URL}/v1/api/attributes?${query}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load dynamic attributes (${response.status} ${response.statusText}).`,
    );
  }

  return response.json();
}

export async function createDynamicAttribute(
  payload: CreateDynamicAttributePayload,
): Promise<DynamicAttributeDto> {
  const response = await fetch(`${API_BASE_URL}/v1/api/attributes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create dynamic attribute (${response.status} ${response.statusText}).`,
    );
  }

  return response.json();
}

export async function updateDynamicAttribute(
  id: string,
  payload: UpdateDynamicAttributePayload,
): Promise<DynamicAttributeDto> {
  const response = await fetch(`${API_BASE_URL}/v1/api/attributes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to update dynamic attribute (${response.status} ${response.statusText}).`,
    );
  }

  return response.json();
}

export async function deleteDynamicAttribute(id: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/v1/api/attributes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to delete dynamic attribute (${response.status} ${response.statusText}).`,
    );
  }

  return response.text();
}

import { API_BASE_URL } from "@/lib/api";
import type {
  CreateEnterprisePayload,
  EnterpriseDto,
  UpdateEnterprisePayload,
} from "@/types/enterprise.types";

type EnterpriseListResponse = EnterpriseDto[] | { items?: EnterpriseDto[] };

function getEnterprisesApiBase(): string {
  return `${API_BASE_URL}/enterprises/`;
}

export async function getEnterprises(): Promise<EnterpriseDto[]> {
  const response = await fetch(getEnterprisesApiBase(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load enterprises (${response.status} ${response.statusText}).`);
  }

  const data: EnterpriseListResponse = await response.json();

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export async function getEnterpriseById(id: string): Promise<EnterpriseDto> {
  const response = await fetch(`${getEnterprisesApiBase()}${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load enterprise (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function createEnterprise(
  payload: CreateEnterprisePayload,
): Promise<EnterpriseDto> {
  const response = await fetch(getEnterprisesApiBase(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create enterprise (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function updateEnterprise(
  id: string,
  payload: UpdateEnterprisePayload,
): Promise<EnterpriseDto> {
  const response = await fetch(`${getEnterprisesApiBase()}${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update enterprise (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function deactivateEnterprise(id: string): Promise<EnterpriseDto> {
  return updateEnterprise(id, { status: false });
}

export async function activateEnterprise(id: string): Promise<EnterpriseDto> {
  return updateEnterprise(id, { status: true });
}

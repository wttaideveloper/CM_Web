import type {
  CreateEnterprisePayload,
  EnterpriseDto,
  UpdateEnterprisePayload,
} from "@/types/enterprise.types";

function getEnterprisesApiBase(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  return `${baseUrl}/api/v1/api/enterprises/`;
}

export async function getEnterprises(): Promise<EnterpriseDto[]> {
  const response = await fetch(getEnterprisesApiBase(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load enterprises (${response.status} ${response.statusText}).`);
  }

  return response.json();
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

export async function deactivateEnterprise(id: string): Promise<string> {
  const response = await fetch(`${getEnterprisesApiBase()}${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate enterprise (${response.status} ${response.statusText}).`);
  }

  return response.text();
}

export async function activateEnterprise(id: string): Promise<EnterpriseDto> {
  return updateEnterprise(id, { status: true });
}

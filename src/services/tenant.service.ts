export interface TenantDetails {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
}

export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  roleName: string;
  status: string;
  roleSlug: string;
}

export type TenantMeResponse = {
  message: string;
  data: TenantDetails;
};

function isTenantMember(value: unknown): value is TenantMember {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.fullName === "string" &&
    typeof value.role === "string" &&
    typeof value.roleName === "string" &&
    typeof value.status === "string" &&
    typeof value.roleSlug === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTenantDetails(value: unknown): value is TenantDetails {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.plan === "string" &&
    typeof value.status === "string" &&
    isRecord(value.settings)
  );
}

export async function getTenantMe(): Promise<TenantMeResponse> {
  const response = await fetch("/api/v1/tenant/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Unable to load tenant (${response.status} ${response.statusText}).`);
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || typeof payload.message !== "string" || !isTenantDetails(payload.data)) {
    throw new Error("Invalid tenant response.");
  }

  return {
    message: payload.message,
    data: payload.data,
  };
}

export async function getTenantMembers(): Promise<TenantMember[]> {
  const response = await fetch("/api/v1/tenant/members", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Unable to load tenant members (${response.status} ${response.statusText}).`);
  }

  const payload = (await response.json()) as unknown;
  const members = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : [];

  if (!members.every(isTenantMember)) {
    throw new Error("Invalid tenant members response.");
  }

  return members;
}

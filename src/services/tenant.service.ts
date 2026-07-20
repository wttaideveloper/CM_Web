export interface TenantDetails {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
}

export type TenantMeResponse = {
  message: string;
  data: TenantDetails;
};

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

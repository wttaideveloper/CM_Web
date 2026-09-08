import type {
  CreateEnterprisePayload,
  EnterpriseDto,
  EnterpriseLocationDto,
  UpdateEnterpriseLocationPayload,
  UpdateEnterprisePayload,
} from "@ihp/enterprises";

/** Normalized Platform Enterprise BFF failure retaining dedicated authorization status. */
export class PlatformEnterprisesApiError extends Error {
  readonly fieldErrors: Record<string, string[]>;

  constructor(readonly status: number, message: string, readonly details?: unknown) {
    super(message);
    this.name = "PlatformEnterprisesApiError";
    this.fieldErrors = fieldErrorsFromResponse(details);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enterpriseErrorMessage(status: number, body: unknown): string {
  if (status === 401) return "Super Admin authentication is required.";
  if (status === 403) return "You do not have permission to access enterprises.";
  return isRecord(body) && typeof body.detail === "string" ? body.detail : "Unable to load enterprises.";
}

function fieldErrorsFromResponse(body: unknown): Record<string, string[]> {
  if (!isRecord(body)) return {};
  const errors: Record<string, string[]> = {};
  if (Array.isArray(body.detail)) {
    for (const item of body.detail) {
      if (!isRecord(item) || !Array.isArray(item.loc) || typeof item.msg !== "string") continue;
      const field = [...item.loc].reverse().find((value): value is string => typeof value === "string" && value !== "body");
      if (field) errors[field] = [...(errors[field] ?? []), item.msg];
    }
  }
  for (const [field, value] of Object.entries(body)) {
    if (field === "detail" || field === "message") continue;
    if (typeof value === "string") errors[field] = [value];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) errors[field] = value;
  }
  return errors;
}

/** Retrieves the Marketplace Enterprise collection through the Platform-only Super Admin BFF. */
export async function getPlatformEnterprises(): Promise<EnterpriseDto[]> {
  const response = await fetch("/api/platform-super-admin/enterprises", { credentials: "include", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PlatformEnterprisesApiError(response.status, enterpriseErrorMessage(response.status, body), body);
  }

  if (Array.isArray(body)) return body as EnterpriseDto[];
  if (isRecord(body) && Array.isArray(body.items)) return body.items as EnterpriseDto[];
  throw new PlatformEnterprisesApiError(502, "Unable to load enterprises.");
}

/** Retrieves one Marketplace Enterprise through the Platform-only Super Admin BFF. */
export async function getPlatformEnterpriseById(enterpriseId: string): Promise<EnterpriseDto> {
  const response = await fetch(`/api/platform-super-admin/enterprises/${encodeURIComponent(enterpriseId)}`, {
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PlatformEnterprisesApiError(response.status, enterpriseErrorMessage(response.status, body), body);
  }

  if (!isRecord(body) || typeof body.id !== "string") {
    throw new PlatformEnterprisesApiError(502, "Unable to load enterprises.");
  }

  return body as EnterpriseDto;
}

async function getPlatformEnterpriseJson(path: string): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PlatformEnterprisesApiError(response.status, enterpriseErrorMessage(response.status, body));
  }
  return body;
}

async function mutatePlatformEnterpriseJson(path: string, method: "POST" | "PUT" | "DELETE", payload?: object): Promise<unknown> {
  const response = await fetch(path, {
    method,
    ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
  });
  if (response.status === 204) return undefined;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PlatformEnterprisesApiError(response.status, enterpriseErrorMessage(response.status, body), body);
  return body;
}

function expectEnterprise(value: unknown): EnterpriseDto {
  if (!isRecord(value) || typeof value.id !== "string") throw new PlatformEnterprisesApiError(502, "Unable to load enterprises.");
  return value as EnterpriseDto;
}

function expectLocation(value: unknown): EnterpriseLocationDto {
  if (!isRecord(value) || typeof value.id !== "string") throw new PlatformEnterprisesApiError(502, "Unable to load enterprise location.");
  return value as EnterpriseLocationDto;
}

/** Creates an Enterprise through the Platform-only Super Admin BFF. */
export async function createPlatformEnterprise(payload: CreateEnterprisePayload): Promise<EnterpriseDto> {
  return expectEnterprise(await mutatePlatformEnterpriseJson("/api/platform-super-admin/enterprises", "POST", payload));
}

/** Updates Enterprise fields or lifecycle status through the Platform-only Super Admin BFF. */
export async function updatePlatformEnterprise(enterpriseId: string, payload: UpdateEnterprisePayload): Promise<EnterpriseDto> {
  return expectEnterprise(await mutatePlatformEnterpriseJson(`/api/platform-super-admin/enterprises/${encodeURIComponent(enterpriseId)}`, "PUT", payload));
}

export function activatePlatformEnterprise(enterpriseId: string): Promise<EnterpriseDto> {
  return updatePlatformEnterprise(enterpriseId, { status: "active" });
}

export function deactivatePlatformEnterprise(enterpriseId: string): Promise<EnterpriseDto> {
  return updatePlatformEnterprise(enterpriseId, { status: "inactive" });
}

/** Retrieves Enterprise locations through the Platform-only Super Admin BFF. */
export async function getPlatformEnterpriseLocations(enterpriseId: string): Promise<EnterpriseLocationDto[]> {
  const body = await getPlatformEnterpriseJson(`/api/platform-super-admin/enterprises/${encodeURIComponent(enterpriseId)}/locations`);
  if (Array.isArray(body)) return body as EnterpriseLocationDto[];
  if (isRecord(body) && Array.isArray(body.items)) return body.items as EnterpriseLocationDto[];
  throw new PlatformEnterprisesApiError(502, "Unable to load enterprise locations.");
}

/** Retrieves one Enterprise location through the Platform-only Super Admin BFF. */
export async function getPlatformEnterpriseLocationById(locationId: string): Promise<EnterpriseLocationDto> {
  const body = await getPlatformEnterpriseJson(`/api/platform-super-admin/enterprise-locations/${encodeURIComponent(locationId)}`);
  return expectLocation(body);
}

export async function createPlatformEnterpriseLocation(enterpriseId: string, payload: Omit<UpdateEnterpriseLocationPayload, "id">): Promise<EnterpriseLocationDto> {
  return expectLocation(await mutatePlatformEnterpriseJson(`/api/platform-super-admin/enterprises/${encodeURIComponent(enterpriseId)}/locations`, "POST", payload));
}

export async function updatePlatformEnterpriseLocation(locationId: string, payload: UpdateEnterpriseLocationPayload): Promise<EnterpriseLocationDto> {
  return expectLocation(await mutatePlatformEnterpriseJson(`/api/platform-super-admin/enterprise-locations/${encodeURIComponent(locationId)}`, "PUT", payload));
}

export async function deletePlatformEnterpriseLocation(locationId: string): Promise<void> {
  await mutatePlatformEnterpriseJson(`/api/platform-super-admin/enterprise-locations/${encodeURIComponent(locationId)}`, "DELETE");
}

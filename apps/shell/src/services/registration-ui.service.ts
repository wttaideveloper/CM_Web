export type RegistrationPlan = "starter" | "professional" | "enterprise";

export type TenantApplicationStatus = "documents_pending" | "under_review" | "approved" | "rejected" | string;

export type TenantApplicationDocument = {
  id: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadUrl: string | null;
};

export type TenantApplication = {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  module: string;
  plan: string;
  status: TenantApplicationStatus;
  industryType: string;
  companySize: string;
  country: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerFullName: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  tenantId: string | null;
  documents: TenantApplicationDocument[];
  tenantName: string;
};

export type DocumentRequirement = { documentType: string; label: string; description: string; required: boolean };

export type CreatedTenant = {
  id: string;
  slug: string;
  name: string;
  plan: RegistrationPlan | string;
  status: string;
  industryType: string;
  companySize: string;
  country: string;
};

export { getPasswordRequirements } from "@ihp/auth";
export type { PasswordRequirementsResponse } from "@ihp/auth";

export type RegisterOwnerAccountPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  country: string;
  module: "enterprise";
};

export type RegisterOwnerAccountResponse = {
  message: string;
  data: {
    user: Record<string, unknown> | null;
    userId: string;
    accountExists: boolean;
    errorMessage: string | null;
  };
  raw: unknown;
};

export type VerifyEmailResponse = { message: string; data: unknown; raw: unknown };
export type ResendVerificationResponse = VerifyEmailResponse;

export type RegisterOrganizationPayload = {
  userId: string;
  password?: string;
  tenantName: string;
  tenantSlug: string;
  industryType: string;
  companySize: string;
  plan: RegistrationPlan;
  module: "enterprise";
};

export type RegisterOrganizationResponse = {
  message: string;
  data: {
    user: Record<string, unknown> | null;
    tenant: CreatedTenant;
    accountExists: boolean;
  };
  raw: unknown;
};

export type TenantApplicationCreatePayload = { userId: string; tenantName: string; tenantSlug: string; industryType: string; companySize: string; module: string; plan: string; country: string };

export class RegistrationApiError extends Error {
  constructor(
    message: string,
    readonly kind: "network_failure" | "invalid_response" | "validation_error" | "conflict" | "unknown",
    readonly status: number | null = null,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "RegistrationApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  try {
    return { text, json: text ? (JSON.parse(text) as unknown) : null };
  } catch {
    return { text, json: null as unknown };
  }
}

function addFieldError(errors: Record<string, string[]>, field: string, message: string) {
  const normalizedField = field
    .replace(/^body\./, "")
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

  if (!normalizedField || !message.trim()) {
    return;
  }

  errors[normalizedField] ??= [];
  if (!errors[normalizedField].includes(message.trim())) {
    errors[normalizedField].push(message.trim());
  }
}

function collectApiError(value: unknown, fieldErrors: Record<string, string[]>, messages: string[]) {
  if (typeof value === "string") {
    if (value.trim()) messages.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (isRecord(item) && Array.isArray(item.loc) && typeof item.msg === "string") {
        const location = item.loc.filter((part): part is string => typeof part === "string" && part !== "body").join(".");
        addFieldError(fieldErrors, location, item.msg);
        messages.push(item.msg);
      } else {
        collectApiError(item, fieldErrors, messages);
      }
    }
    return;
  }

  if (!isRecord(value)) return;

  for (const key of ["message", "errorMessage", "detail", "error", "title"]) {
    if (key in value) collectApiError(value[key], fieldErrors, messages);
  }

  if (isRecord(value.errors)) {
    for (const [field, error] of Object.entries(value.errors)) {
      const items = Array.isArray(error) ? error : [error];
      for (const item of items) {
        if (typeof item === "string") addFieldError(fieldErrors, field, item);
      }
    }
  }
}

function apiError(response: Response, text: string, json: unknown, fallback: string) {
  const fieldErrors: Record<string, string[]> = {};
  const messages: string[] = [];
  collectApiError(json ?? text, fieldErrors, messages);
  const kind = response.status === 409 ? "conflict" : [400, 401, 403, 409, 422].includes(response.status) ? "validation_error" : "unknown";
  return new RegistrationApiError(messages.join(", ") || text || fallback, kind, response.status, fieldErrors);
}

async function requestJson(path: string, payload: unknown, fallback: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new RegistrationApiError(
      error instanceof Error ? error.message : "Network error while completing request.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);
  if (!response.ok) throw apiError(response, text, json, fallback);
  if (!isRecord(json)) throw new RegistrationApiError(fallback, "invalid_response", response.status);
  return json;
}

async function requestJsonWithMethod(path: string, method: "GET" | "POST", payload: unknown, fallback: string) {
  if (method === "GET") {
    const response = await fetch(path, { credentials: "include" });
    const { text, json } = await readResponseBody(response);
    if (!response.ok) throw apiError(response, text, json, fallback);
    if (!isRecord(json)) throw new RegistrationApiError(fallback, "invalid_response", response.status);
    return json;
  }
  return requestJson(path, payload, fallback);
}

function isTenantApplicationDocument(value: unknown): value is TenantApplicationDocument {
  return isRecord(value) && typeof value.id === "string" && typeof value.documentType === "string" && typeof value.fileName === "string" && typeof value.contentType === "string" && typeof value.sizeBytes === "number" && typeof value.uploadedAt === "string" && (typeof value.downloadUrl === "string" || value.downloadUrl === null);
}

function isTenantApplication(value: unknown): value is TenantApplication {
  return isRecord(value) && typeof value.id === "string" && typeof value.ownerUserId === "string" && typeof value.slug === "string" && (typeof value.name === "string" || typeof value.tenantName === "string") && typeof value.module === "string" && typeof value.plan === "string" && typeof value.status === "string" && typeof value.industryType === "string" && typeof value.companySize === "string" && typeof value.country === "string" && typeof value.ownerEmail === "string" && typeof value.ownerPhone === "string" && typeof value.ownerFullName === "string" && (typeof value.submittedAt === "string" || value.submittedAt === null) && (typeof value.reviewedAt === "string" || value.reviewedAt === null) && (typeof value.reviewNotes === "string" || value.reviewNotes === null) && (typeof value.tenantId === "string" || value.tenantId === null) && Array.isArray(value.documents) && value.documents.every(isTenantApplicationDocument);
}

function unwrapApplication(raw: Record<string, unknown>, fallback: string): TenantApplication {
  if (!isRecord(raw.data) || !isTenantApplication(raw.data)) throw new RegistrationApiError(fallback, "invalid_response");
  const name = typeof raw.data.name === "string" ? raw.data.name : raw.data.tenantName as string;
  const tenantName = typeof raw.data.tenantName === "string" ? raw.data.tenantName : name;
  return { ...raw.data, name, tenantName };
}

export async function getDocumentRequirements(): Promise<DocumentRequirement[]> {
  const raw = await requestJsonWithMethod("/api/v1/auth/tenant-applications/document-requirements", "GET", null, "Invalid document requirements response.");
  if (!Array.isArray(raw.data) || !raw.data.every((item) => isRecord(item) && typeof item.documentType === "string" && typeof item.label === "string" && typeof item.description === "string" && typeof item.required === "boolean")) throw new RegistrationApiError("Invalid document requirements response.", "invalid_response");
  return raw.data as DocumentRequirement[];
}

export async function createTenantApplication(payload: TenantApplicationCreatePayload): Promise<TenantApplication> {
  return unwrapApplication(await requestJson("/api/v1/auth/tenant-applications", payload, "Invalid tenant application response."), "Invalid tenant application response.");
}

export async function getMyTenantApplication(userId?: string): Promise<TenantApplication> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return unwrapApplication(await requestJsonWithMethod(`/api/v1/auth/tenant-applications/mine${query}`, "GET", null, "Invalid tenant application response."), "Invalid tenant application response.");
}

export async function initTenantApplicationUpload(applicationId: string, userId: string, payload: { documentType: string; fileName: string; contentType: string; fileSizeBytes: number }) {
  const raw = await requestJson(`/api/v1/auth/tenant-applications/${encodeURIComponent(applicationId)}/documents/upload/init?userId=${encodeURIComponent(userId)}`, { userId, ...payload }, "Unable to initialize document upload.");
  if (!isRecord(raw.data) || typeof raw.data.uploadUrl !== "string" || typeof raw.data.storageKey !== "string" || typeof raw.data.documentType !== "string" || typeof raw.data.expiresInSeconds !== "number") throw new RegistrationApiError("Invalid upload-init response.", "invalid_response");
  return raw.data as { uploadUrl: string; storageKey: string; documentType: string; expiresInSeconds: number };
}

export async function uploadTenantApplicationFile(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, { method: "PUT", headers: file.type ? { "Content-Type": file.type } : undefined, body: file });
  if (!response.ok) throw new RegistrationApiError("Unable to upload document.", "unknown", response.status);
}

export async function completeTenantApplicationUpload(applicationId: string, userId: string, payload: { documentType: string; storageKey: string; fileName: string; contentType: string; fileSizeBytes: number }): Promise<TenantApplication> {
  return unwrapApplication(await requestJson(`/api/v1/auth/tenant-applications/${encodeURIComponent(applicationId)}/documents/upload/complete?userId=${encodeURIComponent(userId)}`, { userId, ...payload }, "Unable to complete document upload."), "Invalid upload-complete response.");
}

export async function submitTenantApplication(applicationId: string, userId: string): Promise<TenantApplication> {
  return unwrapApplication(await requestJson(`/api/v1/auth/tenant-applications/${encodeURIComponent(applicationId)}/submit?userId=${encodeURIComponent(userId)}`, undefined, "Unable to submit tenant application."), "Invalid tenant application response.");
}

function isCreatedTenant(value: unknown): value is CreatedTenant {
  return isRecord(value) &&
    typeof value.id === "string" && typeof value.slug === "string" && typeof value.name === "string" &&
    typeof value.plan === "string" && typeof value.status === "string" && typeof value.industryType === "string" &&
    typeof value.companySize === "string" && typeof value.country === "string";
}

export async function registerOwnerAccount(payload: RegisterOwnerAccountPayload): Promise<RegisterOwnerAccountResponse> {
  const raw = await requestJson("/api/v1/auth/register-owner-account", payload, "Invalid register-owner-account response.");
  const data = raw.data;
  if (typeof raw.message !== "string" || !isRecord(data) || !isRecord(data.user) && data.user !== null ||
    typeof data.userId !== "string" || typeof data.accountExists !== "boolean" ||
    (typeof data.errorMessage !== "string" && data.errorMessage !== null)) {
    throw new RegistrationApiError("Invalid register-owner-account response.", "invalid_response");
  }
  return { message: raw.message, data: data as RegisterOwnerAccountResponse["data"], raw };
}

export async function verifyEmail(payload: { email: string; otp: string }): Promise<VerifyEmailResponse> {
  const raw = await requestJson("/api/v1/auth/verify-email", payload, "Invalid verify-email response.");
  if (typeof raw.message !== "string") throw new RegistrationApiError("Invalid verify-email response.", "invalid_response");
  return { message: raw.message, data: raw.data, raw };
}

export async function resendVerification(payload: { email: string }): Promise<ResendVerificationResponse> {
  const raw = await requestJson("/api/v1/auth/resend-verification", payload, "Invalid resend-verification response.");
  if (typeof raw.message !== "string") throw new RegistrationApiError("Invalid resend-verification response.", "invalid_response");
  return { message: raw.message, data: raw.data, raw };
}

export async function registerOrganization(payload: RegisterOrganizationPayload): Promise<RegisterOrganizationResponse> {
  const raw = await requestJson("/api/v1/auth/register-organization", payload, "Invalid register-organization response.");
  const data = raw.data;
  if (typeof raw.message !== "string" || !isRecord(data) || !isRecord(data.user) && data.user !== null ||
    !isCreatedTenant(data.tenant) || typeof data.accountExists !== "boolean") {
    throw new RegistrationApiError("Invalid register-organization response.", "invalid_response");
  }
  return { message: raw.message, data: data as RegisterOrganizationResponse["data"], raw };
}

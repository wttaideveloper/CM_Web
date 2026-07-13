export type AuthUser = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  country?: string;
  preferredLocale?: string;
  emailVerified: boolean;
  groups: string[];
  membership?: {
    tenantRole?: string;
    tenantSlug?: string;
    tenantName?: string;
    knowledgeRoles?: string[];
    canInviteUsers?: boolean;
    userRole?: string;
    tenantRbacRoles?: string[];
    tenantPermissions?: string[];
  };
  roles?: {
    tenantRole?: string;
    tenantSlug?: string;
    tenantName?: string;
    userRole?: string;
    tenantRbacRoles?: string[];
    tenantPermissions?: string[];
    knowledgeRoles?: string[];
    canInviteUsers?: boolean;
  };
};

export type CompleteLoginResponse = {
  message: string;
  data: AuthUser;
};

export type SessionResponse = {
  authenticated: boolean;
  data: AuthUser | null;
  raw: unknown;
};

export type LogoutResponse = {
  logoutUrl: string | null;
  raw: unknown;
};

export type PasswordRequirementsResponse = {
  message: string | null;
  data: unknown;
  raw: unknown;
};

export type TenantDetails = {
  id: string | null;
  name: string;
  slug: string;
  industryType: string;
  companySize: string;
  country: string;
  plan: string;
  status: string;
  raw: Record<string, unknown>;
};

export type TenantMeResponse = {
  message: string | null;
  data: TenantDetails | null;
  raw: unknown;
};

export type TenantMember = {
  membershipId: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
};

export type TenantMembersResponse = {
  message: string | null;
  data: TenantMember[];
  raw: unknown;
};

export type InviteRoleOption = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  raw: Record<string, unknown>;
};

export type InviteRolesResponse = {
  message: string | null;
  data: InviteRoleOption[];
  raw: unknown;
};

export type UpdateAuthProfilePayload = {
  fullName: string;
  phone: string;
  address: string;
  country: string;
  preferredLocale: string;
};

export type UpdateAuthProfileResponse = {
  message: string | null;
  data: AuthUser | null;
  raw: unknown;
};

export type RegistrationPlan = "starter" | "professional" | "enterprise";

export type RegisterOwnerAccountPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  country: string;
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

export type VerifyEmailPayload = {
  email: string;
  otp: string;
};

export type VerifyEmailResponse = {
  message: string;
  data: unknown;
  raw: unknown;
};

export type ResendVerificationPayload = {
  email: string;
};

export type ResendVerificationResponse = {
  message: string;
  data: unknown;
  raw: unknown;
};

export type RegisterOrganizationPayload = {
  userId: string;
  password: string;
  tenantName: string;
  tenantSlug: string;
  industryType: string;
  companySize: string;
  plan: RegistrationPlan;
};

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

export type RegisterOrganizationResponse = {
  message: string;
  data: {
    user: Record<string, unknown> | null;
    tenant: CreatedTenant;
    accountExists: boolean;
  };
  raw: unknown;
};

export type RegistrationApiErrorKind =
  | "network_failure"
  | "invalid_response"
  | "validation_error"
  | "conflict"
  | "unknown";

export class RegistrationApiError extends Error {
  status: number | null;
  kind: RegistrationApiErrorKind;
  fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    kind: RegistrationApiErrorKind,
    status: number | null = null,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "RegistrationApiError";
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type AuthErrorKind =
  | "missing_session_code"
  | "expired_or_used_session_code"
  | "invalid_response"
  | "network_failure"
  | "unknown";

export class AuthServiceError extends Error {
  status: number | null;
  kind: AuthErrorKind;

  constructor(message: string, kind: AuthErrorKind, status: number | null = null) {
    super(message);
    this.name = "AuthServiceError";
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.fullName === "string" &&
    typeof value.emailVerified === "boolean" &&
    Array.isArray(value.groups)
  );
}

function parseCompleteLoginResponse(value: unknown): CompleteLoginResponse | null {
  if (!isRecord(value) || typeof value.message !== "string" || !isAuthUser(value.data)) {
    return null;
  }

  return {
    message: value.message,
    data: value.data,
  };
}

function extractSessionUser(value: unknown, seen = new Set<object>()): AuthUser | null {
  if (isAuthUser(value)) {
    return value;
  }

  if (!isRecord(value) || seen.has(value)) {
    return null;
  }

  seen.add(value);

  const directCandidates = [
    value.data,
    isRecord(value.data) ? value.data.user : null,
    value.user,
    value.result,
    value.payload,
  ];

  for (const candidate of directCandidates) {
    if (isAuthUser(candidate)) {
      return candidate;
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (isAuthUser(nestedValue)) {
      return nestedValue;
    }

    if (!isRecord(nestedValue)) {
      continue;
    }

    const sessionUser = extractSessionUser(nestedValue, seen);
    if (sessionUser) {
      return sessionUser;
    }
  }

  return null;
}

function parseSessionResponse(value: unknown): SessionResponse {
  const data = extractSessionUser(value);
  const authenticated =
    isRecord(value) && typeof value.authenticated === "boolean" ? value.authenticated : Boolean(data);

  return {
    authenticated,
    data: authenticated ? data : null,
    raw: value,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractLogoutUrl(value: unknown, seen = new Set<object>()): string | null {
  const directString = readString(value);
  if (directString) {
    if (/^https?:\/\//i.test(directString) || directString.startsWith("/")) {
      return directString;
    }
  }

  if (!isRecord(value) || seen.has(value)) {
    return null;
  }

  seen.add(value);

  const directCandidates = [
    value.logout_url,
    value.logoutUrl,
    isRecord(value.data) ? value.data.logout_url : null,
    isRecord(value.data) ? value.data.logoutUrl : null,
    isRecord(value.result) ? value.result.logout_url : null,
    isRecord(value.result) ? value.result.logoutUrl : null,
    isRecord(value.payload) ? value.payload.logout_url : null,
    isRecord(value.payload) ? value.payload.logoutUrl : null,
  ];

  for (const candidate of directCandidates) {
    const logoutUrl = readString(candidate);
    if (logoutUrl) {
      return logoutUrl;
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (!isRecord(nestedValue)) {
      continue;
    }

    const logoutUrl = extractLogoutUrl(nestedValue, seen);
    if (logoutUrl) {
      return logoutUrl;
    }
  }

  return null;
}

function parseLogoutResponse(value: unknown): LogoutResponse {
  return {
    logoutUrl: extractLogoutUrl(value),
    raw: value,
  };
}

function parsePasswordRequirementsResponse(value: unknown): PasswordRequirementsResponse | null {
  if (!isNonNullObject(value)) {
    return null;
  }

  return {
    message: typeof value.message === "string" ? value.message : null,
    data: "data" in value ? value.data : value,
    raw: value,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractFirstString(value: unknown, seen = new Set<object>()): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractFirstString(item, seen);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  if (!isNonNullObject(value) || seen.has(value)) {
    return null;
  }

  seen.add(value);

  const directKeys = ["name", "label", "title", "value", "text", "message", "slug", "roleSlug", "role_slug"];

  for (const key of directKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(value)) {
    const extracted = extractFirstString(nestedValue, seen);
    if (extracted) {
      return extracted;
    }
  }

  return null;
}

function extractRecordCandidates(value: unknown, seen = new Set<object>()): Record<string, unknown>[] {
  if (!isNonNullObject(value) || seen.has(value)) {
    return [];
  }

  seen.add(value);

  const records: Record<string, unknown>[] = [value];

  for (const nestedValue of Object.values(value)) {
    if (isNonNullObject(nestedValue)) {
      records.push(...extractRecordCandidates(nestedValue, seen));
    }
  }

  return records;
}

function extractArrayCandidates(value: unknown, seen = new Set<object>()): unknown[][] {
  const arrays: unknown[][] = [];

  if (Array.isArray(value)) {
    arrays.push(value);
  }

  if (!isNonNullObject(value) || seen.has(value)) {
    return arrays;
  }

  seen.add(value);

  for (const nestedValue of Object.values(value)) {
    arrays.push(...extractArrayCandidates(nestedValue, seen));
  }

  return arrays;
}

function readCandidateRecord(value: unknown): Record<string, unknown> | null {
  return isNonNullObject(value) ? value : null;
}

function getRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function extractTenantDetails(value: unknown): TenantDetails | null {
  const records = extractRecordCandidates(value);

  for (const record of records) {
    const name = extractFirstString(getRecordValue(record, ["tenantName", "organizationName", "organization_name", "name"]));
    const slug = extractFirstString(getRecordValue(record, ["tenantSlug", "tenant_slug", "slug", "workspaceUrl", "workspace_url"]));
    const industryType = extractFirstString(getRecordValue(record, ["industryType", "industry_type", "industry"]));
    const companySize = extractFirstString(getRecordValue(record, ["companySize", "company_size", "size"]));
    const country = extractFirstString(getRecordValue(record, ["country", "tenantCountry", "tenant_country"]));
    const plan = extractFirstString(getRecordValue(record, ["plan", "planName", "plan_name"]));
    const status = extractFirstString(getRecordValue(record, ["status", "tenantStatus", "tenant_status"]));

    if (name || slug || industryType || companySize || country || plan || status) {
      return {
        id: extractFirstString(getRecordValue(record, ["id", "tenantId", "tenant_id"])),
        name: name ?? "",
        slug: slug ?? "",
        industryType: industryType ?? "",
        companySize: companySize ?? "",
        country: country ?? "",
        plan: plan ?? "",
        status: status ?? "",
        raw: record,
      };
    }
  }

  return null;
}

function extractMemberRecord(value: unknown): TenantMember | null {
  if (!isNonNullObject(value)) {
    return null;
  }

  const membershipId = extractFirstString(getRecordValue(value, ["membership_id", "membershipId", "id", "membershipID"]));
  const fullName = extractFirstString(
    getRecordValue(value, ["full_name", "fullName", "name", "displayName", "display_name"]),
  );
  const email = extractFirstString(getRecordValue(value, ["email", "emailAddress", "email_address"]));
  const role = extractFirstString(getRecordValue(value, ["role", "role_slug", "roleSlug", "tenantRole", "tenant_role"]));
  const status = extractFirstString(getRecordValue(value, ["status", "membership_status", "membershipStatus"])) ?? "unknown";
  const joinedAt = extractFirstString(getRecordValue(value, ["joined_at", "joinedAt", "created_at", "createdAt", "dateJoined"]));
  const createdAt = extractFirstString(getRecordValue(value, ["created_at", "createdAt", "joined_at", "joinedAt"]));

  if (!membershipId || !fullName || !email || !role) {
    return null;
  }

  return {
    membershipId,
    fullName,
    email,
    role,
    status,
    joinedAt,
    createdAt,
    raw: value,
  };
}

function extractMembers(value: unknown): TenantMember[] {
  const arrays = extractArrayCandidates(value);

  for (const array of arrays) {
    const members = array.map(extractMemberRecord).filter((item): item is TenantMember => item !== null);
    if (members.length > 0) {
      return members;
    }
  }

  return [];
}

function extractMemberDetails(value: unknown): TenantMember | null {
  const records = extractRecordCandidates(value);

  for (const record of records) {
    const member = extractMemberRecord(record);
    if (member) {
      return member;
    }
  }

  return null;
}

function extractInviteRole(value: unknown): InviteRoleOption | null {
  if (!isNonNullObject(value)) {
    return null;
  }

  const slug = extractFirstString(getRecordValue(value, ["slug", "role_slug", "roleSlug", "id"]));
  const name = extractFirstString(getRecordValue(value, ["name", "label", "title", "roleName", "role_name"]));

  if (!slug && !name) {
    return null;
  }

  return {
    slug: slug ?? "",
    name: name ?? slug ?? "",
    description: normalizeOptionalString(getRecordValue(value, ["description", "details", "helpText"])),
    category: normalizeOptionalString(getRecordValue(value, ["category", "group", "type"])),
    raw: value,
  };
}

function extractInviteRoles(value: unknown): InviteRoleOption[] {
  const arrays = extractArrayCandidates(value);

  for (const array of arrays) {
    const roles = array.map(extractInviteRole).filter((item): item is InviteRoleOption => item !== null);
    if (roles.length > 0) {
      return roles;
    }
  }

  return [];
}

async function performAuthRequest(path: string, init: RequestInit) {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: new Headers(init.headers),
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : "Network error while completing request.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  return { response, text, json };
}

function isJsonContentType(contentType: string | null) {
  if (!contentType) {
    return false;
  }

  return contentType.toLowerCase().includes("application/json") || contentType.toLowerCase().includes("+json");
}

function logNonJsonResponse(context: string, response: Response, contentType: string | null, bodyText: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log(`[Auth service] ${context} returned non-JSON response`, {
    status: response.status,
    contentType: contentType ?? "unknown",
    preview: bodyText.slice(0, 120),
  });
}

async function readJsonApiResponse(context: string, response: Response) {
  const contentType = response.headers.get("content-type");
  const { text, json } = await readResponseBody(response);

  if (!isJsonContentType(contentType)) {
    logNonJsonResponse(context, response, contentType, text);
    throw new AuthServiceError("Tenant data could not be loaded.", "invalid_response", response.status);
  }

  return { text, json, contentType };
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function addFieldError(fieldErrors: Record<string, string[]>, field: string, message: string) {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return;
  }

  if (!fieldErrors[field]) {
    fieldErrors[field] = [];
  }

  if (!fieldErrors[field].includes(trimmedMessage)) {
    fieldErrors[field].push(trimmedMessage);
  }
}

function collectStringMessages(value: unknown, seen = new Set<object>()): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringMessages(item, seen));
  }

  if (!isNonNullObject(value) || seen.has(value)) {
    return [];
  }

  seen.add(value);

  const directKeys = ["message", "errorMessage", "detail", "error", "title"];
  const collected: string[] = [];

  for (const key of directKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      collected.push(candidate.trim());
    } else if (Array.isArray(candidate)) {
      collected.push(...collectStringMessages(candidate, seen));
    }
  }

  if (Array.isArray(value.errors) || isNonNullObject(value.errors)) {
    collected.push(...collectStringMessages(value.errors, seen));
  }

  if (Array.isArray(value.fieldErrors) || isNonNullObject(value.fieldErrors)) {
    collected.push(...collectStringMessages(value.fieldErrors, seen));
  }

  if (Array.isArray(value.validationErrors) || isNonNullObject(value.validationErrors)) {
    collected.push(...collectStringMessages(value.validationErrors, seen));
  }

  if (Array.isArray(value.validation_errors) || isNonNullObject(value.validation_errors)) {
    collected.push(...collectStringMessages(value.validation_errors, seen));
  }

  if (Array.isArray(value.data) || isNonNullObject(value.data)) {
    collected.push(...collectStringMessages(value.data, seen));
  }

  if (Array.isArray(value.payload) || isNonNullObject(value.payload)) {
    collected.push(...collectStringMessages(value.payload, seen));
  }

  if (Array.isArray(value.result) || isNonNullObject(value.result)) {
    collected.push(...collectStringMessages(value.result, seen));
  }

  return collected;
}

function collectFieldErrors(value: unknown, seen = new Set<object>()): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  if (!isNonNullObject(value) || seen.has(value)) {
    return fieldErrors;
  }

  seen.add(value);

  const genericContainerKeys = new Set([
    "errors",
    "fieldErrors",
    "field_errors",
    "validationErrors",
    "validation_errors",
  ]);

  for (const key of genericContainerKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (isNonNullObject(item)) {
          const field = readTrimmedString(item.field) ?? readTrimmedString(item.name) ?? null;
          const message =
            readTrimmedString(item.message) ??
            readTrimmedString(item.errorMessage) ??
            readTrimmedString(item.detail) ??
            collectStringMessages(item).join(", ");

          if (field && message) {
            addFieldError(fieldErrors, field, message);
          }
        } else if (typeof item === "string") {
          addFieldError(fieldErrors, "nonFieldError", item);
        } else if (Array.isArray(item)) {
          item.forEach((nestedItem) => {
            if (typeof nestedItem === "string") {
              addFieldError(fieldErrors, "nonFieldError", nestedItem);
            }
          });
        }
      });
    } else if (isNonNullObject(candidate)) {
      for (const [field, fieldValue] of Object.entries(candidate)) {
        if (typeof fieldValue === "string") {
          addFieldError(fieldErrors, field, fieldValue);
        } else if (Array.isArray(fieldValue)) {
          fieldValue.forEach((item) => {
            if (typeof item === "string") {
              addFieldError(fieldErrors, field, item);
            } else if (isNonNullObject(item)) {
              const message =
                readTrimmedString(item.message) ??
                readTrimmedString(item.errorMessage) ??
                readTrimmedString(item.detail) ??
                collectStringMessages(item).join(", ");
              if (message) {
                addFieldError(fieldErrors, field, message);
              }
            }
          });
        } else if (isNonNullObject(fieldValue)) {
          const message =
            readTrimmedString(fieldValue.message) ??
            readTrimmedString(fieldValue.errorMessage) ??
            readTrimmedString(fieldValue.detail) ??
            collectStringMessages(fieldValue).join(", ");
          if (message) {
            addFieldError(fieldErrors, field, message);
          }
        }
      }
    }
  }

  const ignoredKeys = new Set([
    ...genericContainerKeys,
    "message",
    "errorMessage",
    "detail",
    "error",
    "title",
    "status",
    "code",
    "success",
    "data",
    "payload",
    "result",
    "user",
    "tenant",
    "accountExists",
  ]);

  for (const [key, candidate] of Object.entries(value)) {
    if (ignoredKeys.has(key)) {
      continue;
    }

    if (typeof candidate === "string") {
      addFieldError(fieldErrors, key, candidate);
      continue;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (typeof item === "string") {
          addFieldError(fieldErrors, key, item);
        } else if (isNonNullObject(item)) {
          const message =
            readTrimmedString(item.message) ??
            readTrimmedString(item.errorMessage) ??
            readTrimmedString(item.detail) ??
            collectStringMessages(item).join(", ");
          if (message) {
            addFieldError(fieldErrors, key, message);
          }
        }
      });
      continue;
    }

    if (isNonNullObject(candidate)) {
      const message =
        readTrimmedString(candidate.message) ??
        readTrimmedString(candidate.errorMessage) ??
        readTrimmedString(candidate.detail) ??
        collectStringMessages(candidate).join(", ");
      if (message) {
        addFieldError(fieldErrors, key, message);
      }
    }
  }

  return fieldErrors;
}

function parseRegistrationError(
  response: Response,
  bodyText: string,
  bodyJson: unknown,
  defaultMessage: string,
): RegistrationApiError {
  const message = collectStringMessages(bodyJson).join(", ") || bodyText || defaultMessage;
  const fieldErrors = collectFieldErrors(bodyJson);

  const kind: RegistrationApiErrorKind =
    response.status === 409
      ? "conflict"
      : [400, 401, 403, 409, 422].includes(response.status)
        ? "validation_error"
        : "unknown";

  return new RegistrationApiError(message, kind, response.status, fieldErrors);
}

function parseRegistrationResponse<T>(
  value: unknown,
  validator: (value: unknown) => value is T,
): T | null {
  return validator(value) ? value : null;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  validator: (value: unknown) => value is T,
  defaultErrorMessage: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: new Headers(init.headers),
    });
  } catch (error) {
    throw new RegistrationApiError(
      error instanceof Error ? error.message : "Network error while completing request.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    throw parseRegistrationError(response, text, json ?? text, defaultErrorMessage);
  }

  const parsed = parseRegistrationResponse(json, validator);

  if (!parsed) {
    throw new RegistrationApiError(defaultErrorMessage, "invalid_response", response.status);
  }

  return parsed;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCreatedTenant(value: unknown): value is CreatedTenant {
  if (!isUnknownRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.plan === "string" &&
    typeof value.status === "string" &&
    typeof value.industryType === "string" &&
    typeof value.companySize === "string" &&
    typeof value.country === "string"
  );
}

function isRegisterOwnerAccountResponse(value: unknown): value is Omit<RegisterOwnerAccountResponse, "raw"> {
  if (!isUnknownRecord(value) || typeof value.message !== "string" || !isUnknownRecord(value.data)) {
    return false;
  }

  return (
    (value.data.user === null || isUnknownRecord(value.data.user)) &&
    typeof value.data.userId === "string" &&
    typeof value.data.accountExists === "boolean" &&
    (value.data.errorMessage === null || typeof value.data.errorMessage === "string")
  );
}

function isRegisterOrganizationResponse(value: unknown): value is Omit<RegisterOrganizationResponse, "raw"> {
  if (!isUnknownRecord(value) || typeof value.message !== "string" || !isUnknownRecord(value.data)) {
    return false;
  }

  return (
    (value.data.user === null || isUnknownRecord(value.data.user)) &&
    isCreatedTenant(value.data.tenant) &&
    typeof value.data.accountExists === "boolean"
  );
}

function isLooseMutationResponse(value: unknown): value is { message: string; data: unknown } {
  return isUnknownRecord(value) && typeof value.message === "string" && "data" in value;
}

export async function registerOwnerAccount(
  payload: RegisterOwnerAccountPayload,
): Promise<RegisterOwnerAccountResponse> {
  const response = await requestJson(
    "/api/v1/auth/register-owner-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    isLooseMutationResponse,
    "Invalid register-owner-account response.",
  );

  if (!isRegisterOwnerAccountResponse(response)) {
    throw new RegistrationApiError("Invalid register-owner-account response.", "invalid_response");
  }

  return {
    ...response,
    raw: response,
  };
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  const response = await requestJson(
    "/api/v1/auth/verify-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    isLooseMutationResponse,
    "Invalid verify-email response.",
  );

  return {
    message: response.message,
    data: response.data,
    raw: response,
  };
}

export async function resendVerification(
  payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> {
  const response = await requestJson(
    "/api/v1/auth/resend-verification",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    isLooseMutationResponse,
    "Invalid resend-verification response.",
  );

  return {
    message: response.message,
    data: response.data,
    raw: response,
  };
}

export async function registerOrganization(
  payload: RegisterOrganizationPayload,
): Promise<RegisterOrganizationResponse> {
  const response = await requestJson(
    "/api/v1/auth/register-organization",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    isLooseMutationResponse,
    "Invalid register-organization response.",
  );

  if (!isRegisterOrganizationResponse(response)) {
    throw new RegistrationApiError("Invalid register-organization response.", "invalid_response");
  }

  return {
    ...response,
    raw: response,
  };
}

function classifyAuthFailure(status: number, body: string): AuthErrorKind {
  const normalizedBody = body.toLowerCase();

  if ([400, 401, 403, 410].includes(status)) {
    if (
      normalizedBody.includes("expired") ||
      normalizedBody.includes("used") ||
      normalizedBody.includes("invalid") ||
      normalizedBody.includes("session")
    ) {
      return "expired_or_used_session_code";
    }

    return "expired_or_used_session_code";
  }

  return "unknown";
}

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return {
      text,
      json: null as unknown,
    };
  }

  try {
    return {
      text,
      json: JSON.parse(text) as unknown,
    };
  } catch {
    return {
      text,
      json: null as unknown,
    };
  }
}

export async function completeEnterpriseOwnerLogin(sessionCode: string): Promise<CompleteLoginResponse> {
  const searchParams = new URLSearchParams({
    sessionCode,
  });

  let response: Response;

  try {
    response = await fetch(`/api/v1/auth/complete-login?${searchParams.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionCode,
      }),
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : "Network error while completing sign-in.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new AuthServiceError(
      text || `Request failed with status ${response.status}`,
      classifyAuthFailure(response.status, text),
      response.status,
    );
  }

  const parsed = parseCompleteLoginResponse(json);

  if (!parsed) {
    throw new AuthServiceError("Invalid complete-login response.", "invalid_response", response.status);
  }

  return parsed;
}

export async function getSession(): Promise<SessionResponse> {
  let response: Response;

  try {
    response = await fetch("/api/v1/auth/session", {
      method: "GET",
      credentials: "include",
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : "Network error while restoring session.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new AuthServiceError(
      text || `Request failed with status ${response.status}`,
      "unknown",
      response.status,
    );
  }

  const parsed = parseSessionResponse(json ?? text);

  return parsed;
}

export async function getPasswordRequirements(): Promise<PasswordRequirementsResponse | null> {
  let response: Response;

  try {
    response = await fetch("/api/v1/auth/password-requirements", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return null;
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    return null;
  }

  return parsePasswordRequirementsResponse(json ?? text);
}

export async function logout(local = false): Promise<LogoutResponse> {
  const searchParams = new URLSearchParams({
    frontend_origin: window.location.origin,
    local: String(local),
  });

  let response: Response;

  try {
    response = await fetch(`/api/v1/auth/logout?${searchParams.toString()}`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : "Network error while logging out.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    throw new AuthServiceError(
      text || `Request failed with status ${response.status}`,
      "unknown",
      response.status,
    );
  }

  const parsed = parseLogoutResponse(json ?? text);

  return parsed;
}

export async function getTenantMe(): Promise<TenantMeResponse> {
  const { response, text, json } = await performAuthRequest("/api/v1/tenant/me", {
    method: "GET",
  });

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("tenant/me", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Tenant data could not be loaded.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  const tenant = extractTenantDetails(json ?? text);
  const message = isNonNullObject(json) && typeof json.message === "string" ? json.message : null;

  return {
    message,
    data: tenant,
    raw: json ?? text,
  };
}

export async function getTenantMembers(): Promise<TenantMembersResponse> {
  const { response, text, json } = await performAuthRequest("/api/v1/tenant/members", {
    method: "GET",
  });

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("tenant/members", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Tenant data could not be loaded.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  const members = extractMembers(json ?? text);
  const message = isNonNullObject(json) && typeof json.message === "string" ? json.message : null;

  return {
    message,
    data: members,
    raw: json ?? text,
  };
}

export async function getTenantMemberById(membershipId: string): Promise<{ message: string | null; data: TenantMember | null; raw: unknown }> {
  const { response, text, json } = await performAuthRequest(
    `/api/v1/tenant/members/${encodeURIComponent(membershipId)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("tenant/members/{membership_id}", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Tenant data could not be loaded.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  const member = extractMemberDetails(json ?? text);
  const message = isNonNullObject(json) && typeof json.message === "string" ? json.message : null;

  return {
    message,
    data: member,
    raw: json ?? text,
  };
}

export async function getInviteRoles(): Promise<InviteRolesResponse> {
  const { response, text, json } = await performAuthRequest("/api/v1/auth/invite/roles", {
    method: "GET",
  });

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("auth/invite/roles", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Invite roles could not be loaded.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  const roles = extractInviteRoles(json ?? text);
  const message = isNonNullObject(json) && typeof json.message === "string" ? json.message : null;

  return {
    message,
    data: roles,
    raw: json ?? text,
  };
}

export async function inviteMember(payload: {
  full_name: string;
  email: string;
  role_slug: string;
}): Promise<{ message: string | null; raw: unknown }> {
  const { response, text, json } = await performAuthRequest("/api/v1/auth/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("auth/invite", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Unable to send invite.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  return {
    message: isNonNullObject(json) && typeof json.message === "string" ? json.message : null,
    raw: json ?? text,
  };
}

export async function updateAuthProfile(payload: UpdateAuthProfilePayload): Promise<UpdateAuthProfileResponse> {
  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] profile update request", {
      url: "/api/v1/auth/me/profile",
      method: "PATCH",
      credentials: "include",
      fullName: payload.fullName,
    });
  }

  let response: Response;

  try {
    response = await fetch("/api/v1/auth/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : "Network error while updating profile.",
      "network_failure",
    );
  }

  const { text, json } = await readResponseBody(response);

  if (!response.ok) {
    if (!isJsonContentType(response.headers.get("content-type"))) {
      logNonJsonResponse("auth/me/profile", response, response.headers.get("content-type"), text);
      throw new AuthServiceError("Profile could not be updated.", "invalid_response", response.status);
    }

    throw new AuthServiceError(text || `Request failed with status ${response.status}`, "unknown", response.status);
  }

  const user = extractSessionUser(json ?? text);
  const message = isNonNullObject(json) && typeof json.message === "string" ? json.message : null;

  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] profile update response", {
      status: response.status,
      contentType: response.headers.get("content-type"),
      hasUser: Boolean(user),
      fullName: user?.fullName ?? null,
      matchesSubmittedFullName: user ? user.fullName === payload.fullName : false,
    });
  }

  return {
    message,
    data: user,
    raw: json ?? text,
  };
}

import { API_BASE_URL } from "@/lib/api";
import type {
  CreateEnterprisePayload,
  EnterpriseDto,
  UpdateEnterprisePayload,
} from "@/types/enterprise.types";

type EnterpriseListResponse = EnterpriseDto[] | { items?: EnterpriseDto[] };
type EnterpriseApiError = Error & {
  status?: number;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
};

function getEnterprisesApiBase(): string {
  return `${API_BASE_URL}/enterprises/`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toErrorMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => toErrorMessages(item));
  }

  if (isRecord(value)) {
    if ("detail" in value) {
      return toErrorMessages(value.detail);
    }

    if ("message" in value) {
      return toErrorMessages(value.message);
    }
  }

  return [];
}

function getFieldKeyFromLoc(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const segment = value[index];
    if (typeof segment === "string" && segment.trim()) {
      return segment.trim();
    }
  }

  return null;
}

function extractDetailItemError(value: unknown): { fieldKey: string; message: string } | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldKey = getFieldKeyFromLoc(value.loc);
  if (!fieldKey) {
    return null;
  }

  const reason =
    isRecord(value.ctx) && typeof value.ctx.reason === "string" ? value.ctx.reason.trim() : "";

  const message =
    reason ||
    (typeof value.msg === "string" ? value.msg.trim() : "") ||
    toErrorMessages(value.input)[0] ||
    "";

  if (!message) {
    return null;
  }

  return { fieldKey, message };
}

function extractFieldErrors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {};
  }

  const fieldErrors: Record<string, string[]> = {};

  if (Array.isArray(value.detail)) {
    for (const entry of value.detail) {
      const mapped = extractDetailItemError(entry);
      if (!mapped) {
        continue;
      }

      fieldErrors[mapped.fieldKey] = [...(fieldErrors[mapped.fieldKey] ?? []), mapped.message];
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "detail" || key === "message" || key === "errors" || key === "non_field_errors") {
      continue;
    }

    const messages = toErrorMessages(entry);
    if (messages.length > 0) {
      fieldErrors[key] = messages;
    }
  }

  if ("errors" in value) {
    const nested = extractFieldErrors(value.errors);
    Object.assign(fieldErrors, nested);
  }

  if ("non_field_errors" in value) {
    const messages = toErrorMessages(value.non_field_errors);
    if (messages.length > 0) {
      fieldErrors.non_field_errors = messages;
    }
  }

  return fieldErrors;
}

async function readErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function throwEnterpriseApiError(response: Response): Promise<never> {
  const fallback = `${response.status} ${response.statusText}`.trim();
  const body = await readErrorBody(response).catch(() => null);
  const fieldErrors = extractFieldErrors(body);

  const messageFromBody =
    typeof body === "string"
      ? body.trim()
      : isRecord(body) && typeof body.detail === "string"
        ? body.detail.trim()
        : isRecord(body) && typeof body.message === "string"
          ? body.message.trim()
          : "";

  const error = new Error(
    messageFromBody || (Object.keys(fieldErrors).length > 0 ? "Please review the highlighted field(s)." : fallback),
  ) as EnterpriseApiError;

  error.status = response.status;
  error.details = body;
  if (Object.keys(fieldErrors).length > 0) {
    error.fieldErrors = fieldErrors;
  }

  throw error;
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
    await throwEnterpriseApiError(response);
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

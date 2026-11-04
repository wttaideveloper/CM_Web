import type { CommerceJsonValue } from "./common.types";

/** HTTP error that preserves the backend status without exposing response headers or credentials. */
export class CommerceApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "CommerceApiError";
  }
}

function safeErrorMessage(status: number): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have access to this Commerce data.";
  if (status === 404) return "The requested Commerce resource was not found.";
  if (status === 422) return "The Commerce request was invalid.";
  if (status >= 500) return "Commerce data is temporarily unavailable.";
  return "Unable to load Commerce data.";
}

function readString(value: CommerceJsonValue | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as CommerceJsonValue | null;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as { detail?: CommerceJsonValue; message?: CommerceJsonValue; title?: CommerceJsonValue };
    return readString(record.detail) ?? readString(record.message) ?? readString(record.title) ?? safeErrorMessage(response.status);
  }
  return safeErrorMessage(response.status);
}

/** Converts a Commerce response into typed JSON or a status-preserving API error. */
export async function readCommerceResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new CommerceApiError(response.status, await readErrorMessage(response));

  try {
    return await response.json() as T;
  } catch {
    throw new CommerceApiError(502, "The Commerce service returned invalid JSON.");
  }
}

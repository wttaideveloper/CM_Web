import type { JsonObject, JsonValue, WorkflowApiDebugEntry, WorkflowListResponse, WorkflowResourceResponse } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: JsonObject;
};

const sensitiveKeyPattern = /authorization|cookie|token|session.?code|password/i;
let latestDebugEntry: WorkflowApiDebugEntry | null = null;
const debugListeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSafeJson(value: unknown): JsonValue | null {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toSafeJson).filter((item): item is JsonValue => item !== null);
  }

  if (!isRecord(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, sensitiveKeyPattern.test(key) ? "[REDACTED]" : toSafeJson(nestedValue)]),
  ) as JsonObject;
}

function captureDebug(entry: WorkflowApiDebugEntry) {
  latestDebugEntry = entry;
  debugListeners.forEach((listener) => listener());
}

function parseResponseBody(responseText: string): JsonValue | null {
  if (!responseText) {
    return null;
  }

  try {
    return toSafeJson(JSON.parse(responseText));
  } catch {
    return responseText;
  }
}

/** Returns the latest safe Workflow API diagnostic entry. */
export function getLatestWorkflowApiDebugEntry(): WorkflowApiDebugEntry | null {
  return latestDebugEntry;
}

/** Subscribes to safe Workflow API diagnostic updates. */
export function subscribeToWorkflowApiDebug(listener: () => void): () => void {
  debugListeners.add(listener);
  return () => debugListeners.delete(listener);
}

/** Error returned when a Workflow API request does not complete successfully. */
export class WorkflowApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkflowApiError";
    this.status = status;
  }
}

/** Executes a frontend-relative Workflow API request using the browser's cookie session. */
export async function requestWorkflowApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const requestUrl = new URL(path, window.location.origin);
  const endpoint = `${requestUrl.pathname}${requestUrl.search}`;
  const timestamp = new Date().toISOString();
  const response = await fetch(endpoint, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const responseText = await response.text();
  const responseBody = parseResponseBody(responseText);
  const query = Object.fromEntries(requestUrl.searchParams.entries());

  captureDebug({
    method,
    endpoint: requestUrl.pathname,
    query,
    requestBody: options.body ?? null,
    status: response.status,
    response: response.ok ? responseBody : null,
    error: response.ok ? null : responseBody,
    timestamp,
  });

  if (!response.ok) {
    const detail = isRecord(responseBody) && typeof responseBody.detail === "string" ? responseBody.detail : null;
    throw new WorkflowApiError(detail ?? `Workflow API request failed (HTTP ${response.status}).`, response.status);
  }

  return responseBody as T;
}

/** Parses a documented single-resource API envelope. */
export function parseWorkflowResource<T>(payload: unknown, validate: (value: unknown) => value is T): WorkflowResourceResponse<T> {
  if (!isRecord(payload) || typeof payload.message !== "string" || !validate(payload.data)) {
    throw new Error("Workflow API returned an invalid resource response.");
  }

  return { message: payload.message, data: payload.data };
}

/** Parses a documented list API envelope. */
export function parseWorkflowList<T>(payload: unknown, validate: (value: unknown) => value is T): WorkflowListResponse<T> {
  if (
    !isRecord(payload) ||
    typeof payload.message !== "string" ||
    typeof payload.total !== "number" ||
    !Array.isArray(payload.data) ||
    !payload.data.every(validate)
  ) {
    throw new Error("Workflow API returned an invalid collection response.");
  }

  return { message: payload.message, data: payload.data, total: payload.total };
}

/** Returns whether a value is a plain JSON object. */
export function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

import { authenticatedFetch, refreshAuthSessionSingleFlight } from "@ihp/auth";

import { isEventMediaField, parseEventMediaPolicy, type EventMediaAsset, type EventMediaField, type EventMediaPolicy } from "./event-media";

const policyPath = "/api/v1/events/media/policy";
const uploadPath = "/api/v1/events/media/";

export class EventMediaApiError extends Error {
  constructor(readonly status: number, message: string, readonly fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "EventMediaApiError";
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to upload Event media.";
  if (status === 413) return "This file is larger than the server allows.";
  if (status === 415) return "This file type is not supported for this Event field.";
  if (status === 422) return "The Event media could not be accepted.";
  if (status === 409) return "This uploaded media is already attached to an Event.";
  return "Unable to process Event media.";
}

function parseApiError(status: number, body: unknown): EventMediaApiError {
  const fieldErrors: Record<string, string[]> = {};
  let message = errorMessage(status);
  if (isRecord(body)) {
    if (typeof body.message === "string") message = body.message;
    if (typeof body.detail === "string") message = body.detail;
    if (Array.isArray(body.detail)) {
      for (const item of body.detail) {
        if (!isRecord(item) || !Array.isArray(item.loc) || typeof item.msg !== "string") continue;
        const field = item.loc.find((part): part is string => typeof part === "string" && part !== "body") ?? "media";
        fieldErrors[field] = [...(fieldErrors[field] ?? []), item.msg];
      }
    }
    if (isRecord(body.errors)) for (const [field, value] of Object.entries(body.errors)) {
      const messages = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : typeof value === "string" ? [value] : [];
      if (messages.length) fieldErrors[field] = [...(fieldErrors[field] ?? []), ...messages];
    }
  }
  return new EventMediaApiError(status, message, fieldErrors);
}

async function readBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function getEventMediaPolicy(): Promise<EventMediaPolicy> {
  const response = await authenticatedFetch(policyPath, { cache: "no-store" });
  if (!response.ok) throw parseApiError(response.status, await readBody(response));
  return parseEventMediaPolicy(await readBody(response));
}

export async function deleteEventMediaAsset(id: string): Promise<void> {
  const response = await authenticatedFetch(`/api/v1/events/media/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw parseApiError(response.status, await readBody(response));
}

/** Uploads through the same-origin cookie-authenticated path so progress is observable. */
export function uploadEventMedia(
  file: File,
  field: EventMediaField,
  clientRef: string,
  enterpriseId: string | undefined,
  onProgress: (progress: number) => void,
): Promise<EventMediaAsset> {
  return new Promise((resolve, reject) => {
    let retriedAfterRefresh = false;
    const send = () => {
      const request = new XMLHttpRequest();
      request.open("POST", uploadPath, true);
      request.withCredentials = true;
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      };
      request.onerror = () => reject(new EventMediaApiError(0, "The upload could not reach the Event media service."));
      request.onload = () => {
        let body: unknown = null;
        try { body = request.responseText ? JSON.parse(request.responseText) as unknown : null; } catch { /* handled by status error */ }
        if (request.status === 401 && !retriedAfterRefresh) {
          retriedAfterRefresh = true;
          void refreshAuthSessionSingleFlight().then(send).catch(() => reject(parseApiError(401, body)));
          return;
        }
        if (request.status < 200 || request.status >= 300) {
          reject(parseApiError(request.status, body));
          return;
        }
        if (!isRecord(body) || typeof body.id !== "string" || typeof body.field !== "string" || !isEventMediaField(body.field) || typeof body.url !== "string" || typeof body.name !== "string" || typeof body.size !== "number" || typeof body.type !== "string" || typeof body.attached !== "boolean") {
          reject(new EventMediaApiError(request.status, "The Event media service returned an invalid upload asset."));
          return;
        }
        resolve({ id: body.id, field: body.field as EventMediaField, url: body.url, name: body.name, size: body.size, type: body.type, attached: body.attached, expires_at: typeof body.expires_at === "string" ? body.expires_at : null });
      };
      const data = new FormData();
      data.append("file", file);
      data.append("field", field);
      data.append("client_ref", clientRef);
      if (enterpriseId) data.append("enterprise_id", enterpriseId);
      request.send(data);
    };
    send();
  });
}

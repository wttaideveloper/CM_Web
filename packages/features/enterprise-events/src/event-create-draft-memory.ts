import type { CreateEventFormValues } from "./create-event-form";
import type { EventCurrencySource } from "./event-currency";
import type { EventMediaUploadState } from "./event-media";
import type { SessionGenerationRule } from "./SessionTableEditor";

/** Local form values retained for navigation recovery during the current app session. */
export interface EventCreateDraft {
  activeStep: number;
  values: CreateEventFormValues;
  currencySourcePreference: EventCurrencySource | null;
  sessionGenerationRules: SessionGenerationRule[];
  customValues: Record<string, string | string[] | boolean | number | null>;
  mediaUploads: EventMediaUploadState[];
}

const eventCreateDrafts = new Map<string, EventCreateDraft>();

/** Returns a tenant-scoped key for the current Enterprise Admin's unfinished event form. */
export function eventCreateDraftKey(tenantId?: string | null, enterpriseId?: string | null): string | null {
  if (!tenantId?.trim() || !enterpriseId?.trim()) return null;
  return `${tenantId.trim()}:${enterpriseId.trim()}`;
}

/** Reads a copy of a draft and marks any interrupted upload for retry. */
export function getEventCreateDraft(key: string): EventCreateDraft | null {
  const draft = eventCreateDrafts.get(key);
  if (!draft) return null;
  const restored = structuredClone(draft);
  restored.mediaUploads = restored.mediaUploads.map((upload) => upload.status === "uploading"
    ? { ...upload, status: "error", error: "Upload interrupted while you were away. Retry this upload." }
    : upload);
  return restored;
}

/** Keeps an unfinished event form available while navigating within the current app session. */
export function saveEventCreateDraft(key: string, draft: EventCreateDraft): void {
  eventCreateDrafts.set(key, structuredClone(draft));
}

/** Removes the in-memory event draft after a successful create or explicit reset. */
export function clearEventCreateDraft(key: string): void {
  eventCreateDrafts.delete(key);
}

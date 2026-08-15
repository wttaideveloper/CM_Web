import { isJsonObject, parseWorkflowResource, requestWorkflowApi } from "./client";
import type { MediaUploadCompleteInput, MediaUploadInit, MediaUploadInitInput, WorkflowMedia, WorkflowMediaAccessUrl, WorkflowResourceResponse } from "./types";

const MEDIA_PATH = "/api/v1/media";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isJsonObject(value) && Object.values(value).every(isString);
}

function isMediaUploadInit(value: unknown): value is MediaUploadInit {
  return isJsonObject(value) && isString(value.mediaId) && isString(value.storageKey) && isString(value.uploadUrl) && isString(value.uploadMethod) && isStringRecord(value.uploadHeaders) && isNumber(value.expiresIn) && isNumber(value.maxUploadBytes) && isString(value.kind) && isString(value.purpose) && isString(value.contentType);
}

function isWorkflowMedia(value: unknown): value is WorkflowMedia {
  return isJsonObject(value) && isString(value.mediaId) && isString(value.storageKey) && isString(value.mediaUrl) && isString(value.contentType) && isNumber(value.sizeBytes) && isString(value.kind) && isString(value.purpose) && (value.accessUrl === undefined || value.accessUrl === null || isString(value.accessUrl));
}

function isMediaAccessUrl(value: unknown): value is WorkflowMediaAccessUrl {
  return isJsonObject(value) && isString(value.storageKey) && isString(value.accessUrl) && isNumber(value.expiresIn);
}

/** Requests presigned upload instructions for a form or answer media file. */
export async function initWorkflowMediaUpload(input: MediaUploadInitInput): Promise<WorkflowResourceResponse<MediaUploadInit>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${MEDIA_PATH}/upload/init`, { method: "POST", body: input }), isMediaUploadInit);
}

/** Uploads raw media directly to its server-provided presigned URL without browser authentication headers. */
export async function uploadWorkflowMediaFile(file: File, init: MediaUploadInit): Promise<void> {
  const response = await fetch(init.uploadUrl, {
    method: init.uploadMethod,
    headers: init.uploadHeaders,
    body: file,
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Media upload failed (HTTP ${response.status}).`);
  }
}

/** Completes a presigned media upload so the backend can persist the media record. */
export async function completeWorkflowMediaUpload(input: MediaUploadCompleteInput): Promise<WorkflowResourceResponse<WorkflowMedia>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${MEDIA_PATH}/upload/complete`, { method: "POST", body: input }), isWorkflowMedia);
}

/** Retrieves a short-lived private-media preview URL. */
export async function getWorkflowMediaAccessUrl(storageKey: string, mediaId?: string): Promise<WorkflowResourceResponse<WorkflowMediaAccessUrl>> {
  const query = new URLSearchParams({ storageKey });
  if (mediaId) query.set("mediaId", mediaId);
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${MEDIA_PATH}/access-url?${query.toString()}`), isMediaAccessUrl);
}

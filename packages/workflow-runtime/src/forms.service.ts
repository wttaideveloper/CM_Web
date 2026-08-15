import { isJsonObject, parseWorkflowList, parseWorkflowResource, requestWorkflowApi } from "./client";
import type { CreateWorkflowFormInput, UpdateWorkflowFormInput, WorkflowForm, WorkflowFormVersion, WorkflowFormVersionSummary, WorkflowListResponse, WorkflowResourceResponse } from "./types";

const FORMS_PATH = "/api/v1/forms";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isWorkflowForm(value: unknown): value is WorkflowForm {
  return isJsonObject(value) && isString(value.id) && isString(value.name) && isNullableString(value.description) && isNumber(value.version) && isBoolean(value.isPublished) && isJsonObject(value.definition) && isNumber(value.fieldCount) && isString(value.createdBy) && isString(value.createdAt) && isString(value.updatedAt);
}

function isWorkflowFormVersionSummary(value: unknown): value is WorkflowFormVersionSummary {
  return isJsonObject(value) && isString(value.id) && isString(value.formId) && isNumber(value.version) && isString(value.name) && isNullableString(value.description) && isNumber(value.fieldCount) && isString(value.publishedBy) && isString(value.publishedAt);
}

function isWorkflowFormVersion(value: unknown): value is WorkflowFormVersion {
  return isWorkflowFormVersionSummary(value) && isJsonObject((value as Record<string, unknown>).definition);
}

/** Lists forms, optionally using the backend-authoritative published and picker filters. */
export async function listWorkflowForms(filters?: { publishedOnly?: boolean; forPicker?: boolean }): Promise<WorkflowListResponse<WorkflowForm>> {
  const query = new URLSearchParams();
  if (filters?.publishedOnly) query.set("published_only", "true");
  if (filters?.forPicker) query.set("for_picker", "true");
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return parseWorkflowList(await requestWorkflowApi<unknown>(`${FORMS_PATH}${suffix}`), isWorkflowForm);
}

/** Loads one reusable form. */
export async function getWorkflowForm(formId: string): Promise<WorkflowResourceResponse<WorkflowForm>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}`), isWorkflowForm);
}

/** Creates a reusable form without generating any definition schema client-side. */
export async function createWorkflowForm(input: CreateWorkflowFormInput): Promise<WorkflowResourceResponse<WorkflowForm>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(FORMS_PATH, { method: "POST", body: { name: input.name, description: input.description ?? null, definition: input.definition ?? {} } }), isWorkflowForm);
}

/** Updates the provided editable form fields. */
export async function updateWorkflowForm(formId: string, input: UpdateWorkflowFormInput): Promise<WorkflowResourceResponse<WorkflowForm>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}`, { method: "PATCH", body: input }), isWorkflowForm);
}

/** Publishes a form after explicit user confirmation. */
export async function publishWorkflowForm(formId: string): Promise<WorkflowResourceResponse<WorkflowForm>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}/publish`, { method: "PATCH" }), isWorkflowForm);
}

/** Soft-deletes a form after explicit user confirmation. */
export async function deleteWorkflowForm(formId: string): Promise<void> {
  await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}`, { method: "DELETE" });
}

/** Lists read-only published form snapshots. */
export async function listWorkflowFormVersions(formId: string): Promise<WorkflowListResponse<WorkflowFormVersionSummary>> {
  return parseWorkflowList(await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}/versions`), isWorkflowFormVersionSummary);
}

/** Loads one read-only published form snapshot. */
export async function getWorkflowFormVersion(formId: string, version: number): Promise<WorkflowResourceResponse<WorkflowFormVersion>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${FORMS_PATH}/${encodeURIComponent(formId)}/versions/${version}`), isWorkflowFormVersion);
}

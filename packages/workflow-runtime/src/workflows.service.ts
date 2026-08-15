import { isJsonObject, parseWorkflowList, parseWorkflowResource, requestWorkflowApi } from "./client";
import type { CreateWorkflowInput, UpdateWorkflowInput, Workflow, WorkflowAnswer, WorkflowJourney, WorkflowJourneyField, WorkflowJourneyPage, WorkflowListResponse, WorkflowResourceResponse, WorkflowResponse, WorkflowVersion, WorkflowVersionSummary } from "./types";

const WORKFLOWS_PATH = "/api/v1/workflows";

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

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isJsonObject(value) && Object.values(value).every(isNumber);
}

function isWorkflow(value: unknown): value is Workflow {
  return isJsonObject(value) && isString(value.id) && isString(value.name) && isNullableString(value.description) && isNumber(value.version) && isBoolean(value.isPublished) && isJsonObject(value.flowDefinition) && isNumber(value.stepCount) && isNumber(value.questionCount) && isString(value.updatedAt);
}

function isWorkflowVersionSummary(value: unknown): value is WorkflowVersionSummary {
  return isJsonObject(value) && isString(value.id) && isString(value.workflowId) && isNumber(value.version) && isString(value.name) && isNullableString(value.description) && isNumber(value.nodeCount) && isNumberRecord(value.linkedFormVersions) && isString(value.publishedBy) && isString(value.publishedAt);
}

function isWorkflowVersion(value: unknown): value is WorkflowVersion {
  return isWorkflowVersionSummary(value) && isJsonObject((value as Record<string, unknown>).flowDefinition);
}

function isWorkflowResponse(value: unknown): value is WorkflowResponse {
  return isJsonObject(value) && isString(value.sessionId) && isString(value.workflowId) && isString(value.userId) && isNullableString(value.userEmail) && isNullableString(value.userFullName) && isNullableString(value.tenantRole) && isString(value.status) && isNumber(value.answerCount) && isNullableString(value.startedAt) && isNullableString(value.completedAt);
}

function isWorkflowAnswer(value: unknown): value is WorkflowAnswer {
  return isJsonObject(value) && isString(value.id) && isString(value.userId) && isString(value.sessionId) && isString(value.workflowId) && isString(value.sessionStatus) && isString(value.questionId) && isString(value.nodeId) && isNullableString(value.answerText) && (value.answerValues === null || isJsonObject(value.answerValues)) && isString(value.answeredAt) && isNullableString(value.questionText) && isNullableString(value.questionType) && isNullableString(value.userEmail) && isNullableString(value.userFullName) && isNullableString(value.tenantRole);
}

function isJourneyField(value: unknown): value is WorkflowJourneyField {
  return isJsonObject(value) && isNullableString(value.id) && isNullableString(value.questionId) && isNullableString(value.nodeId) && isString(value.label) && isNullableString(value.questionType) && isNullableString(value.answerText) && (value.answerValues === null || isJsonObject(value.answerValues));
}

function isJourneyPage(value: unknown): value is WorkflowJourneyPage {
  return isJsonObject(value) && isNumber(value.pageNumber) && isString(value.nodeId) && isString(value.title) && Array.isArray(value.fields) && value.fields.every(isJourneyField);
}

function isWorkflowJourney(value: unknown): value is WorkflowJourney {
  return isJsonObject(value) && isString(value.sessionId) && isString(value.templateId) && isString(value.status) && isString(value.userId) && isNullableString(value.userEmail) && isNullableString(value.userFullName) && isNullableString(value.tenantRole) && isNullableString(value.startedAt) && isNullableString(value.completedAt) && isString(value.workflowId) && Array.isArray(value.pages) && value.pages.every(isJourneyPage) && Array.isArray(value.additionalResponses) && value.additionalResponses.every(isJourneyField);
}

/** Lists workflows available to the authenticated tenant. */
export async function listWorkflows(): Promise<WorkflowListResponse<Workflow>> {
  return parseWorkflowList(await requestWorkflowApi<unknown>(WORKFLOWS_PATH), isWorkflow);
}

/** Loads one workflow. */
export async function getWorkflow(workflowId: string): Promise<WorkflowResourceResponse<Workflow>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`), isWorkflow);
}

/** Creates a workflow with its API-defined generic JSON flow definition. */
export async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowResourceResponse<Workflow>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(WORKFLOWS_PATH, { method: "POST", body: { name: input.name, description: input.description ?? null, flowDefinition: input.flowDefinition ?? {} } }), isWorkflow);
}

/** Updates the supplied workflow fields. */
export async function updateWorkflow(workflowId: string, input: UpdateWorkflowInput): Promise<WorkflowResourceResponse<Workflow>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`, { method: "PATCH", body: input }), isWorkflow);
}

/** Publishes a workflow after explicit user confirmation. */
export async function publishWorkflow(workflowId: string, input?: UpdateWorkflowInput): Promise<WorkflowResourceResponse<Workflow>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}/publish`, { method: "PATCH", body: input }), isWorkflow);
}

/** Soft-deletes a workflow after explicit user confirmation. */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}`, { method: "DELETE" });
}

/** Lists read-only published workflow snapshots. */
export async function listWorkflowVersions(workflowId: string): Promise<WorkflowListResponse<WorkflowVersionSummary>> {
  return parseWorkflowList(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}/versions`), isWorkflowVersionSummary);
}

/** Loads one read-only workflow snapshot. */
export async function getWorkflowVersion(workflowId: string, version: number): Promise<WorkflowResourceResponse<WorkflowVersion>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}/versions/${version}`), isWorkflowVersion);
}

/** Lists current response sessions for a workflow and optional backend status filter. */
export async function listWorkflowResponses(workflowId: string, status?: "completed" | "in_progress"): Promise<WorkflowListResponse<WorkflowResponse>> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return parseWorkflowList(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}/responses${suffix}`), isWorkflowResponse);
}

/** Loads the grouped pages and answer fields for one workflow session. */
export async function getWorkflowJourney(sessionId: string): Promise<WorkflowResourceResponse<WorkflowJourney>> {
  return parseWorkflowResource(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/sessions/${encodeURIComponent(sessionId)}/journey`), isWorkflowJourney);
}

/** Lists answers for a workflow, optionally scoped to one session using the documented sessionId parameter. */
export async function listWorkflowAnswers(workflowId: string, sessionId?: string): Promise<WorkflowListResponse<WorkflowAnswer>> {
  const suffix = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return parseWorkflowList(await requestWorkflowApi<unknown>(`${WORKFLOWS_PATH}/${encodeURIComponent(workflowId)}/answers${suffix}`), isWorkflowAnswer);
}

/** JSON values accepted by the generic Forms and Workflows definition contracts. */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

/** A JSON object accepted by the generic Forms and Workflows definition contracts. */
export type JsonObject = { [key: string]: JsonValue };

/** Standard Workflow API resource envelope. */
export type WorkflowResourceResponse<T> = {
  message: string;
  data: T;
};

/** Standard Workflow API list envelope. */
export type WorkflowListResponse<T> = {
  message: string;
  data: T[];
  total: number;
};

/** A reusable form returned by the Workflow API. */
export type WorkflowForm = {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  deletedAt?: string | null;
  definition: JsonObject;
  fieldCount: number;
  workflowsSynced?: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Request body accepted when creating a reusable form. */
export type CreateWorkflowFormInput = {
  name: string;
  description?: string | null;
  definition?: JsonObject;
};

/** Request body accepted when updating a reusable form. */
export type UpdateWorkflowFormInput = {
  name?: string | null;
  description?: string | null;
  definition?: JsonObject | null;
};

/** Read-only summary of a published form snapshot. */
export type WorkflowFormVersionSummary = {
  id: string;
  formId: string;
  version: number;
  name: string;
  description: string | null;
  fieldCount: number;
  publishedBy: string;
  publishedAt: string;
};

/** Read-only detail of a published form snapshot. */
export type WorkflowFormVersion = WorkflowFormVersionSummary & {
  definition: JsonObject;
};

/** A reusable workflow returned by the Workflow API. */
export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  deletedAt?: string | null;
  flowDefinition: JsonObject;
  formJson?: JsonObject | null;
  stepCount: number;
  questionCount: number;
  userSessionStatus?: string | null;
  userSessionId?: string | null;
  updatedAt: string;
};

/** Request body accepted when creating a workflow. */
export type CreateWorkflowInput = {
  name: string;
  description?: string | null;
  flowDefinition?: JsonObject;
};

/** Request body accepted when updating or publishing a workflow. */
export type UpdateWorkflowInput = {
  name?: string | null;
  description?: string | null;
  flowDefinition?: JsonObject | null;
};

/** Read-only summary of a published workflow snapshot. */
export type WorkflowVersionSummary = {
  id: string;
  workflowId: string;
  version: number;
  name: string;
  description: string | null;
  nodeCount: number;
  linkedFormVersions: Record<string, number>;
  publishedBy: string;
  publishedAt: string;
};

/** Read-only detail of a published workflow snapshot. */
export type WorkflowVersion = WorkflowVersionSummary & {
  flowDefinition: JsonObject;
};

/** One current workflow response row. */
export type WorkflowResponse = {
  sessionId: string;
  workflowId: string;
  userId: string;
  userEmail: string | null;
  userFullName: string | null;
  tenantRole: string | null;
  status: string;
  answerCount: number;
  startedAt: string | null;
  completedAt: string | null;
};

/** One workflow-wide answer row. */
export type WorkflowAnswer = {
  id: string;
  userId: string;
  sessionId: string;
  workflowId: string;
  sessionStatus: string;
  questionId: string;
  nodeId: string;
  answerText: string | null;
  answerValues: JsonObject | null;
  answeredAt: string;
  questionText: string | null;
  questionType: string | null;
  userEmail: string | null;
  userFullName: string | null;
  tenantRole: string | null;
};

/** A field and answer shown in a workflow session journey. */
export type WorkflowJourneyField = {
  id: string | null;
  questionId: string | null;
  nodeId: string | null;
  label: string;
  questionType: string | null;
  answerText: string | null;
  answerValues: JsonObject | null;
};

/** A page or step in a workflow session journey. */
export type WorkflowJourneyPage = {
  pageNumber: number;
  nodeId: string;
  title: string;
  fields: WorkflowJourneyField[];
};

/** A complete workflow session journey for inspection. */
export type WorkflowJourney = {
  sessionId: string;
  templateId: string;
  status: string;
  userId: string;
  userEmail: string | null;
  userFullName: string | null;
  tenantRole: string | null;
  startedAt: string | null;
  completedAt: string | null;
  workflowId: string;
  pages: WorkflowJourneyPage[];
  additionalResponses: WorkflowJourneyField[];
};

/** Request body for a presigned media upload. */
export type MediaUploadInitInput = {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  kind?: "audio" | "video" | "photo" | "signature" | "file";
  purpose?: "form" | "answer";
};

/** Presigned upload instructions returned by the Workflow API. */
export type MediaUploadInit = {
  mediaId: string;
  storageKey: string;
  uploadUrl: string;
  uploadMethod: string;
  uploadHeaders: Record<string, string>;
  expiresIn: number;
  maxUploadBytes: number;
  kind: string;
  purpose: string;
  contentType: string;
};

/** Request body that completes a presigned media upload. */
export type MediaUploadCompleteInput = {
  mediaId: string;
  storageKey: string;
  fileName?: string | null;
  contentType?: string | null;
  kind?: string;
  purpose?: string;
};

/** Persisted media returned after completing an upload. */
export type WorkflowMedia = {
  mediaId: string;
  storageKey: string;
  mediaUrl: string;
  contentType: string;
  sizeBytes: number;
  kind: string;
  purpose: string;
  accessUrl?: string | null;
};

/** Short-lived private-media URL. */
export type WorkflowMediaAccessUrl = {
  storageKey: string;
  accessUrl: string;
  expiresIn: number;
};

/** Sanitized diagnostic information for the most recent Workflow API request. */
export type WorkflowApiDebugEntry = {
  method: string;
  endpoint: string;
  query: Record<string, string>;
  requestBody: JsonValue | null;
  status: number | null;
  response: JsonValue | null;
  error: JsonValue | null;
  timestamp: string;
};

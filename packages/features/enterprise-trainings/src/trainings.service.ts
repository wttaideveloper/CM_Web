/**
 * Typed contracts + API client for the Trainings domain.
 *
 * Mirrors the OpenAPI spec at https://chat.wisdomtooth.tech/api/docs
 * (Classifieds Marketplace Platform API — /api/v1/trainings).
 * Types and runtime validation live next to the fetch calls, matching the
 * enterprise-events module convention (single self-contained service file).
 */

import type { TrainingStatus, TrainingStatusUpdatePayload } from "./training-status";

/** Pagination metadata returned with every list response. */
export interface TrainingPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Lightweight training row returned in paginated lists. */
export interface TrainingListItem {
  id: string;
  tenant_id: string | null;
  enterprise_id: string;
  location_id: string | null;
  primary_image?: string | null;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  tags: unknown[] | null;
  instructor_id: string | null;
  delivery_mode: string | null;
  course_type: string | null;
  capacity: string | null;
  price: string | null;
  currency: string | null;
  status: TrainingStatus;
  is_deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  start_date?: string | null;
  sections: unknown[] | null;
  assessments: unknown[] | null;
}

/** Full training detail — same as list item plus `enterprise_name`. */
export interface TrainingDetail extends TrainingListItem {
  enterprise_name: string | null;
  promotional_video?: string | null;
  gallery_images?: string[] | null;
}

/** `TrainingResponse` (create/update return) — alias of detail without enterprise_name. */
export type Training = TrainingDetail;

/** Paginated list response. */
export interface TrainingPaginatedResponse {
  items: TrainingListItem[];
  pagination: TrainingPagination;
}

/** Supported query parameters for `GET /api/v1/trainings/`. */
export interface TrainingListParams {
  search?: string;
  category?: string;
  provider?: string;
  tenant_id?: string;
  enterprise_id?: string;
  location_id?: string;
  status?: string;
  delivery_mode?: string;
  min_price?: string;
  max_price?: string;
  duration?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/** Search endpoint params (`GET /api/v1/search/trainings`). */
export interface TrainingSearchParams {
  query?: string;
  tenant_id?: string;
  enterprise_id?: string;
  category?: string;
  page?: number;
  page_size?: number;
}

/** Payload for `POST /api/v1/trainings/`. */
export interface CreateTrainingPayload {
  tenant_id?: string | null;
  enterprise_id: string;
  location_id?: string | null;
  title: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  tags?: string[] | null;
  instructor_id?: string | null;
  requirements?: string | null;
  primary_image?: string | null;
  gallery_images?: unknown[] | null;
  promotional_video?: string | null;
  documents?: unknown[] | null;
  delivery_mode?: string | null;
  course_type?: string | null;
  duration?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  enrolment_start?: string | null;
  enrolment_end?: string | null;
  time_zone?: string | null;
  capacity?: string | null;
  price?: string | null;
  currency?: string | null;
  promo_price?: string | null;
  coupon_code?: string | null;
  requires_approval?: boolean;
  access_duration_days?: string | null;
  status?: string;
  form_configuration_version_id?: string | null;
  custom_values?: Record<string, unknown> | null;
}

/** Payload for `PUT /api/v1/trainings/{id}` — all fields optional partial. */
export type UpdateTrainingPayload = Partial<CreateTrainingPayload>;

/** Payload for `PATCH /api/v1/trainings/{id}/status`. */
// ---- Sections / Lessons ----

/** Payload for `POST /api/v1/trainings/{id}/sections`. */
export interface CreateTrainingSectionPayload {
  title: string;
  description?: string | null;
  order?: number | null;
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/trainings/{id}/sections/{section_id}`. */
export type UpdateTrainingSectionPayload = Partial<CreateTrainingSectionPayload>;

/** Payload for `POST /api/v1/trainings/{id}/sections/{section_id}/lessons`. */
export interface CreateTrainingLessonPayload {
  title: string;
  description?: string | null;
  content?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
  order?: number | null;
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/trainings/{id}/sections/{sid}/lessons/{lid}`. */
export type UpdateTrainingLessonPayload = Partial<CreateTrainingLessonPayload>;

/** Payload for `POST /api/v1/trainings/{id}/sections/reorder` and friends. */
export interface ReorderPayload {
  order: string[];
}

// ---- Assessments / Assignments ----

/** Payload for `POST /api/v1/trainings/{id}/assessments`. */
export interface CreateTrainingAssessmentPayload {
  title: string;
  description?: string | null;
  type?: string | null;
  passing_score?: number | null;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/trainings/{id}/assessments/{aid}/questions`. */
export interface CreateAssessmentQuestionPayload {
  question_text: string;
  question_type?: string | null;
  options?: string[] | null;
  correct_answer?: string | null;
  points?: number | null;
  explanation?: string | null;
  reusable?: boolean | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/trainings/{id}/assessments/{aid}/submit`. */
export interface SubmitAssessmentPayload {
  answers: Array<{ question_id: string; answer: unknown }>;
  started_at?: string | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/trainings/{id}/assignments`. */
export interface CreateTrainingAssignmentPayload {
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_score?: number | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/trainings/{id}/assignments/{aid}/submit`. */
export interface SubmitAssignmentPayload {
  content?: string | null;
  file_url?: string | null;
  [key: string]: unknown;
}

/** Payload for `POST .../grade`. */
export interface GradeSubmissionPayload {
  score: number;
  feedback?: string | null;
  [key: string]: unknown;
}

// ---- Enrol / Orders / Waitlist ----

/** Enrolment row — permissive shape (backend may vary). */
export type TrainingEnrolment = Record<string, unknown> & { id: string };

/** Order row. */
export type TrainingOrder = Record<string, unknown> & { id: string };

/** Waitlist entry. */
export type TrainingWaitlistEntry = Record<string, unknown> & { id: string };

// ---- Live sessions / Progress / Social ----

/** Payload for `POST /api/v1/trainings/{id}/live-sessions`. */
export interface CreateLiveSessionPayload {
  title: string;
  description?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string;
  meeting_provider?: string;
}

/** Payload for `POST /api/v1/trainings/{id}/progress/complete-lesson`. */
export interface CompleteLessonPayload {
  lesson_id: string;
  section_id?: string | null;
}

/** Payload for `POST /api/v1/trainings/{id}/announcements`. */
export interface CreateTrainingAnnouncementPayload {
  title?: string | null;
  message: string;
  recipient_type?: "all" | "registered" | "specific";
  channels?: Array<"in_app" | "push" | "email" | "sms">;
  [key: string]: unknown;
}

/** Payload for `POST|GET /api/v1/trainings/{id}/discussions`. */
export interface CreateTrainingDiscussionPayload {
  question: string;
  parent_id?: string | null;
  [key: string]: unknown;
}

// ---- Topics ----

/** Topic inside a lesson. */
export interface TrainingTopic {
  id: string;
  title: string;
  content?: string | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/trainings/{id}/sections/{sid}/lessons/{lid}/topics`. */
export interface CreateTopicPayload {
  title: string;
  content?: string | null;
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/trainings/{id}/sections/{sid}/lessons/{lid}/topics/{tid}`. */
export type UpdateTopicPayload = Partial<CreateTopicPayload>;

// ---- Assessment update ----

/** Payload for `PUT /api/v1/trainings/{id}/assessments/{aid}`. */
export type UpdateTrainingAssessmentPayload = Partial<CreateTrainingAssessmentPayload>;

// ---- Moderation ----

/** Payload for suspend/cancel with reason. */
export interface TrainingModerationPayload {
  reason: string;
}

// ---- Admin / Refund helpers ----

/** Payload for `POST /api/v1/trainings/{id}/orders/{oid}/refund`. */
export interface TrainingRefundPayload {
  reason?: string;
  amount?: string;
}

/** Assessment list filter. */
export interface AssessmentListParams {
  module_id?: string;
  lesson_id?: string;
}

/** Safely displayable Trainings API failure. */
export class TrainingsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

const trainingsBasePath = "/api/v1/trainings/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPagination(value: unknown): value is TrainingPagination {
  return (
    isRecord(value) &&
    typeof value.total === "number" &&
    typeof value.page === "number" &&
    typeof value.page_size === "number" &&
    typeof value.total_pages === "number"
  );
}

function isTrainingListItem(value: unknown): value is TrainingListItem {
  if (!isRecord(value)) return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.enterprise_id === "string" &&
    typeof rec.title === "string" &&
    typeof rec.category === "string" &&
    typeof rec.status === "string" &&
    (rec.tenant_id === undefined || rec.tenant_id === null || typeof rec.tenant_id === "string") &&
    (rec.description === undefined || rec.description === null || typeof rec.description === "string") &&
    (rec.created_at === undefined || rec.created_at === null || typeof rec.created_at === "string") &&
    (rec.updated_at === undefined || rec.updated_at === null || typeof rec.updated_at === "string") &&
    (rec.start_date === undefined || rec.start_date === null || typeof rec.start_date === "string")
  );
}

function isTrainingDetail(value: unknown): value is TrainingDetail {
  if (!isTrainingListItem(value)) return false;
  const rec = value as unknown as Record<string, unknown>;
  const en = rec.enterprise_name;
  return en === undefined || en === null || typeof en === "string";
}

function parsePaginatedResponse(value: unknown): TrainingPaginatedResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isTrainingListItem) || !isPagination(value.pagination)) {
    throw new Error("Trainings API returned an invalid paginated response.");
  }
  return { items: value.items, pagination: value.pagination };
}

function readErrorMessages(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(readErrorMessages);
  if (isRecord(value)) return readErrorMessages(value.detail ?? value.message ?? "");
  return [];
}

async function createTrainingsApiError(response: Response, operation: string): Promise<TrainingsApiError> {
  const rawText = await response.text().catch(() => "");
  let body: unknown = null;
  try {
    body = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    body = null;
  }
  const fieldErrors: Record<string, string[]> = {};
  if (isRecord(body) && Array.isArray(body.detail)) {
    for (const detail of body.detail) {
      if (!isRecord(detail) || !Array.isArray(detail.loc)) continue;
      const field = [...detail.loc].reverse().find((item): item is string => typeof item === "string");
      const messages = readErrorMessages(detail.msg);
      if (field && messages.length > 0) fieldErrors[field] = [...(fieldErrors[field] ?? []), ...messages];
    }
  }
  const detail = readErrorMessages(body)[0];
  const message =
    detail ??
    (rawText.trim()
      ? `Unable to ${operation} (HTTP ${response.status}): ${rawText.trim().slice(0, 300)}`
      : `Unable to ${operation} (HTTP ${response.status}).`);
  return new TrainingsApiError(message, response.status, fieldErrors);
}

function toSearchParams(params: Record<string, unknown>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  return sp;
}

function getAttachmentFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const enc = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
  if (enc) {
    try {
      return decodeURIComponent(enc);
    } catch {
      return null;
    }
  }
  const m = /filename=(?:"([^"]+)"|([^;\s]+))/i.exec(contentDisposition);
  return m?.[1] ?? m?.[2] ?? null;
}

// ---------------------------------------------------------------------------
// Core CRUD + list/search + lifecycle
// ---------------------------------------------------------------------------

/** Lists Trainings scoped by the caller's auth context. */
export async function listTrainings(params: TrainingListParams = {}): Promise<TrainingPaginatedResponse> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`${trainingsBasePath}${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load trainings");
  const value = (await res.json()) as unknown;
  const parsed = parsePaginatedResponse(value);
  return { items: parsed.items.map(normaliseTrainingListItem), pagination: parsed.pagination };
}

function normaliseTrainingListItem(item: TrainingListItem): TrainingListItem {
  if (typeof item.primary_image !== "string" || item.primary_image.trim().length === 0) return { ...item, primary_image: null };
  return { ...item, primary_image: item.primary_image.trim() };
}

/** Searches Trainings via the classified search endpoint. */
export async function searchTrainings(params: TrainingSearchParams = {}): Promise<TrainingPaginatedResponse> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`/api/v1/search/trainings${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "search trainings");
  return parsePaginatedResponse((await res.json()) as unknown);
}

/** Creates a Training. */
export async function createTraining(payload: CreateTrainingPayload): Promise<TrainingDetail> {
  const res = await fetch(trainingsBasePath, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this training");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value) && !isTrainingListItem(value)) throw new Error("Trainings API returned an invalid created training response.");
  return value as TrainingDetail;
}

/** Retrieves one Training by id. */
export async function getTrainingById(trainingId: string): Promise<TrainingDetail> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load this training");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value)) throw new Error("Trainings API returned an invalid training response.");
  return value;
}

/** Partially updates a Training. */
export async function updateTraining(trainingId: string, payload: UpdateTrainingPayload): Promise<TrainingDetail> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "update this training");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value) && !isTrainingListItem(value)) throw new Error("Trainings API returned an invalid updated training response.");
  return value as TrainingDetail;
}

/** Deletes a Training. */
export async function deleteTraining(trainingId: string): Promise<void> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "delete this training");
}

/** Duplicates a Training. */
export async function duplicateTraining(trainingId: string): Promise<TrainingDetail> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/duplicate`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "duplicate this training");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value) && !isTrainingListItem(value)) throw new Error("Trainings API returned an invalid duplicated training response.");
  return value as TrainingDetail;
}

/** Patches Training status (`PATCH /status` — body `{status, reason?}`). */
export async function updateTrainingStatus(trainingId: string, payload: TrainingStatusUpdatePayload): Promise<TrainingDetail> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "update training status");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value) && !isTrainingListItem(value)) throw new Error("Trainings API returned an invalid status-updated training response.");
  return value as TrainingDetail;
}

/** Unpublishes a Training. */
export async function unpublishTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/unpublish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "unpublish this training");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Archives a Training. */
export async function archiveTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/archive`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "archive this training");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Restores an archived Training to draft — `POST /trainings/{id}/restore`. */
export async function restoreTraining(trainingId: string): Promise<TrainingDetail> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/restore`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "restore this training");
  const value = (await res.json()) as unknown;
  if (!isTrainingDetail(value) && !isTrainingListItem(value)) throw new Error("Trainings API returned an invalid restored training response.");
  return value as TrainingDetail;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** Lists sections for a Training. */
export async function getTrainingSections(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load training sections");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid sections response.");
  return value;
}

/** Creates a section. */
export async function createTrainingSection(trainingId: string, payload: CreateTrainingSectionPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this section");
  return (await res.json()) as unknown;
}

/** Updates a section. */
export async function updateTrainingSection(trainingId: string, sectionId: string, payload: UpdateTrainingSectionPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "update this section");
  return (await res.json()) as unknown;
}

/** Reorders sections (`POST /sections/reorder`). */
export async function reorderTrainingSections(trainingId: string, payload: ReorderPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "reorder sections");
  return (await res.json().catch(() => null)) as unknown;
}

/** Reorders modules (`POST /modules/reorder`). */
export async function reorderTrainingModules(trainingId: string, payload: ReorderPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/modules/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "reorder modules");
  return (await res.json().catch(() => null)) as unknown;
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/** Creates a lesson under a section. */
export async function createTrainingLesson(
  trainingId: string,
  sectionId: string,
  payload: CreateTrainingLessonPayload,
): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this lesson");
  return (await res.json()) as unknown;
}

/** Updates a lesson. */
export async function updateTrainingLesson(
  trainingId: string,
  sectionId: string,
  lessonId: string,
  payload: UpdateTrainingLessonPayload,
): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}`,
    { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "update this lesson");
  return (await res.json()) as unknown;
}

/** Deletes a lesson. */
export async function deleteTrainingLesson(trainingId: string, sectionId: string, lessonId: string): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "delete this lesson");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Reorders lessons within a section. */
export async function reorderTrainingLessons(trainingId: string, sectionId: string, payload: ReorderPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "reorder lessons");
  return (await res.json().catch(() => null)) as unknown;
}

// ---------------------------------------------------------------------------
// Assessments / Assignments / Question bank
// ---------------------------------------------------------------------------

/** Lists assessments for a Training — supports `?module_id&lesson_id` filtering. */
export async function listTrainingAssessments(trainingId: string, params: AssessmentListParams = {}): Promise<unknown[]> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load assessments");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid assessments response.");
  return value;
}

/** Creates an assessment. */
export async function createTrainingAssessment(trainingId: string, payload: CreateTrainingAssessmentPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this assessment");
  return (await res.json()) as unknown;
}

/** Gets question bank. */
export async function getTrainingQuestionBank(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/question-bank`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load question bank");
  return (await res.json()) as unknown;
}

/** Adds questions to an assessment. */
export async function addAssessmentQuestions(trainingId: string, assessmentId: string, payload: CreateAssessmentQuestionPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}/questions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "add questions to this assessment");
  return (await res.json()) as unknown;
}

/** Submits an assessment. */
export async function submitTrainingAssessment(trainingId: string, assessmentId: string, payload: SubmitAssessmentPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "submit this assessment");
  return (await res.json()) as unknown;
}

/** Grades an assessment submission. */
export async function gradeAssessmentSubmission(
  trainingId: string,
  assessmentId: string,
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionId)}/grade`,
    { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "grade this assessment submission");
  return (await res.json()) as unknown;
}

/** Gets assessment submission review. */
export async function getAssessmentSubmissionReview(trainingId: string, assessmentId: string, submissionId: string): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionId)}/review`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "load assessment submission review");
  return (await res.json()) as unknown;
}

/** Lists assignments for a Training — `GET /trainings/{id}/assignments`.
 *  Backend currently returns 405; gracefully returns [] until the endpoint is implemented. */
export async function listTrainingAssignments(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assignments`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const value = (await res.json()) as unknown;
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.items)) return value.items as unknown[];
  return [];
}

/** Creates an assignment. */
export async function createTrainingAssignment(trainingId: string, payload: CreateTrainingAssignmentPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assignments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this assignment");
  return (await res.json()) as unknown;
}

/** Deletes an assignment — `DELETE /trainings/{id}/assignments/{assignment_id}`. */
export async function deleteTrainingAssignment(trainingId: string, assignmentId: string): Promise<void> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await createTrainingsApiError(res, "delete this assignment");
}

/** Submits an assignment. */
export async function submitTrainingAssignment(trainingId: string, assignmentId: string, payload: SubmitAssignmentPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assignments/${encodeURIComponent(assignmentId)}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "submit this assignment");
  return (await res.json()) as unknown;
}

/** Grades an assignment submission. */
export async function gradeAssignmentSubmission(
  trainingId: string,
  assignmentId: string,
  submissionId: string,
  payload: GradeSubmissionPayload,
): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}/grade`,
    { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "grade this assignment submission");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Enrolments / Orders / Waitlist / Checkout
// ---------------------------------------------------------------------------

/** Lists my enrolments. */
export async function listMyTrainingEnrolments(): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}my/enrolments`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load my training enrolments");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid my enrolments response.");
  return value;
}

/** Enrols in a Training. */
export async function enrolInTraining(trainingId: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/enrol`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "enrol in this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Lists enrolments for a Training. */
export async function listTrainingEnrolments(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/enrolments`, { credentials: "include", cache: "no-store" });
  if (!res.ok) return [];
  const value = (await res.json()) as unknown;
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.items)) return value.items as unknown[];
  return [];
}

/** Cancels an enrolment. */
export async function cancelTrainingEnrolment(trainingId: string, enrolId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/enrolments/${encodeURIComponent(enrolId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "cancel this enrolment");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Approves an enrolment. */
export async function approveTrainingEnrolment(trainingId: string, enrolId: string, reason?: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/enrolments/${encodeURIComponent(enrolId)}/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved", ...(reason ? { reason } : {}) }),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "approve this enrolment");
  return (await res.json().catch(() => null)) as unknown;
}

/** Checkout / purchase a Training — `POST /trainings/{id}/checkout` with `TrainingCheckoutRequest`. */
export interface TrainingCheckoutRequest {
  participant_name: string;
  participant_email: string;
  quantity?: number;
  coupon_code?: string;
  payment_provider?: "marketplace" | "merchant";
}

export async function checkoutTraining(trainingId: string, payload: TrainingCheckoutRequest): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/checkout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "checkout this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Lists orders for a Training. */
export async function listTrainingOrders(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/orders`, { credentials: "include", cache: "no-store" });
  if (!res.ok) return [];
  const value = (await res.json()) as unknown;
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.items)) return value.items as unknown[];
  return [];
}

/** Patches order status — `PATCH /orders/{id}/status` with `{ status, reason? }`. */
export async function patchTrainingOrderStatus(trainingId: string, orderId: string, payload: { status: string; reason?: string }): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "update order status");
  return (await res.json()) as unknown;
}

/** Requests refund for an order. */
export async function refundTrainingOrder(trainingId: string, orderId: string, payload: TrainingRefundPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/orders/${encodeURIComponent(orderId)}/refund`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "refund this order");
  return (await res.json().catch(() => null)) as unknown;
}

/** Approves refund. */
/** Approves or rejects a requested refund on an order — `POST /orders/{id}/refund/approve` with `{ action, reason? }`. */
export async function decideTrainingOrderRefund(trainingId: string, orderId: string, action: "approve" | "reject", reason?: string): Promise<unknown> {
  const trimmedReason = reason?.trim();
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/orders/${encodeURIComponent(orderId)}/refund/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...(trimmedReason ? { reason: trimmedReason } : {}) }),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "decide this refund");
  return (await res.json().catch(() => null)) as unknown;
}

/** Joins waitlist. */
export async function joinTrainingWaitlist(trainingId: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/waitlist`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "join waitlist for this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Leaves waitlist. */
export async function leaveTrainingWaitlist(trainingId: string, entryId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/waitlist/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "leave waitlist");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Progress / Content / Live sessions / Certificate / Calendar etc.
// ---------------------------------------------------------------------------

/** Gets training progress. */
export async function getTrainingProgress(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/progress`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load training progress");
  return (await res.json()) as unknown;
}

/** Gets training content (sections/lessons for learner) — supports `?is_preview=true` draft gating. */
export async function getTrainingContent(trainingId: string, isPreview = false): Promise<unknown> {
  const qs = isPreview ? "?is_preview=true" : "";
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/content${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load training content");
  return (await res.json()) as unknown;
}

/** Gets a single lesson — `GET /sections/{sid}/lessons/{lid}` with optional `?is_preview`. */
export async function getTrainingLesson(trainingId: string, sectionId: string, lessonId: string, isPreview = false): Promise<unknown> {
  const qs = isPreview ? "?is_preview=true" : "";
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}${qs}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "load this lesson");
  return (await res.json()) as unknown;
}

/** Completes a lesson. */
export async function completeTrainingLesson(trainingId: string, payload: CompleteLessonPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/progress/complete-lesson`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "complete this lesson");
  return (await res.json().catch(() => null)) as unknown;
}

/** Lists live sessions. */
export async function listTrainingLiveSessions(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/live-sessions`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load live sessions");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid live sessions response.");
  return value;
}

/** Creates a live session. */
export async function createTrainingLiveSession(trainingId: string, payload: CreateLiveSessionPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/live-sessions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this live session");
  return (await res.json()) as unknown;
}

/** Marks attendance for a live session. */
export async function markLiveSessionAttendance(trainingId: string, sessionId: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/live-sessions/${encodeURIComponent(sessionId)}/attendance`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "mark attendance for this session");
  return (await res.json().catch(() => null)) as unknown;
}

/** Gets training certificate (may be PDF or JSON). Requires participant_email. */
export async function getTrainingCertificate(trainingId: string, participantEmail: string): Promise<Blob | unknown> {
  if (!participantEmail.trim()) throw new Error("Participant email is required to load the certificate.");
  const url = new URL(`${trainingsBasePath}${encodeURIComponent(trainingId)}/certificate`, window.location.origin);
  url.searchParams.set("participant_email", participantEmail.trim());
  const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load training certificate");
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/pdf") || ct.includes("octet-stream")) return res.blob();
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Downloads training calendar. */
export async function downloadTrainingCalendar(trainingId: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/calendar.ics`, { credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "download training calendar");
  return { blob: await res.blob(), filename: getAttachmentFilename(res.headers.get("Content-Disposition")) };
}

/** Gets meeting link. */
export async function getTrainingMeetingLink(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/meeting-link`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load meeting link");
  return (await res.json()) as unknown;
}

/** Lists discussions. */
export async function listTrainingDiscussions(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/discussions`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load discussions");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid discussions response.");
  return value;
}

/** Creates a discussion. */
export async function createTrainingDiscussion(trainingId: string, payload: CreateTrainingDiscussionPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/discussions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this discussion");
  return (await res.json()) as unknown;
}

/** Creates an announcement. */
export async function createTrainingAnnouncement(trainingId: string, payload: CreateTrainingAnnouncementPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/announcements`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "create this announcement");
  return (await res.json().catch(() => null)) as unknown;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Lists pending trainings for admin approval. */
export async function listPendingTrainings(params: { page?: number; page_size?: number; enterprise_id?: string; category?: string } = {}): Promise<unknown> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`/api/v1/admin/trainings/pending${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load pending trainings");
  return (await res.json()) as unknown;
}

/** Approves a pending training. */
export async function approveTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/approve`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "approve this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Rejects a pending training. */
export async function rejectTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/reject`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "reject this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Publishes a training via admin. */
export async function publishTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/publish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "publish this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Admin detail view for approval review — `GET /admin/trainings/{id}`. */
export async function adminGetTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "get admin training detail");
  return (await res.json()) as unknown;
}

/** Admin requests changes before approval — `POST /admin/trainings/{id}/request-changes`. */
export async function requestChangesTraining(trainingId: string, reason: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/trainings/${encodeURIComponent(trainingId)}/request-changes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "request changes on training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Publishes a training (enterprise) — `POST /trainings/{id}/publish`. */
export async function publishTrainingEnterprise(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/publish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "publish this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Suspends a training — `POST /trainings/{id}/suspend` with reason. */
export async function suspendTraining(trainingId: string, payload: TrainingModerationPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/suspend`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "suspend this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Cancels a training — `POST /trainings/{id}/cancel` with reason. */
export async function cancelTraining(trainingId: string, payload: TrainingModerationPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "cancel this training");
  return (await res.json().catch(() => null)) as unknown;
}

/** Deletes a section — `DELETE /trainings/{id}/sections/{sid}`. */
export async function deleteTrainingSection(trainingId: string, sectionId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "delete this section");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// ---- Topics CRUD ----

/** Lists topics for a lesson — `GET /lessons/{lid}/topics`. */
export async function listLessonTopics(trainingId: string, sectionId: string, lessonId: string): Promise<unknown[]> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/topics`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "load topics");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid topics response.");
  return value;
}

/** Creates a topic. */
export async function createLessonTopic(trainingId: string, sectionId: string, lessonId: string, payload: CreateTopicPayload): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/topics`,
    { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "create this topic");
  return (await res.json()) as unknown;
}

/** Updates a topic. */
export async function updateLessonTopic(
  trainingId: string,
  sectionId: string,
  lessonId: string,
  topicId: string,
  payload: UpdateTopicPayload,
): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/topics/${encodeURIComponent(topicId)}`,
    { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "update this topic");
  return (await res.json()) as unknown;
}

/** Deletes a topic. */
export async function deleteLessonTopic(trainingId: string, sectionId: string, lessonId: string, topicId: string): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/topics/${encodeURIComponent(topicId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "delete this topic");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// ---- Assessment edit/delete ----

/** Updates an assessment — `PUT /assessments/{aid}`. */
export async function updateTrainingAssessment(trainingId: string, assessmentId: string, payload: UpdateTrainingAssessmentPayload): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "update this assessment");
  return (await res.json()) as unknown;
}

/** Deletes an assessment — `DELETE /assessments/{aid}`. */
export async function deleteTrainingAssessment(trainingId: string, assessmentId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "delete this assessment");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Deletes an assessment question — `DELETE /assessments/{aid}/questions/{qid}`. */
export async function deleteAssessmentQuestion(trainingId: string, assessmentId: string, questionId: string): Promise<unknown> {
  const res = await fetch(
    `${trainingsBasePath}${encodeURIComponent(trainingId)}/assessments/${encodeURIComponent(assessmentId)}/questions/${encodeURIComponent(questionId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw await createTrainingsApiError(res, "delete this question");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// ---- Live attendance GET/export ----

/** Gets attendance for a live session — `GET /live-sessions/{sid}/attendance`. */
export async function getLiveSessionAttendance(trainingId: string, sessionId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/live-sessions/${encodeURIComponent(sessionId)}/attendance`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "load live attendance");
  return (await res.json()) as unknown;
}

/** Exports attendance CSV — `GET /live-sessions/{sid}/attendance/export`. */
export async function exportLiveSessionAttendance(trainingId: string, sessionId: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/live-sessions/${encodeURIComponent(sessionId)}/attendance/export`, {
    credentials: "include",
  });
  if (!res.ok) throw await createTrainingsApiError(res, "export live attendance");
  const ct = res.headers.get("Content-Type") ?? "";
  if (!ct.includes("text/csv") && !ct.includes("octet-stream") && !ct.includes("excel")) {
    // still return blob even if content-type unexpected
  }
  return { blob: await res.blob(), filename: getAttachmentFilename(res.headers.get("Content-Disposition")) };
}

// ---- Announcements GET ----

/** Lists persisted announcements — `GET /announcements`. */
export async function listTrainingAnnouncements(trainingId: string): Promise<unknown[]> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/announcements`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load announcements");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Trainings API returned an invalid announcements response.");
  return value;
}

// ---- Discussion threaded replies ----

/** Replies to a discussion — `POST /discussions/{did}/replies` with `{message, is_answer?}`. */
export async function createDiscussionReply(trainingId: string, discussionId: string, payload: { message: string; is_answer?: boolean }): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/discussions/${encodeURIComponent(discussionId)}/replies`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createTrainingsApiError(res, "reply to this discussion");
  return (await res.json()) as unknown;
}

// ---- Moderation history ----

/** Gets moderation history — `GET /trainings/{id}/moderation-history`. */
export async function getTrainingModerationHistory(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/moderation-history`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load moderation history");
  return (await res.json()) as unknown;
}

/** Gets the latest super-admin reject / request-changes note — `GET /trainings/{id}/admin-notes`. */
export async function getTrainingAdminNotes(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/admin-notes`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createTrainingsApiError(res, "load the admin note");
  return (await res.json().catch(() => null)) as unknown;
}

/** Resubmits a Training after requested changes / rejection — `POST /trainings/{id}/resubmit`. */
export async function resubmitTraining(trainingId: string): Promise<unknown> {
  const res = await fetch(`${trainingsBasePath}${encodeURIComponent(trainingId)}/resubmit`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createTrainingsApiError(res, "resubmit this training for approval");
  const value = (await res.json().catch(() => null)) as unknown;
  return value;
}

// Re-export helper for filename parsing (used for cert/calendar exports).
export { getAttachmentFilename };

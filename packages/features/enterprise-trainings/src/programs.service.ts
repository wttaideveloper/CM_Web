/**
 * Typed contracts + API client for the Programs domain.
 *
 * Mirrors the OpenAPI spec at https://chat.wisdomtooth.tech/api/docs
 * (Classifieds Marketplace Platform API — /api/v1/programs).
 * Types and runtime validation live next to the fetch calls, matching the
 * enterprise-events module convention (single self-contained service file).
 */

import type { ProgramStatus, ProgramStatusUpdatePayload } from "./program-status";

/** Pagination metadata returned with every list response. */
export interface ProgramPagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Lightweight program row returned in paginated lists. */
export interface ProgramListItem {
  id: string;
  enterprise_id: string;
  title: string;
  description: string | null;
  category: string;
  delivery_mode: string | null;
  price: string | null;
  status: ProgramStatus;
  is_deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  phases: unknown[] | null;
}

/** Full program detail — same as list item plus `enterprise_name`. */
export interface ProgramDetail extends ProgramListItem {
  enterprise_name: string | null;
}

/** `ProgramResponse` (create/update return) — alias of detail without enterprise_name. */
export type Program = ProgramDetail;

/** Paginated list response. */
export interface ProgramPaginatedResponse {
  items: ProgramListItem[];
  pagination: ProgramPagination;
}

/** Supported query parameters for `GET /api/v1/programs/`. */
export interface ProgramListParams {
  search?: string;
  category?: string;
  provider?: string;
  instructor?: string;
  tenant_id?: string;
  enterprise_id?: string;
  location_id?: string;
  status?: string;
  delivery_mode?: string;
  min_price?: string;
  max_price?: string;
  duration?: string;
  eligibility?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/** Search endpoint params (`GET /api/v1/search/programs`). */
export interface ProgramSearchParams {
  query?: string;
  tenant_id?: string;
  enterprise_id?: string;
  category?: string;
  city?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

/** Payload for `POST /api/v1/programs/`. */
export interface CreateProgramPayload {
  tenant_id?: string | null;
  enterprise_id: string;
  location_id?: string | null;
  title: string;
  description?: string | null;
  category: string;
  provider_id?: string | null;
  duration_weeks?: string | null;
  eligibility?: Record<string, unknown> | string | null;
  start_date?: string | null;
  end_date?: string | null;
  enrolment_start?: string | null;
  enrolment_end?: string | null;
  enrol_type?: string | null;
  delivery_mode?: string | null;
  price?: string | null;
  currency?: string | null;
  capacity?: string | null;
  status?: string;
  form_configuration_version_id?: string | null;
  custom_values?: Record<string, unknown> | null;
}

/** Payload for `PUT /api/v1/programs/{id}` — all fields optional partial. */
export type UpdateProgramPayload = Partial<Omit<CreateProgramPayload, "enterprise_id" | "tenant_id" | "location_id">>;

// ---- Phases / Activities ----

/** Payload for `POST /api/v1/programs/{id}/phases`. */
export interface CreateProgramPhasePayload {
  title: string;
  type?: string | null;
  phase_type?: string | null;
  order?: number | null;
  prerequisites?: unknown[] | null;
  completion_rule?: string | null;
  release_schedule?: string | null;
  goals?: unknown[] | null;
  baseline?: unknown[] | null;
  expected_outcomes?: unknown[] | null;
  instructors?: unknown[] | null;
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/programs/{id}/phases/{phase_id}`. */
export type UpdateProgramPhasePayload = Partial<CreateProgramPhasePayload>;

/** Payload for `POST /api/v1/programs/{id}/phases/{phase_id}/activities`. */
export interface CreateProgramActivityPayload {
  type: string;
  title: string;
  content_url?: string | null;
  release?: string | null;
  session_type?: string | null;
  resource_url?: string | null;
  document_url?: string | null;
  video_url?: string | null;
  webpage_url?: string | null;
  prerequisites?: unknown[] | null;
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/programs/{id}/phases/{phase_id}/activities/{activity_id}`. */
export type UpdateProgramActivityPayload = Partial<CreateProgramActivityPayload>;

/** Payload for `POST /api/v1/programs/{id}/phases/reorder`. */
export interface ReorderProgramPhasesPayload {
  order: string[];
  [key: string]: unknown;
}

// ---- Enrolments / Waitlist ----

/** Payload for `POST /api/v1/programs/{id}/enrol`. */
export interface EnrolInProgramPayload {
  participant_name: string;
  participant_email: string;
  group_enrol?: boolean | null;
  goals?: unknown[] | null;
  baseline?: unknown[] | null;
  expected_outcomes?: unknown[] | null;
  [key: string]: unknown;
}

/** Payload for `PATCH /api/v1/programs/{id}/enrolments/{enrol_id}/status`. */
export interface UpdateProgramEnrolmentStatusPayload {
  status: string;
  new_end_date?: string | null;
  withdrawal_reason?: string | null;
  [key: string]: unknown;
}

/** Enrolment row — permissive shape (backend may vary). */
export type ProgramEnrolment = Record<string, unknown> & { id: string };

/** Waitlist entry. */
export type ProgramWaitlistEntry = Record<string, unknown> & { id: string };

// ---- Check-ins / Reviews / Surveys ----

/** Payload for `POST /api/v1/programs/{id}/check-ins` and `/check-ins/self`. */
export interface CreateProgramCheckInPayload {
  participant_email: string;
  phase_id?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/programs/{id}/check-ins/{checkin_id}/feedback`. */
export interface ProgramCheckInFeedbackPayload {
  feedback?: string;
  progress_notes?: string | null;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/programs/{id}/reviews`. */
export interface CreateProgramReviewPayload {
  rating: number;
  comment?: string | null;
  participant_email: string;
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/programs/{id}/surveys`. */
export interface CreateProgramSurveyPayload {
  title: string;
  description?: string | null;
  questions: unknown[];
  [key: string]: unknown;
}

/** Payload for `POST /api/v1/programs/{id}/surveys/{survey_id}/submit`. */
export interface SubmitProgramSurveyPayload {
  answers: unknown[];
  [key: string]: unknown;
}

/** Payload for `PUT /api/v1/programs/{id}/goals`. */
export interface UpdateProgramGoalsPayload {
  goals?: unknown[] | null;
  baseline?: unknown[] | null;
  expected_outcomes?: unknown[] | null;
  [key: string]: unknown;
}

// ---- Misc ----

/** Program reports filter (`GET /api/v1/programs/{id}/reports`). */
export interface ProgramReportsParams {
  type?: string;
  date_from?: string;
  date_to?: string;
}

/** Admin pending-queue filter (`GET /api/v1/admin/programs/pending`). */
export interface PendingProgramsParams {
  page?: number;
  page_size?: number;
  enterprise_id?: string;
  category?: string;
  [key: string]: unknown;
}
/** Safely displayable Programs API failure. */
export class ProgramsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

const programsBasePath = "/api/v1/programs/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPagination(value: unknown): value is ProgramPagination {
  return (
    isRecord(value) &&
    typeof value.total === "number" &&
    typeof value.page === "number" &&
    typeof value.page_size === "number" &&
    typeof value.total_pages === "number"
  );
}

function isProgramListItem(value: unknown): value is ProgramListItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.enterprise_id === "string" &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.status === "string" &&
    (value.description === undefined || value.description === null || typeof value.description === "string") &&
    (value.delivery_mode === undefined || value.delivery_mode === null || typeof value.delivery_mode === "string") &&
    (value.price === undefined || value.price === null || typeof value.price === "string") &&
    (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string") &&
    (value.updated_at === undefined || value.updated_at === null || typeof value.updated_at === "string")
  );
}

function isProgramDetail(value: unknown): value is ProgramDetail {
  if (!isProgramListItem(value)) return false;
  const rec = value as unknown as Record<string, unknown>;
  const en = rec.enterprise_name;
  return en === undefined || en === null || typeof en === "string";
}

function parsePaginatedResponse(value: unknown): ProgramPaginatedResponse {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isProgramListItem) || !isPagination(value.pagination)) {
    throw new Error("Programs API returned an invalid paginated response.");
  }
  return { items: value.items, pagination: value.pagination };
}

function readErrorMessages(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(readErrorMessages);
  if (isRecord(value)) return readErrorMessages(value.detail ?? value.message ?? "");
  return [];
}

async function createProgramsApiError(response: Response, operation: string): Promise<ProgramsApiError> {
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
  return new ProgramsApiError(message, response.status, fieldErrors);
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

/** Lists Programs scoped by the caller's auth context. */
export async function listPrograms(params: ProgramListParams = {}): Promise<ProgramPaginatedResponse> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`${programsBasePath}${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load programs");
  return parsePaginatedResponse((await res.json()) as unknown);
}

/** Searches Programs via the classified search endpoint. */
export async function searchPrograms(params: ProgramSearchParams = {}): Promise<ProgramPaginatedResponse> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`/api/v1/search/programs${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "search programs");
  return parsePaginatedResponse((await res.json()) as unknown);
}

/** Creates a Program. */
export async function createProgram(payload: CreateProgramPayload): Promise<ProgramDetail> {
  const res = await fetch(programsBasePath, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "create this program");
  const value = (await res.json()) as unknown;
  if (!isProgramDetail(value)) throw new Error("Programs API returned an invalid program.");
  return value;
}

/** Loads one program by ID. */
export async function getProgramById(programId: string): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load this program");
  const value = (await res.json()) as unknown;
  if (!isProgramDetail(value)) throw new Error("Programs API returned an invalid program.");
  return value;
}

/** Updates a Program — `PUT /programs/{id}`. */
export async function updateProgram(programId: string, payload: UpdateProgramPayload): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "update this program");
  const value = (await res.json()) as unknown;
  if (!isProgramDetail(value)) throw new Error("Programs API returned an invalid program.");
  return value;
}

/** Deletes a Program. */
export async function deleteProgram(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "delete this program");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Duplicates a Program. */
export async function duplicateProgram(programId: string): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/duplicate`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "duplicate this program");
  const value = (await res.json()) as unknown;
  if (!isProgramDetail(value)) throw new Error("Programs API returned an invalid duplicated program.");
  return value;
}

/** Patches program status — `PATCH /programs/{id}/status`. */
export async function updateProgramStatus(programId: string, payload: ProgramStatusUpdatePayload): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "update program status");
  const value = (await res.json()) as unknown;
  if (!isProgramDetail(value)) throw new Error("Programs API returned an invalid updated program.");
  return value;
}

/** Publishes a Program. */
export async function publishProgram(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/publish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "publish this program");
  return (await res.json()) as unknown;
}

/** Unpublishes a Program (sets status=unpublished). */
export async function unpublishProgram(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/unpublish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "unpublish this program");
  return (await res.json()) as unknown;
}

/** Suspends a Program. */
export async function suspendProgram(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/suspend`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "suspend this program");
  return (await res.json()) as unknown;
}

/** Cancels a Program. */
export async function cancelProgram(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/cancel`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "cancel this program");
  return (await res.json()) as unknown;
}

/** Archives a Program — `POST /programs/{id}/archive`. */
export async function archiveProgram(programId: string): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/archive`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "archive this program");
  return (await res.json()) as unknown as ProgramDetail;
}

/** Restores an archived Program to draft — `POST /programs/{id}/restore`. */
export async function restoreProgram(programId: string): Promise<ProgramDetail> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/restore`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "restore this program");
  return (await res.json()) as unknown as ProgramDetail;
}

/** Gets available seats & waitlist — `GET /programs/{id}/availability`. */
export async function getProgramAvailability(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/availability`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load program availability");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Phases / Activities
// ---------------------------------------------------------------------------

/** Lists phases — `GET /programs/{id}/phases`. */
export async function listProgramPhases(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load phases");
  return (await res.json()) as unknown;
}

/** Adds a phase — `POST /programs/{id}/phases`. */
export async function createProgramPhase(programId: string, payload: CreateProgramPhasePayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "create this phase");
  return (await res.json()) as unknown;
}

/** Updates a phase — `PUT /programs/{id}/phases/{phase_id}`. */
export async function updateProgramPhase(programId: string, phaseId: string, payload: UpdateProgramPhasePayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "update this phase");
  return (await res.json()) as unknown;
}

/** Deletes a phase — `DELETE /programs/{id}/phases/{phase_id}`. */
export async function deleteProgramPhase(programId: string, phaseId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await createProgramsApiError(res, "delete this phase");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Reorders phases — `POST /programs/{id}/phases/reorder`. */
export async function reorderProgramPhases(programId: string, payload: ReorderProgramPhasesPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "reorder phases");
  return (await res.json()) as unknown;
}

/** Adds an activity — `POST /programs/{id}/phases/{phase_id}/activities`. */
export async function createProgramActivity(programId: string, phaseId: string, payload: CreateProgramActivityPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}/activities`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "create this activity");
  return (await res.json()) as unknown;
}

/** Updates an activity — `PUT /programs/{id}/phases/{phase_id}/activities/{activity_id}`. */
export async function updateProgramActivity(
  programId: string,
  phaseId: string,
  activityId: string,
  payload: UpdateProgramActivityPayload,
): Promise<unknown> {
  const res = await fetch(
    `${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}/activities/${encodeURIComponent(activityId)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await createProgramsApiError(res, "update this activity");
  return (await res.json()) as unknown;
}

/** Deletes an activity — `DELETE /programs/{id}/phases/{phase_id}/activities/{activity_id}`. */
export async function deleteProgramActivity(programId: string, phaseId: string, activityId: string): Promise<unknown> {
  const res = await fetch(
    `${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}/activities/${encodeURIComponent(activityId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw await createProgramsApiError(res, "delete this activity");
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Assigns instructors/coaches/mentors — `PUT /programs/{id}/phases/{phase_id}/instructors`. */
export async function assignProgramPhaseInstructors(programId: string, phaseId: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/phases/${encodeURIComponent(phaseId)}/instructors`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "assign instructors");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Learner view: content / progress / dashboards / reports
// ---------------------------------------------------------------------------

/** Gets secure enrolled content — `GET /programs/{id}/content`. */
export async function getProgramContent(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/content`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load program content");
  return (await res.json()) as unknown;
}

/** Gets program progress — `GET /programs/{id}/progress`. */
export async function getProgramProgress(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/progress`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load program progress");
  return (await res.json()) as unknown;
}

/** Gets program reports — `GET /programs/{id}/reports`. */
export async function getProgramReports(programId: string, params: ProgramReportsParams = {}): Promise<unknown> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/reports${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load program reports");
  return (await res.json()) as unknown;
}

/** Gets programs report summary — `GET /programs/reports/summary`. */
export async function getProgramsReportSummary(): Promise<unknown> {
  const res = await fetch(`/api/v1/programs/reports/summary`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load programs summary");
  return (await res.json()) as unknown;
}

/** Participant dashboard — `GET /programs/{id}/dashboards/participant`. */
export async function getProgramParticipantDashboard(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/dashboards/participant`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load participant dashboard");
  return (await res.json()) as unknown;
}

/** Provider dashboard — `GET /programs/{id}/dashboards/provider`. */
export async function getProgramProviderDashboard(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/dashboards/provider`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load provider dashboard");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Enrolments / Waitlist / Orders
// ---------------------------------------------------------------------------

/** Enrols a participant — `POST /programs/{id}/enrol`. */
export async function enrolInProgram(programId: string, payload: EnrolInProgramPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/enrol`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "enrol in this program");
  return (await res.json()) as unknown;
}

/** Lists enrolments — `GET /programs/{id}/enrolments`. */
export async function listProgramEnrolments(programId: string): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/enrolments`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load enrolments");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Programs API returned an invalid enrolments response.");
  return value;
}

/** Exports enrolments CSV — `GET /programs/{id}/enrolments/export`. */
export async function exportProgramEnrolments(programId: string): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/enrolments/export`, { credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "export enrolments");
  return { blob: await res.blob(), filename: getAttachmentFilename(res.headers.get("Content-Disposition")) };
}

/** Updates enrolment status — `PATCH /programs/{id}/enrolments/{enrol_id}/status`. */
export async function updateProgramEnrolmentStatus(
  programId: string,
  enrolId: string,
  payload: UpdateProgramEnrolmentStatusPayload,
): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/enrolments/${encodeURIComponent(enrolId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "update enrolment status");
  return (await res.json()) as unknown;
}

/** Lists the current user's program enrolments — `GET /programs/my/enrolments`. */
export async function listMyProgramEnrolments(): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}my/enrolments`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load my enrolments");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Programs API returned an invalid enrolments response.");
  return value;
}

/** Joins the waitlist — `POST /programs/{id}/waitlist`. */
export async function joinProgramWaitlist(programId: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/waitlist`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "join the waitlist");
  return (await res.json()) as unknown;
}

/** Lists the waitlist — `GET /programs/{id}/waitlist`. */
export async function listProgramWaitlist(programId: string): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/waitlist`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load the waitlist");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Programs API returned an invalid waitlist response.");
  return value;
}

// ---------------------------------------------------------------------------
// Check-ins / Reviews / Surveys / Goals
// ---------------------------------------------------------------------------

/** Admin/provider check-in — `POST /programs/{id}/check-ins`. */
export async function createProgramCheckIn(programId: string, payload: CreateProgramCheckInPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/check-ins`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "record this check-in");
  return (await res.json()) as unknown;
}

/** Lists check-ins — `GET /programs/{id}/check-ins`. */
export async function listProgramCheckIns(programId: string): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/check-ins`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load check-ins");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Programs API returned an invalid check-ins response.");
  return value;
}

/** Participant self check-in — `POST /programs/{id}/check-ins/self`. */
export async function selfCheckIn(programId: string, payload: CreateProgramCheckInPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/check-ins/self`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "self check-in");
  return (await res.json()) as unknown;
}

/** Provider feedback & progress notes — `POST /programs/{id}/check-ins/{checkin_id}/feedback`. */
export async function addProgramCheckInFeedback(programId: string, checkInId: string, payload: ProgramCheckInFeedbackPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/check-ins/${encodeURIComponent(checkInId)}/feedback`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "add feedback");
  return (await res.json()) as unknown;
}

/** Lists reviews — `GET /programs/{id}/reviews`. */
export async function listProgramReviews(programId: string): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/reviews`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load reviews");
  const value = (await res.json()) as unknown;
  if (!Array.isArray(value)) throw new Error("Programs API returned an invalid reviews response.");
  return value;
}

/** Creates a review — `POST /programs/{id}/reviews`. */
export async function createProgramReview(programId: string, payload: CreateProgramReviewPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/reviews`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "create this review");
  return (await res.json()) as unknown;
}

/** Lists surveys — `GET /programs/{id}/surveys`. */
export async function listProgramSurveys(programId: string): Promise<unknown[]> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/surveys`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await createProgramsApiError(res, "list surveys");
  const data = await res.json();
  return Array.isArray(data) ? data : (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).items)) ? ((data as Record<string, unknown>).items as unknown[]) : [];
}

/** Creates a survey — `POST /programs/{id}/surveys`. */
export async function createProgramSurvey(programId: string, payload: CreateProgramSurveyPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/surveys`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "create this survey");
  return (await res.json()) as unknown;
}

/** Submits a survey response — `POST /programs/{id}/surveys/{survey_id}/submit`. */
export async function submitProgramSurvey(programId: string, surveyId: string, payload: SubmitProgramSurveyPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/surveys/${encodeURIComponent(surveyId)}/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "submit this survey");
  return (await res.json()) as unknown;
}

/** Updates goal & outcome fields — `PUT /programs/{id}/goals`. */
export async function updateProgramGoals(programId: string, payload: UpdateProgramGoalsPayload): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/goals`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await createProgramsApiError(res, "update goals");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Extras: certificate / meeting link
// ---------------------------------------------------------------------------

/** Gets the completion certificate — `GET /programs/{id}/certificate`. */
export async function getProgramCertificate(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/certificate`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load the certificate");
  return (await res.json()) as unknown;
}

/** Gets the secure meeting link — `GET /programs/{id}/meeting-link`. */
export async function getProgramMeetingLink(programId: string): Promise<unknown> {
  const res = await fetch(`${programsBasePath}${encodeURIComponent(programId)}/meeting-link`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load the meeting link");
  return (await res.json()) as unknown;
}

// ---------------------------------------------------------------------------
// Admin moderation
// ---------------------------------------------------------------------------

/** Lists pending programs for admin approval — `GET /admin/programs/pending`. */
export async function listPendingPrograms(params: PendingProgramsParams = {}): Promise<ProgramPaginatedResponse> {
  const sp = toSearchParams(params as Record<string, unknown>);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const res = await fetch(`/api/v1/admin/programs/pending${qs}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw await createProgramsApiError(res, "load pending programs");
  return parsePaginatedResponse((await res.json()) as unknown);
}

/** Approves a pending program — `POST /admin/programs/{id}/approve`. */
export async function approveProgram(programId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/programs/${encodeURIComponent(programId)}/approve`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "approve this program");
  return (await res.json()) as unknown;
}

/** Rejects a pending program — `POST /admin/programs/{id}/reject`. */
export async function rejectProgram(programId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/programs/${encodeURIComponent(programId)}/reject`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "reject this program");
  return (await res.json()) as unknown;
}

/** Publishes an approved program — `POST /admin/programs/{id}/publish`. */
export async function publishProgramAdmin(programId: string): Promise<unknown> {
  const res = await fetch(`/api/v1/admin/programs/${encodeURIComponent(programId)}/publish`, { method: "POST", credentials: "include" });
  if (!res.ok) throw await createProgramsApiError(res, "publish this program");
  return (await res.json()) as unknown;
}


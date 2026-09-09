/**
 * Runtime-validated Training dossier used by the Platform Admin approval review.
 * Mirrors the documented `TrainingResponse` schema (chat.wisdomtooth.tech/api/docs)
 * — the same fields returned by `GET /api/v1/trainings/{training_id}`.
 */

export type TrainingApprovalReview = {
  id: string;
  tenant_id?: string | null;
  enterprise_id: string | null;
  location_id?: string | null;
  enterprise_name?: string | null;
  title: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  tags?: unknown[] | null;
  instructor_id?: string | null;
  delivery_mode?: string | null;
  course_type?: string | null;
  capacity?: string | null;
  price?: string | null;
  currency?: string | null;
  status: string;
  is_deleted?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  sections?: unknown[] | null;
  assessments?: unknown[] | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalArray(value: unknown): value is unknown[] | null | undefined {
  return value === undefined || value === null || Array.isArray(value);
}

function isOptionalBoolean(value: unknown): value is boolean | null | undefined {
  return value === undefined || value === null || typeof value === "boolean";
}

/** Validates the runtime Training detail fields used by the read-only approval dossier. */
export function isTrainingApprovalReview(value: unknown): value is TrainingApprovalReview {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.enterprise_id === null || typeof value.enterprise_id === "string") &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.status === "string" &&
    isOptionalString(value.tenant_id) &&
    isOptionalString(value.location_id) &&
    isOptionalString(value.enterprise_name) &&
    isOptionalString(value.description) &&
    isOptionalString(value.subcategory) &&
    isOptionalArray(value.tags) &&
    isOptionalString(value.instructor_id) &&
    isOptionalString(value.delivery_mode) &&
    isOptionalString(value.course_type) &&
    isOptionalString(value.capacity) &&
    isOptionalString(value.price) &&
    isOptionalString(value.currency) &&
    isOptionalBoolean(value.is_deleted) &&
    isOptionalString(value.created_at) &&
    isOptionalString(value.updated_at) &&
    isOptionalArray(value.sections) &&
    isOptionalArray(value.assessments)
  );
}
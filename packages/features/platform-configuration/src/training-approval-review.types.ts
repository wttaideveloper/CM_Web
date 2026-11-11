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
  instructor_name?: string | null;
  instructor_bio?: string | null;
  instructor_photo?: string | null;
  instructor_credentials?: string | null;
  instructor?: {
    id?: string | null;
    name?: string | null;
    bio?: string | null;
    role?: string | null;
  } | null;
  delivery_mode?: string | null;
  course_type?: string | null;
  capacity?: string | null;
  price?: string | null;
  currency?: string | null;
  promo_price?: string | null;
  coupon_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  time_zone?: string | null;
  duration?: string | null;
  enrolment_start?: string | null;
  enrolment_end?: string | null;
  venue?: string | null;
  address?: string | null;
  meeting_link?: string | null;
  meeting_provider?: string | null;
  meeting_platform?: string | null;
  learning_objectives?: unknown[] | string | null;
  requirements?: string | null;
  prerequisites?: unknown[] | string | null;
  target_audience?: string | null;
  level?: string | null;
  difficulty_level?: string | null;
  primary_image?: string | null;
  gallery_images?: unknown[] | null;
  promotional_video?: string | null;
  promotional_video_url?: string | null;
  documents?: unknown[] | null;
  notes_documents?: unknown[] | null;
  notes_pdf_url?: string | null;
  faqs?: Array<{ question?: string; answer?: string; q?: string; a?: string }> | null;
  form_configuration_id?: string | null;
  form_configuration_version_id?: string | null;
  custom_values?: Record<string, unknown> | Array<Record<string, unknown>> | null;
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

function isOptionalStringOrNumber(value: unknown): value is string | number | null | undefined {
  return value === undefined || value === null || typeof value === "string" || typeof value === "number";
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
    isOptionalStringOrNumber(value.capacity) &&
    isOptionalStringOrNumber(value.price) &&
    isOptionalString(value.currency) &&
    isOptionalBoolean(value.is_deleted) &&
    isOptionalString(value.created_at) &&
    isOptionalString(value.updated_at) &&
    isOptionalArray(value.sections) &&
    isOptionalArray(value.assessments)
  );
}
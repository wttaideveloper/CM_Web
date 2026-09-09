/**
 * Runtime-validated Program dossier used by the Platform Admin approval review.
 * Mirrors the documented `ProgramResponse` schema (chat.wisdomtooth.tech/api/docs)
 * — the same fields returned by `GET /api/v1/programs/{program_id}`.
 */

export type ProgramApprovalReview = {
  id: string;
  enterprise_id: string | null;
  enterprise_name?: string | null;
  title: string;
  description?: string | null;
  category: string;
  delivery_mode?: string | null;
  price?: string | null;
  status: string;
  is_deleted?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  phases?: unknown[] | null;
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

/** Validates the runtime Program detail fields used by the read-only approval dossier. */
export function isProgramApprovalReview(value: unknown): value is ProgramApprovalReview {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.enterprise_id === null || typeof value.enterprise_id === "string") &&
    typeof value.title === "string" &&
    typeof value.category === "string" &&
    typeof value.status === "string" &&
    isOptionalString(value.enterprise_name) &&
    isOptionalString(value.description) &&
    isOptionalString(value.delivery_mode) &&
    isOptionalString(value.price) &&
    isOptionalBoolean(value.is_deleted) &&
    isOptionalString(value.created_at) &&
    isOptionalString(value.updated_at) &&
    isOptionalArray(value.phases)
  );
}
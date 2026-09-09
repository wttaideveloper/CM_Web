/** Super Admin Training Form Configuration — global or enterprise-assigned, reorderable sections/fields, mapped to TrainingCreate. */

export type TrainingFormFieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "datetime" | "url" | "checkbox";

export interface TrainingFormField {
  id: string;
  key: string; // maps to TrainingCreate field, e.g. "title", "category", "custom.delivery_mode"
  label: string;
  type: TrainingFormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select/multiselect
  order: number;
}

export interface TrainingFormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: TrainingFormField[];
}

export interface TrainingFormConfig {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "active" | "inactive" | "retired";
  is_global: boolean;
  enterprise_ids: string[]; // empty if global
  sections: TrainingFormSection[];
  version_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateTrainingFormConfigPayload {
  title: string;
  description?: string | null;
  is_global?: boolean;
  enterprise_ids?: string[];
  sections: TrainingFormSection[];
}

export class TrainingFormConfigApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

const ADMIN_BASE = "/api/v1/trainings/form-configuration/admin";
const ACTIVE_PATH = "/api/v1/trainings/form-configuration/active";

function uid() { return Math.random().toString(36).slice(2, 9); }

export function createEmptySection(order: number): TrainingFormSection {
  return { id: uid(), title: `Section ${order + 1}`, order, fields: [] };
}
export function createEmptyField(order: number): TrainingFormField {
  return { id: uid(), key: `custom_field_${order + 1}`, label: `Field ${order + 1}`, type: "text", required: false, order };
}

async function handleRes<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new TrainingFormConfigApiError(txt || `${fallback} (HTTP ${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/** Super Admin: list all configs — returns [] on 404 until backend adds trainings form-config (events has it). */
export async function listTrainingFormConfigs(): Promise<TrainingFormConfig[]> {
  const res = await fetch(`${ADMIN_BASE}/`, { credentials: "include", cache: "no-store" });
  if (res.status === 404) {
    const alt = await fetch(`/api/v1/admin/training-form-configurations/`, { credentials: "include", cache: "no-store" });
    if (alt.ok) return handleRes<TrainingFormConfig[]>(alt, "load training form configs");
    if (alt.status === 404) return [];
    return handleRes<TrainingFormConfig[]>(alt, "load training form configs");
  }
  if (res.status === 404) return [];
  return handleRes<TrainingFormConfig[]>(res, "load training form configs");
}

/** Enterprise: active config resolves selective → global → legacy */
export async function getTrainingFormConfigActive(): Promise<TrainingFormConfig | null> {
  const res = await fetch(ACTIVE_PATH, { credentials: "include", cache: "no-store" });
  if (res.status === 404) return null; // no config yet → static form fallback
  if (!res.ok) throw new TrainingFormConfigApiError(`Unable to load active form (HTTP ${res.status})`, res.status);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as TrainingFormConfig;
}

export async function getTrainingFormConfig(configId: string): Promise<TrainingFormConfig> {
  // local-only ids (created before backend exists) are already in draft state
  if (configId === "new" || configId.startsWith("local-")) throw new TrainingFormConfigApiError("Local draft — save to persist", 404);
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, { credentials: "include", cache: "no-store" });
  return handleRes<TrainingFormConfig>(res, "load training form config");
}

export async function createTrainingFormConfig(payload: CreateTrainingFormConfigPayload): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<TrainingFormConfig>(res, "create training form config");
}

export async function updateTrainingFormConfig(configId: string, payload: Partial<CreateTrainingFormConfigPayload>): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<TrainingFormConfig>(res, "update training form config");
}

export async function publishTrainingFormConfig(configId: string): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/publish`, { method: "POST", credentials: "include" });
  return handleRes<TrainingFormConfig>(res, "publish training form config");
}
export async function activateTrainingFormConfig(configId: string): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/activate`, { method: "POST", credentials: "include" });
  return handleRes<TrainingFormConfig>(res, "activate training form config");
}
export async function deactivateTrainingFormConfig(configId: string): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/deactivate`, { method: "POST", credentials: "include" });
  return handleRes<TrainingFormConfig>(res, "deactivate training form config");
}
export async function assignTrainingFormConfig(configId: string, enterpriseIds: string[]): Promise<TrainingFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/assignments`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enterprise_ids: enterpriseIds }),
  });
  return handleRes<TrainingFormConfig>(res, "assign training form config");
}

/** Maps custom_values from dynamic form to TrainingCreate payload keys. Known keys map directly; unknown go to custom_values. */
export function mapCustomValuesToTrainingPayload(customValues: Record<string, unknown>, tenantId: string, enterpriseId: string) {
  const known = ["title", "description", "category", "subcategory", "tags", "instructor_id", "requirements", "primary_image", "gallery_images", "promotional_video", "delivery_mode", "course_type", "duration", "start_date", "end_date", "enrolment_start", "enrolment_end", "time_zone", "capacity", "price", "currency", "promo_price", "coupon_code", "requires_approval", "access_duration_days"];
  const payload: Record<string, unknown> = { tenant_id: tenantId, enterprise_id: enterpriseId, custom_values: customValues };
  for (const k of known) if (customValues[k] !== undefined) payload[k] = customValues[k];
  return payload;
}

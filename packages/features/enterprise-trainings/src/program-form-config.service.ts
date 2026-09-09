/** Super Admin Program Form Configuration — global or enterprise-assigned, reorderable sections/fields, mapped to ProgramCreate. */

export type ProgramFormFieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "datetime" | "url" | "checkbox";

export interface ProgramFormField {
  id: string;
  key: string; // maps to ProgramCreate field, e.g. "title", "category", "custom.delivery_mode"
  label: string;
  type: ProgramFormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select/multiselect
  order: number;
}

export interface ProgramFormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: ProgramFormField[];
}

export interface ProgramFormConfig {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "active" | "inactive" | "retired";
  is_global: boolean;
  enterprise_ids: string[]; // empty if global
  sections: ProgramFormSection[];
  version_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateProgramFormConfigPayload {
  title: string;
  description?: string | null;
  is_global?: boolean;
  enterprise_ids?: string[];
  sections: ProgramFormSection[];
}

export class ProgramFormConfigApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

const ADMIN_BASE = "/api/v1/programs/form-configuration/admin";
const ACTIVE_PATH = "/api/v1/programs/form-configuration/active";

function uid() { return Math.random().toString(36).slice(2, 9); }

export function createEmptyProgramSection(order: number): ProgramFormSection {
  return { id: uid(), title: `Section ${order + 1}`, order, fields: [] };
}
export function createEmptyProgramField(order: number): ProgramFormField {
  return { id: uid(), key: `custom_field_${order + 1}`, label: `Field ${order + 1}`, type: "text", required: false, order };
}

async function handleRes<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ProgramFormConfigApiError(txt || `${fallback} (HTTP ${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/** Super Admin: list all configs — returns [] on 404 until backend adds programs form-config (events has it). */
export async function listProgramFormConfigs(): Promise<ProgramFormConfig[]> {
  const res = await fetch(`${ADMIN_BASE}/`, { credentials: "include", cache: "no-store" });
  if (res.status === 404) {
    const alt = await fetch(`/api/v1/admin/program-form-configurations/`, { credentials: "include", cache: "no-store" });
    if (alt.ok) return handleRes<ProgramFormConfig[]>(alt, "load program form configs");
    if (alt.status === 404) return [];
    return handleRes<ProgramFormConfig[]>(alt, "load program form configs");
  }
  if (res.status === 404) return [];
  return handleRes<ProgramFormConfig[]>(res, "load program form configs");
}

/** Enterprise: active config resolves selective → global → legacy */
export async function getProgramFormConfigActive(): Promise<ProgramFormConfig | null> {
  const res = await fetch(ACTIVE_PATH, { credentials: "include", cache: "no-store" });
  if (res.status === 404) return null; // no config yet → static form fallback
  if (!res.ok) throw new ProgramFormConfigApiError(`Unable to load active form (HTTP ${res.status})`, res.status);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ProgramFormConfig;
}

export async function getProgramFormConfig(configId: string): Promise<ProgramFormConfig> {
  // local-only ids (created before backend exists) are already in draft state
  if (configId === "new" || configId.startsWith("local-")) throw new ProgramFormConfigApiError("Local draft — save to persist", 404);
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, { credentials: "include", cache: "no-store" });
  return handleRes<ProgramFormConfig>(res, "load program form config");
}

export async function createProgramFormConfig(payload: CreateProgramFormConfigPayload): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<ProgramFormConfig>(res, "create program form config");
}

export async function updateProgramFormConfig(configId: string, payload: Partial<CreateProgramFormConfigPayload>): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<ProgramFormConfig>(res, "update program form config");
}

export async function publishProgramFormConfig(configId: string): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/publish`, { method: "POST", credentials: "include" });
  return handleRes<ProgramFormConfig>(res, "publish program form config");
}
export async function activateProgramFormConfig(configId: string): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/activate`, { method: "POST", credentials: "include" });
  return handleRes<ProgramFormConfig>(res, "activate program form config");
}
export async function deactivateProgramFormConfig(configId: string): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/deactivate`, { method: "POST", credentials: "include" });
  return handleRes<ProgramFormConfig>(res, "deactivate program form config");
}
export async function assignProgramFormConfig(configId: string, enterpriseIds: string[]): Promise<ProgramFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/assignments`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enterprise_ids: enterpriseIds }),
  });
  return handleRes<ProgramFormConfig>(res, "assign program form config");
}

/** Maps custom_values from dynamic form to ProgramCreate payload keys. Known keys map directly; unknown go to custom_values. */
export function mapCustomValuesToProgramPayload(customValues: Record<string, unknown>, tenantId: string, enterpriseId: string) {
  const known = ["title", "description", "category", "subcategory", "tags", "instructor_id", "requirements", "primary_image", "gallery_images", "promotional_video", "delivery_mode", "course_type", "duration", "start_date", "end_date", "enrolment_start", "enrolment_end", "time_zone", "capacity", "price", "currency", "promo_price", "coupon_code", "requires_approval", "access_duration_days"];
  const payload: Record<string, unknown> = { tenant_id: tenantId, enterprise_id: enterpriseId, custom_values: customValues };
  for (const k of known) if (customValues[k] !== undefined) payload[k] = customValues[k];
  return payload;
}


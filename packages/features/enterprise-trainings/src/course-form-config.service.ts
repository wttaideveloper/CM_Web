/** Super Admin Course Form Configuration — global or enterprise-assigned, reorderable sections/fields, mapped to CourseCreate. */

export type CourseFormFieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "datetime" | "url" | "checkbox";

export interface CourseFormField {
  id: string;
  key: string; // maps to CourseCreate field, e.g. "title", "category", "custom.delivery_mode"
  label: string;
  type: CourseFormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string | null;
  options?: string[]; // for select/multiselect
  validation?: { minLength?: number | null; maxLength?: number | null; min?: number | null; max?: number | null; pattern?: string | null } | null;
  order: number;
}

export interface CourseFormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: CourseFormField[];
}

export interface CourseFormConfig {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "active" | "inactive" | "retired";
  is_global: boolean;
  enterprise_ids: string[]; // empty if global
  sections: CourseFormSection[];
  version_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateCourseFormConfigPayload {
  title: string;
  description?: string | null;
  is_global?: boolean;
  enterprise_ids?: string[];
  sections: CourseFormSection[];
}

export class CourseFormConfigApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

const ADMIN_BASE = "/api/v1/courses/form-configuration/admin";
const ACTIVE_PATH = "/api/v1/courses/form-configuration/active";

function uid() { return Math.random().toString(36).slice(2, 9); }

export function createEmptyCourseSection(order: number): CourseFormSection {
  return { id: uid(), title: `Section ${order + 1}`, order, fields: [] };
}
export function createEmptyCourseField(order: number): CourseFormField {
  return { id: uid(), key: `custom_field_${order + 1}`, label: `Field ${order + 1}`, type: "text", required: false, order };
}

async function handleRes<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new CourseFormConfigApiError(txt || `${fallback} (HTTP ${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/** Super Admin: list all configs — returns [] on 404 until backend adds courses form-config (events has it). */
export async function listCourseFormConfigs(): Promise<CourseFormConfig[]> {
  const res = await fetch(`${ADMIN_BASE}/`, { credentials: "include", cache: "no-store" });
  if (res.status === 404) {
    const alt = await fetch(`/api/v1/admin/course-form-configurations/`, { credentials: "include", cache: "no-store" });
    if (alt.ok) return handleRes<CourseFormConfig[]>(alt, "load course form configs");
    if (alt.status === 404) return [];
    return handleRes<CourseFormConfig[]>(alt, "load course form configs");
  }
  if (res.status === 404) return [];
  return handleRes<CourseFormConfig[]>(res, "load course form configs");
}

/** Enterprise: active config resolves selective → global → legacy — handles both simple and full platform shapes. */
export async function getCourseFormConfigActive(): Promise<CourseFormConfig | null> {
  const res = await fetch(ACTIVE_PATH, { credentials: "include", cache: "no-store" });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw new CourseFormConfigApiError(`Unable to load active form (HTTP ${res.status})`, res.status);
  const text = await res.text();
  if (!text) return null;
  const raw = JSON.parse(text) as unknown;
  if (raw && typeof raw === "object" && "draft_version" in (raw as Record<string, unknown>)) {
    const full = raw as Record<string, unknown>;
    const draft = (full.draft_version ?? (full as Record<string, unknown>).published_version) as Record<string, unknown> | null | undefined;
    if (draft && Array.isArray((draft as Record<string, unknown>).sections)) {
      const sections = ((draft as Record<string, unknown>).sections as Array<Record<string, unknown>>).map((sec, sIdx) => ({
        id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
        title: typeof sec.label === "string" ? sec.label : typeof sec.title === "string" ? sec.title : `Section ${sIdx + 1}`,
        description: typeof sec.description === "string" ? sec.description : null,
        order: typeof sec.position === "number" ? sec.position : sIdx,
        fields: Array.isArray(sec.fields) ? (sec.fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
          id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
          key: typeof fld.stable_key === "string" && fld.stable_key ? fld.stable_key.replace(/^core_/, "") : typeof fld.core_key === "string" && fld.core_key ? fld.core_key : `custom_field_${fIdx}`,
          label: typeof fld.label === "string" ? fld.label : `Field ${fIdx + 1}`,
          type: (typeof fld.renderer === "string" ? fld.renderer : typeof fld.type === "string" ? fld.type : "text") as CourseFormFieldType,
          required: Boolean(fld.required),
          placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
          helpText: typeof fld.help_text === "string" ? fld.help_text : typeof (fld as Record<string, unknown>).helpText === "string" ? (fld as Record<string, unknown>).helpText as string : null,
          options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : typeof o.value === "string" ? o.value : String(o.value ?? "")) : undefined,
          validation: fld.validation as CourseFormField["validation"],
          order: typeof fld.position === "number" ? fld.position : fIdx,
        })) : [],
      }));
      return {
        id: typeof full.id === "string" ? full.id : "active",
        title: typeof full.name === "string" ? full.name : typeof (full as Record<string, unknown>).title === "string" ? (full as Record<string, unknown>).title as string : "Active Course Form",
        description: typeof full.description === "string" ? full.description : null,
        status: "active",
        is_global: (full as Record<string, unknown>).scope === "global" ? true : true,
        enterprise_ids: [],
        sections,
        version_id: draft && typeof (draft as Record<string, unknown>).id === "string" ? (draft as Record<string, unknown>).id as string : null,
        created_at: typeof full.created_at === "string" ? full.created_at : null,
        updated_at: typeof full.updated_at === "string" ? full.updated_at : null,
      } as CourseFormConfig;
    }
  }
  return raw as CourseFormConfig;
}

export async function getCourseFormConfig(configId: string): Promise<CourseFormConfig> {
  // local-only ids (created before backend exists) are already in draft state
  if (configId === "new" || configId.startsWith("local-")) throw new CourseFormConfigApiError("Local draft — save to persist", 404);
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, { credentials: "include", cache: "no-store" });
  return handleRes<CourseFormConfig>(res, "load course form config");
}

export async function createCourseFormConfig(payload: CreateCourseFormConfigPayload): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<CourseFormConfig>(res, "create course form config");
}

export async function updateCourseFormConfig(configId: string, payload: Partial<CreateCourseFormConfigPayload>): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<CourseFormConfig>(res, "update course form config");
}

export async function publishCourseFormConfig(configId: string): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/publish`, { method: "POST", credentials: "include" });
  return handleRes<CourseFormConfig>(res, "publish course form config");
}
export async function activateCourseFormConfig(configId: string): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/activate`, { method: "POST", credentials: "include" });
  return handleRes<CourseFormConfig>(res, "activate course form config");
}
export async function deactivateCourseFormConfig(configId: string): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/deactivate`, { method: "POST", credentials: "include" });
  return handleRes<CourseFormConfig>(res, "deactivate course form config");
}
export async function assignCourseFormConfig(configId: string, enterpriseIds: string[]): Promise<CourseFormConfig> {
  const res = await fetch(`${ADMIN_BASE}/${encodeURIComponent(configId)}/assignments`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enterprise_ids: enterpriseIds }),
  });
  return handleRes<CourseFormConfig>(res, "assign course form config");
}

/** Maps custom_values from dynamic form to CourseCreate payload keys. Known keys map directly; unknown go to custom_values. */
export function mapCustomValuesToCoursePayload(customValues: Record<string, unknown>, tenantId: string, enterpriseId: string) {
  const known = ["title", "description", "category", "subcategory", "tags", "instructor_id", "requirements", "primary_image", "gallery_images", "promotional_video", "delivery_mode", "course_type", "duration", "start_date", "end_date", "enrolment_start", "enrolment_end", "time_zone", "capacity", "price", "currency", "promo_price", "coupon_code", "requires_approval", "access_duration_days"];
  const payload: Record<string, unknown> = { tenant_id: tenantId, enterprise_id: enterpriseId, custom_values: customValues };
  for (const k of known) if (customValues[k] !== undefined) payload[k] = customValues[k];
  return payload;
}


/** Super Admin Training Form Configuration — global or enterprise-assigned, reorderable sections/fields, mapped to TrainingCreate. */

export type TrainingFormFieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date" | "datetime" | "time" | "url" | "checkbox";

function labelToKey(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  const map: Record<string, string> = {
    "title": "title", "description": "description", "category": "category", "subcategory": "subcategory", "tags": "tags", "learning objectives": "learning_objectives", "requirements": "requirements",
    "start date": "start_date", "end date": "end_date", "start time": "start_time", "end time": "end_time", "enrolment start": "enrolment_start", "enrolment end": "enrolment_end", "time zone": "time_zone", "duration": "duration", "access duration (days)": "access_duration_days",
    "delivery mode": "delivery_mode", "course type": "course_type", "location": "location_id", "venue": "venue", "address": "address", "meeting link": "meeting_link", "delivery instructions": "delivery_instructions", "instructor": "instructor_id", "instructor name": "instructor_name", "instructor bio": "instructor_bio", "level": "level", "language": "language",
    "price": "price", "currency": "currency", "promo price": "promo_price", "coupon code": "coupon_code",
    "capacity": "capacity", "requires approval": "requires_approval", "access expiry": "access_expiry_type", "expiry days": "access_expiry_days", "group enrolment": "group_enrolment", "max group size": "max_group_size",
    "primary image": "primary_image", "gallery images": "gallery_images", "documents": "documents", "videos": "promotional_video",
    "prerequisites": "prerequisites", "release rule": "release_rule", "scheduled publication": "scheduled_publication", "randomise": "randomise", "is mandatory": "is_mandatory",
    "subtitle": "subtitle", "faqs": "faqs", "faq": "faqs", "instructor photo": "instructor_photo", "instructor credentials": "instructor_credentials", "credentials": "instructor_credentials", "badges": "badges", "badge": "badges",
  };
  return map[normalized] ?? null;
}
function getTrainingFieldKey(fld: Record<string, unknown>, fallbackIdx: number): string {
  const stable = typeof fld.stable_key === "string" ? fld.stable_key : typeof fld.stableKey === "string" ? fld.stableKey : "";
  const core = typeof fld.core_key === "string" ? fld.core_key : typeof fld.coreKey === "string" ? fld.coreKey : "";
  const rawLabel = typeof fld.label === "string" ? fld.label : "";
  // Generic custom stableKeys (field-custom-*) carry no key identity — resolve via label (Tags → tags etc.)
  if (stable.startsWith("field-custom-") && rawLabel) {
    const byLabel = labelToKey(rawLabel);
    if (byLabel) return byLabel;
    return stable;
  }
  const derived = stable ? stable.replace(/^(core_|custom_)/, "") : core ? core.replace(/^(core_|custom_)/, "") : typeof fld.key === "string" ? fld.key.replace(/^(core_|custom_)/, "") : "";
  if (derived) return derived;
  if (rawLabel) {
    const byLabel = labelToKey(rawLabel);
    if (byLabel) return byLabel;
  }
  return `custom_field_${fallbackIdx}`;
}

const TRAINING_FORM_SEEDED_NAMES = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"];

/** Resolves a section title, replacing generic/empty labels with seeded names — shared by active and historical mapping. */
function resolveTrainingSectionTitle(sec: Record<string, unknown>, sIdx: number): string {
  const rawLabel = typeof sec.label === "string" && sec.label.trim() ? sec.label.trim() : typeof sec.title === "string" && sec.title.trim() ? sec.title.trim() : typeof sec.name === "string" && sec.name.trim() ? sec.name.trim() : "";
  const t = rawLabel || "";
  if (!t || t === "Section" || /^Section \d+$/.test(t)) return TRAINING_FORM_SEEDED_NAMES[sIdx] ?? `Section ${sIdx + 1}`;
  return t;
}

/** Maps raw form fields → TrainingFormField with stable/core key normalization — shared by active and historical mapping. */
function mapTrainingFormFields(fields: unknown): TrainingFormField[] {
  return Array.isArray(fields) ? (fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
    id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
    key: getTrainingFieldKey(fld as Record<string, unknown>, fIdx),
    label: typeof fld.label === "string" && fld.label ? fld.label : typeof fld.title === "string" && fld.title ? fld.title : `Field ${fIdx + 1}`,
    type: (typeof fld.renderer === "string" ? fld.renderer : typeof fld.type === "string" ? fld.type : "text") as TrainingFormFieldType,
    required: Boolean(fld.required),
    placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
    helpText: typeof fld.help_text === "string" ? fld.help_text : typeof fld.helpText === "string" ? fld.helpText as string : null,
    options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : typeof o.value === "string" ? o.value : String(o.value ?? "")) : undefined,
    validation: fld.validation as TrainingFormField["validation"],
    order: typeof fld.position === "number" ? fld.position : typeof fld.order === "number" ? fld.order as number : fIdx,
  })) : [];
}

/** Maps a simple-shape form config (sections at top level) into TrainingFormSection[] with seeded names + normalized keys. */
function mapSimpleTrainingFormSections(rawSections: Array<Record<string, unknown>>): TrainingFormSection[] {
  return rawSections.map((sec, sIdx) => ({
    id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
    title: resolveTrainingSectionTitle(sec, sIdx),
    description: typeof sec.description === "string" && sec.description.trim() ? sec.description : undefined,
    order: typeof sec.position === "number" ? sec.position : typeof sec.order === "number" ? sec.order as number : sIdx,
    fields: mapTrainingFormFields(sec.fields),
  }));
}

export interface TrainingFormField {
  id: string;
  key: string; // maps to TrainingCreate field, e.g. "title", "category", "custom.delivery_mode"
  label: string;
  type: TrainingFormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string | null;
  options?: string[]; // for select/multiselect
  validation?: { minLength?: number | null; maxLength?: number | null; min?: number | null; max?: number | null; pattern?: string | null } | null;
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

/** Enterprise: historical form for edit — immutable version used when training was created, never the current active. */
export async function getTrainingHistoricalFormConfiguration(trainingId: string): Promise<TrainingFormConfig | null> {
  const res = await fetch(`/api/v1/trainings/${encodeURIComponent(trainingId)}/form-configuration`, { credentials: "include", cache: "no-store" });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw new TrainingFormConfigApiError(`Unable to load historical form (HTTP ${res.status})`, res.status);
  const text = await res.text();
  if (!text) return null;
  const raw = JSON.parse(text) as unknown;
  if (raw === null) return null;
  // Reuse active mapping for full shape
  if (raw && typeof raw === "object" && "draft_version" in (raw as Record<string, unknown>)) {
    const full = raw as Record<string, unknown>;
    const draft = (full.draft_version ?? (full as Record<string, unknown>).published_version) as Record<string, unknown> | null | undefined;
    if (draft && Array.isArray((draft as Record<string, unknown>).sections)) {
      const seededNamesH = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"];
      const sections = ((draft as Record<string, unknown>).sections as Array<Record<string, unknown>>).map((sec, sIdx) => {
        const rawT = typeof sec.label === "string" && sec.label.trim() ? sec.label.trim() : typeof sec.title === "string" && sec.title.trim() ? sec.title.trim() : "";
        const title = !rawT || rawT === "Section" || /^Section \d+$/.test(rawT) ? seededNamesH[sIdx] ?? `Section ${sIdx + 1}` : rawT;
        return {
          id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
          title,
          description: typeof sec.description === "string" && sec.description.trim() ? sec.description : null,
          order: typeof sec.position === "number" ? sec.position : sIdx,
              fields: Array.isArray(sec.fields) ? (sec.fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
                id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
                key: getTrainingFieldKey(fld as Record<string, unknown>, fIdx),
            label: typeof fld.label === "string" ? fld.label : `Field ${fIdx + 1}`,
            type: (typeof fld.renderer === "string" ? fld.renderer : typeof fld.type === "string" ? fld.type : "text") as TrainingFormFieldType,
            required: Boolean(fld.required),
            placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
            helpText: typeof fld.help_text === "string" ? fld.help_text : null,
            options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : String(o.value ?? "")) : undefined,
            validation: fld.validation as TrainingFormField["validation"],
            order: typeof fld.position === "number" ? fld.position : fIdx,
          })) : [],
        };
      });
      return { id: typeof full.id === "string" ? full.id : trainingId, title: typeof full.name === "string" ? full.name : "Historical Training Form", description: null, status: "active", is_global: true, enterprise_ids: [], sections, version_id: draft && typeof (draft as Record<string, unknown>).id === "string" ? (draft as Record<string, unknown>).id as string : null, created_at: null, updated_at: null } as TrainingFormConfig;
    }
  }
  // Simple shape — sections at top level (no draft_version wrapper). Normalize the same way
  // as the active path so section titles seed and stable/core keys map to TrainingCreate fields.
  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).sections)) {
    const simple = raw as Record<string, unknown>;
    return {
      id: typeof simple.id === "string" ? simple.id : trainingId,
      title: typeof simple.title === "string" && simple.title ? simple.title : typeof simple.name === "string" && simple.name ? simple.name : "Historical Training Form",
      description: typeof simple.description === "string" ? simple.description : null,
      status: (typeof simple.status === "string" ? simple.status : "active") as TrainingFormConfig["status"],
      is_global: true,
      enterprise_ids: Array.isArray(simple.enterprise_ids) ? simple.enterprise_ids as string[] : [],
      sections: mapSimpleTrainingFormSections(simple.sections as Array<Record<string, unknown>>),
      version_id: typeof simple.version_id === "string" ? simple.version_id : typeof simple.versionId === "string" ? simple.versionId as string : null,
      created_at: typeof simple.created_at === "string" ? simple.created_at : null,
      updated_at: typeof simple.updated_at === "string" ? simple.updated_at : null,
    } as TrainingFormConfig;
  }
  return raw as TrainingFormConfig;
}

/** Enterprise: active config resolves selective → global → legacy — handles both simple and full platform shapes + global fallback. */
export async function getTrainingFormConfigActive(): Promise<TrainingFormConfig | null> {
  // 1) Try the dedicated active resolver (simple or full shape)
  const res = await fetch(ACTIVE_PATH, { credentials: "include", cache: "no-store" });
  if (res.status !== 404 && res.status !== 204) {
    if (!res.ok) throw new TrainingFormConfigApiError(`Unable to load active form (HTTP ${res.status})`, res.status);
    const text = await res.text();
    if (text) {
      const raw = JSON.parse(text) as unknown;
      if (raw && typeof raw === "object" && "draft_version" in (raw as Record<string, unknown>)) {
        const full = raw as Record<string, unknown>;
        const draft = ((full as Record<string, unknown>).published_version ?? full.draft_version) as Record<string, unknown> | null | undefined;
        if (draft && Array.isArray((draft as Record<string, unknown>).sections)) {
          const sections = ((draft as Record<string, unknown>).sections as Array<Record<string, unknown>>).map((sec, sIdx) => {
            const seededNames = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"];
            const rawLabel = typeof sec.label === "string" ? sec.label.trim() : "";
            const rawTitle = typeof sec.title === "string" ? sec.title.trim() : "";
            const rawName = typeof sec.name === "string" ? sec.name.trim() : "";
            let title = rawLabel || rawTitle || rawName || "";
            if (!title || title === "Section" || /^Section \d+$/.test(title)) title = seededNames[sIdx] ?? `Section ${sIdx + 1}`;
            return {
              id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
              title,
              description: typeof sec.description === "string" && sec.description.trim() ? sec.description : null,
              order: typeof sec.position === "number" ? sec.position : typeof sec.order === "number" ? sec.order : sIdx,
              fields: Array.isArray(sec.fields) ? (sec.fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
                id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
                key: getTrainingFieldKey(fld as Record<string, unknown>, fIdx),
                label: typeof fld.label === "string" ? fld.label : `Field ${fIdx + 1}`,
                type: (typeof fld.renderer === "string" ? fld.renderer : typeof fld.type === "string" ? fld.type : "text") as TrainingFormFieldType,
                required: Boolean(fld.required),
                placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
                helpText: typeof fld.help_text === "string" ? fld.help_text : typeof (fld as Record<string, unknown>).helpText === "string" ? (fld as Record<string, unknown>).helpText as string : null,
                options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : typeof o.value === "string" ? o.value : String(o.value ?? "")) : undefined,
                validation: fld.validation as TrainingFormField["validation"],
                order: typeof fld.position === "number" ? fld.position : fIdx,
              })) : [],
            };
          });
          return {
            id: typeof full.id === "string" ? full.id : "active",
            title: typeof full.name === "string" ? full.name : typeof (full as Record<string, unknown>).title === "string" ? (full as Record<string, unknown>).title as string : "Active Training Form",
            description: typeof full.description === "string" ? full.description : null,
            status: "active",
            is_global: (full as Record<string, unknown>).scope === "global" ? true : true,
            enterprise_ids: [],
            sections,
            version_id: draft && typeof (draft as Record<string, unknown>).id === "string" ? (draft as Record<string, unknown>).id as string : null,
            created_at: typeof full.created_at === "string" ? full.created_at : null,
            updated_at: typeof full.updated_at === "string" ? full.updated_at : null,
          } as TrainingFormConfig;
        }
      }
      // Check if raw itself is a simple TrainingFormConfig with sections at top level (map generic "Section" → seeded names like draft_version branch)
      if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).sections)) {
        const simple = raw as Record<string, unknown>;
        const seededSimple = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"];
        const rawSections = simple.sections as Array<Record<string, unknown>>;
        const mapped: TrainingFormSection[] = rawSections.map((sec, sIdx) => {
          const rawL = typeof sec.label === "string" && sec.label.trim() ? sec.label.trim() : typeof (sec as Record<string, unknown>).title === "string" && ((sec as Record<string, unknown>).title as string).trim() ? ((sec as Record<string, unknown>).title as string).trim() : typeof sec.name === "string" && sec.name.trim() ? sec.name.trim() : "";
          let t = rawL || "";
          if (!t || t === "Section" || /^Section \d+$/.test(t)) t = seededSimple[sIdx] ?? `Section ${sIdx + 1}`;
          return {
            id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
            title: t,
            description: typeof sec.description === "string" && sec.description.trim() ? sec.description : undefined,
            order: typeof sec.position === "number" ? sec.position : typeof (sec as Record<string, unknown>).order === "number" ? (sec as Record<string, unknown>).order as number : sIdx,
            fields: Array.isArray(sec.fields) ? (sec.fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
              id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
              key: getTrainingFieldKey(fld as Record<string, unknown>, fIdx),
              label: typeof fld.label === "string" && fld.label ? fld.label : typeof (fld as Record<string, unknown>).title === "string" && (fld as Record<string, unknown>).title ? (fld as Record<string, unknown>).title as string : `Field ${fIdx + 1}`,
              type: (typeof (fld as Record<string, unknown>).renderer === "string" ? (fld as Record<string, unknown>).renderer : typeof fld.type === "string" ? fld.type : "text") as TrainingFormFieldType,
              required: Boolean(fld.required),
              placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
              helpText: typeof (fld as Record<string, unknown>).help_text === "string" ? (fld as Record<string, unknown>).help_text as string : typeof (fld as Record<string, unknown>).helpText === "string" ? (fld as Record<string, unknown>).helpText as string : null,
              options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : typeof o.value === "string" ? o.value : String(o.value ?? "")) : undefined,
              validation: (fld as Record<string, unknown>).validation as TrainingFormField["validation"],
              order: typeof (fld as Record<string, unknown>).position === "number" ? (fld as Record<string, unknown>).position as number : typeof (fld as Record<string, unknown>).order === "number" ? (fld as Record<string, unknown>).order as number : fIdx,
            })) : [],
          };
        });
        return {
          id: typeof simple.id === "string" ? simple.id : "active",
          title: typeof simple.title === "string" && simple.title ? simple.title : typeof simple.name === "string" && simple.name ? simple.name as string : "Active Training Form",
          description: typeof simple.description === "string" ? simple.description : null,
          status: (typeof simple.status === "string" ? simple.status : "active") as TrainingFormConfig["status"],
          is_global: true,
          enterprise_ids: Array.isArray(simple.enterprise_ids) ? simple.enterprise_ids as string[] : [],
          sections: mapped,
          version_id: typeof simple.version_id === "string" ? simple.version_id : typeof (simple as Record<string, unknown>).versionId === "string" ? (simple as Record<string, unknown>).versionId as string : null,
          created_at: typeof simple.created_at === "string" ? simple.created_at : null,
          updated_at: typeof simple.updated_at === "string" ? simple.updated_at : null,
        } as TrainingFormConfig;
      }
      if (raw && typeof raw === "object" && Object.keys(raw as Record<string, unknown>).length > 0) {
        // Non-empty object without sections but with id — treat as config (empty sections will fallback)
        if (typeof (raw as Record<string, unknown>).id === "string") return raw as TrainingFormConfig;
      }
    }
  }
  // 2) Fallback: fetch global active from the full platform list (super admin creates here)
  try {
    const listRes = await fetch(`/api/v1/admin/training-form-configurations/`, { credentials: "include", cache: "no-store" });
    if (listRes.ok) {
      const list = (await listRes.json()) as unknown;
      const items = Array.isArray(list) ? list : Array.isArray((list as Record<string, unknown>).items) ? (list as Record<string, unknown>).items as unknown[] : [];
      const activeGlobal = (items as Array<Record<string, unknown>>).find(i => i.is_active === true || i.is_global === true || (i.scope === "global" && (i.status === "published" || i.status === "active")));
      if (activeGlobal && typeof activeGlobal.id === "string") {
        const detailRes = await fetch(`/api/v1/admin/training-form-configurations/${encodeURIComponent(activeGlobal.id)}`, { credentials: "include", cache: "no-store" });
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as unknown;
          // Reuse the same full-shape mapping via recursive call by faking a raw with draft_version
          const fakeRaw: Record<string, unknown> = { ...(detail as Record<string, unknown>), draft_version: (detail as Record<string, unknown>).published_version ?? (detail as Record<string, unknown>).draft_version };
          if (fakeRaw.draft_version && typeof fakeRaw.draft_version === "object" && Array.isArray((fakeRaw.draft_version as Record<string, unknown>).sections)) {
            const draft = fakeRaw.draft_version as Record<string, unknown>;
            const seededNames2 = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"];
            const sections = (draft.sections as Array<Record<string, unknown>>).map((sec, sIdx) => {
              const rawL = typeof sec.label === "string" && sec.label.trim() ? sec.label.trim() : typeof sec.title === "string" && sec.title.trim() ? sec.title.trim() : "";
              let t2 = rawL || "";
              if (!t2 || t2 === "Section" || /^Section \d+$/.test(t2)) t2 = seededNames2[sIdx] ?? `Section ${sIdx + 1}`;
              return {
                id: typeof sec.id === "string" ? sec.id : `sec-${sIdx}`,
                title: t2,
                description: typeof sec.description === "string" && sec.description.trim() ? sec.description : null,
                order: typeof sec.position === "number" ? sec.position : typeof sec.order === "number" ? sec.order : sIdx,
              fields: Array.isArray(sec.fields) ? (sec.fields as Array<Record<string, unknown>>).map((fld, fIdx) => ({
                id: typeof fld.id === "string" ? fld.id : `fld-${fIdx}`,
                key: getTrainingFieldKey(fld as Record<string, unknown>, fIdx),
                label: typeof fld.label === "string" ? fld.label : `Field ${fIdx + 1}`,
                type: (typeof fld.renderer === "string" ? fld.renderer : typeof fld.type === "string" ? fld.type : "text") as TrainingFormFieldType,
                required: Boolean(fld.required),
                placeholder: typeof fld.placeholder === "string" ? fld.placeholder : undefined,
                helpText: typeof fld.help_text === "string" ? fld.help_text : null,
                options: Array.isArray(fld.options) ? (fld.options as Array<Record<string, unknown>>).map(o => typeof o.label === "string" ? o.label : String(o.value ?? "")) : undefined,
                validation: fld.validation as TrainingFormField["validation"],
                order: typeof fld.position === "number" ? fld.position : fIdx,
              })) : [],
            };
          });
            return {
              id: typeof fakeRaw.id === "string" ? fakeRaw.id : "active",
              title: typeof fakeRaw.name === "string" ? fakeRaw.name : "Active Training Form",
              description: typeof fakeRaw.description === "string" ? fakeRaw.description : null,
              status: "active",
              is_global: true,
              enterprise_ids: [],
              sections,
              version_id: draft && typeof draft.id === "string" ? draft.id : null,
              created_at: null,
              updated_at: null,
            } as TrainingFormConfig;
          }
        }
      }
    }
  } catch {
    // fallback failed — return null to show static form
  }
  return null;
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

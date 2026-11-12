import type {
  ActiveEventFormCompositeConfig,
  ActiveEventFormConfiguration,
  ActiveEventFormField,
  ActiveEventFormFieldOption,
  ActiveEventFormFieldValidation,
  ActiveEventFormSection,
} from "./events.service.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null { return value === null || typeof value === "string"; }
function isNullableFiniteNumber(value: unknown): value is number | null | undefined { return value === undefined || value === null || (typeof value === "number" && Number.isFinite(value)); }

function normalizeEventRenderer(typeValue: unknown, rendererValue: unknown): string {
  const raw = typeof rendererValue === "string" && rendererValue.trim() ? rendererValue : typeof typeValue === "string" ? typeValue : "text";
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    short_text: "text", text_input: "text", long_text: "textarea", rich_text_editor: "rich_text",
    dropdown: "select", radio_group: "radio", checkbox_group: "multi_select", reference_url: "url",
    url_input: "url", additional_images: "media_upload", image_uploader: "media_upload",
    supporting_document: "file_upload", document_uploader: "file_upload", video_input: "video",
    ticket_type_list: "ticket_types", session_list: "sessions", registration_question_list: "registration_fields",
  };
  return aliases[normalized] ?? normalized;
}

const coreFieldAliases: Record<string, string> = {
  event_currency: "currency",
  ticket_type_list: "ticket_types",
  session_list: "sessions",
  registration_question_list: "registration_questions",
  registration_fields: "registration_questions",
};

const coreFieldKeys = new Set([
  "title", "description", "category", "subcategory", "tags", "organiser_name", "organiser_contact",
  "start_date", "start_datetime", "end_date", "end_datetime", "duration_type", "registration_cutoff",
  "registration_open_at", "registration_close_at", "timezone", "time_zone", "event_type", "delivery_mode",
  "pricing_type", "meeting_provider", "meeting_link", "price", "currency", "capacity", "min_participants",
  "max_participants", "primary_image", "gallery_images", "videos", "documents", "venue", "location", "location_id",
  "ticket_types", "sessions", "registration_questions", "registration_fields", "custom_fields", "media",
]);

function canonicalFieldKey(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return coreFieldAliases[normalized] ?? normalized;
}

/** Normalizes both the legacy flat and active-common definition envelopes. */
export function normalizeEventFormContract(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const sections = Array.isArray(value.sections)
    ? value.sections
    : isRecord(value.definition) && Array.isArray(value.definition.sections)
      ? value.definition.sections
      : null;
  if (!sections) return value;

  return {
    ...value,
    configuration_id: typeof value.configuration_id === "string" ? value.configuration_id : typeof value.form_id === "string" ? value.form_id : typeof value.id === "string" ? value.id : "active-event-form",
    version_id: typeof value.version_id === "string" ? value.version_id : typeof value.revision === "number" ? `revision-${value.revision}` : typeof value.version === "number" ? `version-${value.version}` : "active-event-form-version",
    name: typeof value.name === "string" ? value.name : typeof value.title === "string" ? value.title : typeof value.form_name === "string" ? value.form_name : "Active Event Form",
    scope: value.scope === "selective" ? "selective" : "global",
    version: typeof value.version === "number" ? value.version : typeof value.revision === "number" ? value.revision : 1,
    sections: sections.filter(isRecord).map((section, sectionIndex) => ({
      ...section,
      id: typeof section.id === "string" ? section.id : `section-${sectionIndex + 1}`,
      stable_key: typeof section.stable_key === "string" ? section.stable_key : typeof section.key === "string" ? section.key : `section_${sectionIndex + 1}`,
      label: typeof section.label === "string" ? section.label : typeof section.title === "string" ? section.title : `Section ${sectionIndex + 1}`,
      description: typeof section.description === "string" ? section.description : null,
      position: Number.isInteger(section.position) ? section.position : sectionIndex + 1,
      is_enabled: section.is_enabled !== false && section.enabled !== false,
      fields: Array.isArray(section.fields) ? section.fields.filter(isRecord).map((field, fieldIndex) => {
        const typeValue = typeof field.type === "string" ? field.type : field.field_type;
        const renderer = normalizeEventRenderer(typeValue, field.renderer);
        const rawStableKey = typeof field.stable_key === "string" ? field.stable_key : typeof field.key === "string" ? field.key : null;
        const declaredKey = canonicalFieldKey(field.core_key ?? field.stable_key ?? field.key);
        const rendererCoreKey = renderer === "ticket_types" ? "ticket_types" : renderer === "sessions" ? "sessions" : renderer === "registration_fields" ? "registration_questions" : renderer === "media_upload" && declaredKey === "primary_image" ? "primary_image" : null;
        const inferredCoreKey = declaredKey && coreFieldKeys.has(declaredKey) ? declaredKey : rendererCoreKey;
        const explicitSource = field.source === "core" || field.source === "custom" ? field.source : null;
        const isCoreField = explicitSource === "core" || (explicitSource === null && (field.system === true || inferredCoreKey !== null));
        const options = Array.isArray(field.options) ? field.options.flatMap((option, optionIndex) => {
          if (typeof option === "string") return [{ value: option, label: option, position: optionIndex + 1 }];
          return isRecord(option) && typeof (option.value ?? option.label) === "string"
            ? [{ value: String(option.value ?? option.label), label: String(option.label ?? option.value), position: Number.isInteger(option.position) ? Number(option.position) : optionIndex + 1 }]
            : [];
        }) : [];
        const rawValidation = isRecord(field.validation) ? field.validation : {};
        const visibility = field.visibility === "enterprise_admin_only" || field.visibility === "internal" ? "admin_only" : "published";
        return {
          ...field,
          id: typeof field.id === "string" ? field.id : `field-${sectionIndex + 1}-${fieldIndex + 1}`,
          source: isCoreField ? "core" : "custom",
          core_key: isCoreField ? canonicalFieldKey(field.core_key) ?? inferredCoreKey : null,
          stable_key: isCoreField ? canonicalFieldKey(rawStableKey) : rawStableKey,
          label: typeof field.label === "string" ? field.label : `Field ${fieldIndex + 1}`,
          renderer,
          value_type: typeof field.value_type === "string" ? field.value_type : renderer === "number" ? "number" : renderer === "multi_select" ? "string[]" : "string",
          required: field.required === true,
          is_enabled: field.is_enabled !== false && field.enabled !== false,
          position: Number.isInteger(field.position) ? field.position : Number.isInteger(field.order) ? Number(field.order) : fieldIndex + 1,
          placeholder: typeof field.placeholder === "string" ? field.placeholder : null,
          help_text: typeof field.help_text === "string" ? field.help_text : null,
          options,
          validation: rawValidation,
          composite_config: {
            ...(isRecord(field.composite_config) ? field.composite_config : {}),
            frontend_settings: {
              ...(isRecord(field.composite_config) && isRecord(field.composite_config.frontend_settings) ? field.composite_config.frontend_settings : {}),
              content_visibility: visibility,
            },
          },
        };
      }) : [],
    })),
  };
}

function isActiveEventFormFieldOption(value: unknown): value is ActiveEventFormFieldOption { return isRecord(value) && typeof value.value === "string" && typeof value.label === "string" && Number.isInteger(value.position); }
function isActiveEventFormFieldValidation(value: unknown): value is ActiveEventFormFieldValidation { return isRecord(value) && isNullableFiniteNumber(value.min_length) && isNullableFiniteNumber(value.max_length) && isNullableFiniteNumber(value.min) && isNullableFiniteNumber(value.max) && (value.pattern === undefined || isNullableString(value.pattern)); }
function isActiveEventFormCompositeConfig(value: unknown): value is ActiveEventFormCompositeConfig | null { return value === null || (isRecord(value) && (value.enabled_fields === undefined || isStringArray(value.enabled_fields)) && (value.required_fields === undefined || isStringArray(value.required_fields)) && (value.frontend_settings === undefined || value.frontend_settings === null || isRecord(value.frontend_settings))); }
export function isActiveEventFormField(value: unknown): value is ActiveEventFormField { return isRecord(value) && typeof value.id === "string" && (value.source === "core" || value.source === "custom") && isNullableString(value.core_key) && isNullableString(value.stable_key) && typeof value.label === "string" && typeof value.renderer === "string" && typeof value.value_type === "string" && typeof value.required === "boolean" && Number.isInteger(value.position) && (value.is_enabled === undefined || typeof value.is_enabled === "boolean") && isNullableString(value.placeholder) && isNullableString(value.help_text) && Array.isArray(value.options) && value.options.every(isActiveEventFormFieldOption) && isActiveEventFormFieldValidation(value.validation) && isActiveEventFormCompositeConfig(value.composite_config ?? null); }
function isActiveEventFormSection(value: unknown): value is ActiveEventFormSection { return isRecord(value) && typeof value.id === "string" && typeof value.stable_key === "string" && typeof value.label === "string" && isNullableString(value.description) && Number.isInteger(value.position) && typeof value.is_enabled === "boolean" && Array.isArray(value.fields) && value.fields.every(isActiveEventFormField); }

export function isActiveEventFormConfiguration(value: unknown): value is ActiveEventFormConfiguration {
  return isRecord(value) && typeof value.configuration_id === "string" && typeof value.version_id === "string" && typeof value.name === "string" && (value.scope === "global" || value.scope === "selective") && Number.isInteger(value.version) && Array.isArray(value.sections) && value.sections.every(isActiveEventFormSection);
}

import type { TrainingFormFieldInput, TrainingFormSectionInput } from "../model/training-form-configuration-api.types";

export type NewBuilderAudience = "enterprise" | "mobile";
export type NewBuilderFieldType = "short_answer" | "long_paragraph" | "number" | "dropdown" | "checkboxes" | "radio" | "tags" | "datetime" | "link_upload";
/** One editable Training form field belonging only to the blank builder. */
export interface NewBuilderField {
  id: string;
  label: string;
  type: NewBuilderFieldType;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  visibility: Record<NewBuilderAudience, boolean>;
  options: string[];
}
/** One independently enabled section in the blank builder. */
export interface NewBuilderSection { id: string; title: string; enabled: boolean; fields: NewBuilderField[]; }
/** Local draft state shown by the blank builder. */
export interface NewBuilderConfiguration { name: string; description: string; sections: NewBuilderSection[]; }
/** Undo checkpoint includes the created server ID so undoing the first save is safe. */
export interface NewBuilderSnapshot { configuration: NewBuilderConfiguration; savedId: string | null; }

const rendererByType: Record<NewBuilderFieldType, { renderer: string; valueType: string }> = {
  short_answer: { renderer: "text", valueType: "string" },
  long_paragraph: { renderer: "textarea", valueType: "string" },
  number: { renderer: "number", valueType: "number" },
  dropdown: { renderer: "select", valueType: "string" },
  checkboxes: { renderer: "multi_select", valueType: "string[]" },
  radio: { renderer: "select", valueType: "string" },
  tags: { renderer: "text", valueType: "string" },
  datetime: { renderer: "datetime", valueType: "string" },
  link_upload: { renderer: "url", valueType: "string" },
};

/** Converts the isolated builder state into the existing Training draft API format. */
export function toNewBuilderSections(sections: NewBuilderSection[]): TrainingFormSectionInput[] {
  return sections.map((section, sectionIndex): TrainingFormSectionInput => ({
    stable_key: `section_${toStableKey(section.title)}_${section.id.slice(-8)}`,
    label: section.title.trim(), description: null, position: sectionIndex + 1, is_enabled: section.enabled,
    fields: section.fields.map((field, fieldIndex): TrainingFormFieldInput => {
      const type = rendererByType[field.type];
      return {
        source: "custom", core_key: null,
        stable_key: `custom_${toStableKey(field.label)}_${field.id.slice(-8)}`,
        label: field.label.trim(), renderer: type.renderer, value_type: type.valueType,
        required: field.required && field.enabled && section.enabled,
        is_enabled: field.enabled, position: fieldIndex + 1,
        placeholder: field.placeholder || null, help_text: null,
        options: field.options.filter((option) => option.trim()).map((label, index) => ({ value: toStableKey(label), label: label.trim(), position: index + 1 })),
        validation: {},
        composite_config: {
          builder_visibility: { enterprise: field.visibility.enterprise, mobile: field.visibility.mobile },
          frontend_settings: {
            ...(field.type === "tags" ? { input_mode: "tags" as const } : {}),
            ...(field.type === "link_upload" ? { upload: { allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "application/pdf"], max_file_size_mb: 10 } } : {}),
          },
        },
      };
    }),
  }));
}

function toStableKey(value: string): string {
  return value.toLocaleLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

export const newBuilderFieldTypes: ReadonlyArray<{ value: NewBuilderFieldType; label: string }> = [
  { value: "short_answer", label: "Short answer" },
  { value: "long_paragraph", label: "Long paragraph" },
  { value: "number", label: "Number or amount" },
  { value: "dropdown", label: "Choose one (dropdown)" },
  { value: "checkboxes", label: "Choose multiple (checkboxes)" },
  { value: "radio", label: "Choose one (radio)" },
  { value: "tags", label: "Tags (add multiple items)" },
  { value: "datetime", label: "Date and time" },
  { value: "link_upload", label: "Link or upload file" },
];

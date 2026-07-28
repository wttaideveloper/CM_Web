import type {
  CreateOnboardingFormPayload,
  FormStatus,
  OnboardingFormDto,
  OnboardingFormField,
  OnboardingFormSection,
  RegistrationType,
} from "../types/onboarding-form.types";
import type { BuilderField, BuilderFieldType, BuilderForm, BuilderSection, FieldDraft } from "../types/builder.types";
import { enterpriseTypeOptions, registrationTypeOptions } from "./builder.constants";

export function createBuilderId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugifyFieldKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAllFieldKeys(sections: BuilderSection[]) {
  return new Set(
    sections.flatMap((section) => section.fields.map((field) => field.field_key).filter(Boolean)),
  );
}

export function createUniqueFieldKey(baseValue: string, sections: BuilderSection[]) {
  const baseKey = slugifyFieldKey(baseValue) || "new_field";
  const existingKeys = getAllFieldKeys(sections);

  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  let counter = 2;
  let nextKey = `${baseKey}_${counter}`;

  while (existingKeys.has(nextKey)) {
    counter += 1;
    nextKey = `${baseKey}_${counter}`;
  }

  return nextKey;
}

export function supportsOptions(fieldType: BuilderFieldType) {
  return fieldType === "dropdown" || fieldType === "checkbox" || fieldType === "radio";
}

export function parseOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinOptions(options: string[]) {
  return options.join(", ");
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function createFieldDraft(field?: BuilderField): FieldDraft {
  return {
    label: field?.label ?? "New Field",
    field_key: field?.field_key ?? "new_field",
    field_type: field?.field_type ?? "text",
    placeholder: field?.placeholder ?? "",
    help_text: field?.help_text ?? "",
    required: field?.required ?? false,
    visible: field?.visible ?? true,
    optionsText: field ? joinOptions(field.options) : "",
  };
}

export function createField(overrides: Partial<BuilderField>): BuilderField {
  return {
    id: createBuilderId(),
    order: 1,
    label: "New Field",
    field_key: "new_field",
    field_type: "text",
    placeholder: "",
    help_text: "",
    required: false,
    locked: false,
    visible: true,
    options: [],
    ...overrides,
  };
}

export function createSection(title: string, fields: BuilderField[] = []): BuilderSection {
  return {
    id: createBuilderId(),
    title,
    order: 1,
    fields,
  };
}

export function normalizeSections(sections: BuilderSection[]) {
  return sections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}

export function normalizeFields(fields: BuilderField[]) {
  return fields.map((field, index) => ({
    ...field,
    order: index + 1,
  }));
}

export function findDuplicateFieldKey(sections: BuilderSection[]) {
  const seen = new Set<string>();

  for (const section of sections) {
    for (const field of section.fields) {
      const key = field.field_key.trim();
      if (!key) continue;

      if (seen.has(key)) {
        return key;
      }

      seen.add(key);
    }
  }

  return null;
}

function isBackendId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toApiField(field: BuilderField) {
  const payload = {
    label: field.label,
    field_key: field.field_key,
    field_type: field.field_type,
    placeholder: field.placeholder,
    help_text: field.help_text,
    required: field.required,
    locked: field.locked,
    visible: field.visible,
    order: field.order,
    options: field.options,
  };

  return field.id && isBackendId(field.id) ? { id: field.id, ...payload } : payload;
}

function toApiSection(section: BuilderSection) {
  const payload = {
    title: section.title,
    order: section.order,
    fields: section.fields.map(toApiField),
  };

  return section.id && isBackendId(section.id) ? { id: section.id, ...payload } : payload;
}

function hydrateFields(
  fields: OnboardingFormDto["sections"][number]["fields"],
  fallbackFields: BuilderField[] = [],
): BuilderField[] {
  if (!fields.length) {
    return fallbackFields;
  }

  return fields.map((field, index) => ({
    id: field.id ?? fallbackFields[index]?.id ?? createBuilderId(),
    order: field.order ?? index + 1,
    label: field.label,
    field_key: field.field_key,
    field_type: field.field_type,
    placeholder: field.placeholder,
    help_text: field.help_text,
    required: field.required,
    locked: field.locked,
    visible: field.visible,
    options: field.options ?? [],
  }));
}

export function hydrateSections(
  sections: OnboardingFormDto["sections"],
  fallbackSections: BuilderSection[] = [],
): BuilderSection[] {
  if (!sections.length) {
    return fallbackSections;
  }

  return sections.map((section, index) => {
    const fallbackSection = fallbackSections[index];

    return {
      id: section.id ?? fallbackSection?.id ?? createBuilderId(),
      title: section.title,
      order: section.order ?? index + 1,
      fields: hydrateFields(section.fields, fallbackSection?.fields ?? []),
    };
  });
}

export function sortFields<T extends Pick<OnboardingFormField, "order">>(fields: T[]) {
  return [...fields].sort((left, right) => left.order - right.order);
}

export function sortSections<T extends OnboardingFormSection>(sections: T[]) {
  return [...sections]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      fields: sortFields(section.fields),
    }));
}

export function isVisibleField(field: OnboardingFormField) {
  return field.visible;
}

export function toRegistrationTypeValue(
  value: (typeof registrationTypeOptions)[number],
): Exclude<RegistrationType, null> {
  return value === "Individual (Professional)" ? "individual" : "enterprise";
}

export function toRegistrationTypeLabel(
  value: RegistrationType | undefined,
): (typeof registrationTypeOptions)[number] {
  return value === "individual" ? "Individual (Professional)" : "Enterprise (Business)";
}

export function toEnterpriseTypeOption(value: string | null | undefined) {
  return enterpriseTypeOptions.includes(value as (typeof enterpriseTypeOptions)[number])
    ? (value as (typeof enterpriseTypeOptions)[number])
    : "Healthcare";
}

export function buildFormPayload(
  form: BuilderForm,
  status: FormStatus,
  enterpriseType: string | null,
  registrationType: (typeof registrationTypeOptions)[number],
): CreateOnboardingFormPayload {
  return {
    name: form.name,
    description: form.description,
    entity_type: form.entity_type,
    enterprise_type: enterpriseType,
    registration_type: toRegistrationTypeValue(registrationType),
    status,
    sections: form.sections.map(toApiSection),
  };
}

export function createEmptyForm(): BuilderForm {
  return {
    name: "",
    description: "",
    entity_type: "enterprise",
    enterprise_type: "Healthcare",
    registration_type: "enterprise",
    status: "draft",
    sections: [],
  };
}

export function createEditPlaceholderForm(): BuilderForm {
  const sections = [
    {
      ...createSection("Business Info", [
        createField({
          label: "Enterprise Name",
          field_key: "business_legal_name",
          field_type: "text",
          placeholder: "Pinnacle Wellness Co.",
          help_text: "Legal enterprise name displayed across onboarding screens.",
          required: true,
          locked: false,
          visible: true,
        }),
        createField({
          label: "Trading / DBA Name",
          field_key: "business_short_name",
          field_type: "text",
          placeholder: "Pinnacle Wellness",
          help_text: "Short business name used in forms and summaries.",
          required: false,
          locked: false,
          visible: true,
        }),
      ]),
      order: 1,
    },
    {
      ...createSection("Contact", [
        createField({
          label: "Business Email",
          field_key: "business_email",
          field_type: "email",
          placeholder: "hello@pinnaclewellness.com",
          help_text: "Main email address for business communication.",
          required: true,
        }),
        createField({
          label: "Business Phone",
          field_key: "business_phone",
          field_type: "phone",
          placeholder: "+91 98765 43210",
          help_text: "Primary business contact number.",
          required: true,
        }),
        createField({
          label: "Primary Contact Name",
          field_key: "primary_contact_name",
          field_type: "text",
          placeholder: "Sarah Johnson",
          help_text: "Person responsible for onboarding responses.",
        }),
        createField({
          label: "Primary Contact Title",
          field_key: "primary_contact_title",
          field_type: "text",
          placeholder: "Founder & CEO",
          help_text: "Job title or role of the primary contact.",
        }),
      ]),
      order: 2,
    },
    {
      ...createSection("Address", [
        createField({
          label: "Registered Address",
          field_key: "registered_address",
          field_type: "textarea",
          placeholder: "Registered office address",
          help_text: "Legal registered address for the enterprise.",
        }),
        createField({
          label: "Business Address",
          field_key: "business_address",
          field_type: "textarea",
          placeholder: "Business address",
          help_text: "Operational or mailing address.",
        }),
        createField({
          label: "Communication Address",
          field_key: "communication_address",
          field_type: "textarea",
          placeholder: "Preferred communication address",
          help_text: "Where official communication should be sent.",
        }),
      ]),
      order: 3,
    },
    {
      ...createSection("Branding", [
        createField({
          label: "Logo",
          field_key: "logo_url",
          field_type: "image",
          placeholder: "https://example.com/logo.png",
          help_text: "Brand logo used in headers and cards.",
        }),
        createField({
          label: "Banner",
          field_key: "banner_url",
          field_type: "image",
          placeholder: "https://example.com/banner.png",
          help_text: "Large hero banner image for the enterprise.",
        }),
        createField({
          label: "Brand Color",
          field_key: "brand_color",
          field_type: "text",
          placeholder: "#1F5D4E",
          help_text: "Primary brand accent color.",
        }),
        createField({
          label: "Tagline",
          field_key: "tagline",
          field_type: "text",
          placeholder: "Wellness made simple",
          help_text: "Short brand phrase shown in profiles.",
        }),
      ]),
      order: 4,
    },
  ].map((section, index) => ({
    ...section,
    order: index + 1,
    fields: normalizeFields(section.fields),
  }));

  return {
    name: "Standard Enterprise Onboarding Form",
    description: "Default onboarding form for enterprise owners.",
    entity_type: "enterprise",
    enterprise_type: "Healthcare",
    registration_type: "enterprise",
    status: "draft",
    sections,
  };
}

export function badgeClass(status: FormStatus) {
  return status === "draft"
    ? "bg-[#f1f4f3] text-[#6b7f79]"
    : status === "inactive"
      ? "bg-[#fff3e6] text-[#a15c00]"
      : "bg-[#e8f6ee] text-[#16825b]";
}

export function fieldTypeLabel(fieldType: string) {
  if (fieldType === "textarea") return "Textarea";
  if (fieldType === "dropdown") return "Dropdown";
  if (fieldType === "checkbox") return "Checkbox";
  if (fieldType === "radio") return "Radio";
  if (fieldType === "file") return "File";
  if (fieldType === "image") return "Image";
  return fieldType.toUpperCase();
}

export function statusLabel(status: FormStatus) {
  if (status === "draft") return "Draft";
  if (status === "inactive") return "Inactive";
  if (status === "published") return "Published";
  return status;
}

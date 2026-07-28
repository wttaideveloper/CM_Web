import type { BuilderFieldType } from "../types/builder.types";

export const fieldTypes: readonly BuilderFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "url",
  "date",
  "dropdown",
  "checkbox",
  "radio",
  "file",
  "image",
];

export const enterpriseTypeOptions = [
  "Healthcare",
  "Fitness & Wellness",
  "Nutrition",
  "Mental Health",
  "Education",
  "Retail",
] as const;

export const registrationTypeOptions = [
  "Enterprise (Business)",
  "Individual (Professional)",
] as const;

export const quickAddFieldTypes: Array<{ label: string; type: BuilderFieldType }> = [
  { label: "Text Field", type: "text" },
  { label: "Email", type: "email" },
  { label: "Phone", type: "phone" },
  { label: "Dropdown", type: "dropdown" },
  { label: "File Upload", type: "file" },
  { label: "Web Link", type: "url" },
  { label: "Long Text", type: "textarea" },
  { label: "Date Picker", type: "date" },
  { label: "Checkbox", type: "checkbox" },
];

export const createDraftStorageKey = "ihp:onboarding-forms:create:draft";

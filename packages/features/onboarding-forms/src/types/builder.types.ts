import type { FormStatus, RegistrationType } from "./onboarding-form.types";

export type BuilderFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "url"
  | "date"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "file"
  | "image";

export type BuilderField = {
  id: string;
  order: number;
  label: string;
  field_key: string;
  field_type: BuilderFieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  locked: boolean;
  visible: boolean;
  options: string[];
};

export type BuilderSection = {
  id: string;
  title: string;
  order: number;
  fields: BuilderField[];
};

export type BuilderForm = {
  name: string;
  description: string;
  entity_type: "enterprise";
  enterprise_type: string | null;
  registration_type: RegistrationType;
  status: FormStatus;
  sections: BuilderSection[];
};

export type FieldDraft = {
  label: string;
  field_key: string;
  field_type: BuilderFieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  visible: boolean;
  optionsText: string;
};

export type PreviewScope = "section" | "full";

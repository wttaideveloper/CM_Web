export type FieldType =
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

export type FormStatus = "draft" | "published" | "inactive" | (string & {});

export type OnboardingFormField = {
  id?: string;
  label: string;
  field_key: string;
  field_type: FieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  locked: boolean;
  visible: boolean;
  order: number;
  options: string[];
};

export type OnboardingFormSection = {
  id?: string;
  title: string;
  order: number;
  fields: OnboardingFormField[];
};

export type OnboardingFormDto = {
  id: string;
  name: string;
  description: string;
  entity_type: "enterprise";
  status: FormStatus;
  sections: OnboardingFormSection[];
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
};

export type OnboardingFormListItem = {
  id: string;
  name: string;
  description: string;
  entity_type: "enterprise";
  status: FormStatus;
  sections_count: number;
  fields_count: number;
  assigned_count: number;
  created_at?: string;
  updated_at?: string;
};

export type OnboardingFormListResponse = {
  items: OnboardingFormListItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
};

export type CreateOnboardingFormPayload = {
  name: string;
  description: string;
  entity_type: "enterprise";
  status?: FormStatus;
  sections: OnboardingFormSection[];
};

export type UpdateOnboardingFormPayload = Partial<{
  name: string;
  description: string;
  entity_type: "enterprise";
  status: FormStatus;
  sections: OnboardingFormSection[];
}>;

export type OnboardingFormListParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Temporary Enterprise Admin client for exercising the Forms API through the
 * frontend-relative proxy. It deliberately uses cookie-based authentication.
 */

/** Field kinds shared with the existing Super Admin form builder. */
export type FormFieldType =
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

/** A field in the persisted forms definition. */
export interface FormField {
  id?: string;
  order: number;
  label: string;
  field_key: string;
  field_type: FormFieldType;
  placeholder: string;
  help_text: string;
  required: boolean;
  locked: boolean;
  visible: boolean;
  options: string[];
}

/** A section in the persisted forms definition. */
export interface FormSection {
  id?: string;
  title: string;
  order: number;
  fields: FormField[];
}

/** Definition payload compatible with the existing Super Admin form builder. */
export interface FormDefinition {
  sections: FormSection[];
}

/** A Forms API resource returned by list, create, get, update, or publish requests. */
export interface Form {
  id: string;
  name: string;
  description?: string | null;
  version?: number | null;
  isPublished?: boolean | null;
  deletedAt?: string | null;
  definition?: FormDefinition | null;
  fieldCount?: number | null;
  workflowsSynced?: boolean | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** A historic Forms API version. */
export interface FormVersion {
  id?: string;
  formId?: string;
  version: number;
  definition?: FormDefinition | null;
  fieldCount?: number | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

/** Body accepted by the create and update Forms API endpoints. */
export interface FormPayload {
  name: string;
  description: string;
  definition: FormDefinition;
}

const formsBasePath = "/api/v1/forms";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isForm(value: unknown): value is Form {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isFormVersion(value: unknown): value is FormVersion {
  return isRecord(value) && typeof value.version === "number";
}

function unwrapData(value: unknown): unknown {
  return isRecord(value) && "data" in value ? value.data : value;
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Forms request failed (HTTP ${response.status}).`);
  }

  return response.json() as Promise<unknown>;
}

function parseForm(value: unknown): Form {
  const data = unwrapData(value);

  if (!isForm(data)) {
    throw new Error("Forms API returned an invalid form response.");
  }

  return data;
}

function parseFormList(value: unknown): Form[] {
  const data = unwrapData(value);

  if (!Array.isArray(data) || !data.every(isForm)) {
    throw new Error("Forms API returned an invalid forms list response.");
  }

  return data;
}

function parseFormVersions(value: unknown): FormVersion[] {
  const data = unwrapData(value);

  if (!Array.isArray(data) || !data.every(isFormVersion)) {
    throw new Error("Forms API returned an invalid versions response.");
  }

  return data;
}

/** Lists forms available to the authenticated Enterprise Admin session. */
export async function listForms(): Promise<Form[]> {
  return parseFormList(await requestJson(formsBasePath));
}

/** Creates a form with a persisted builder-compatible definition. */
export async function createForm(payload: FormPayload): Promise<Form> {
  return parseForm(
    await requestJson(formsBasePath, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

/** Retrieves one form by its backend identifier. */
export async function getForm(formId: string): Promise<Form> {
  return parseForm(await requestJson(`${formsBasePath}/${encodeURIComponent(formId)}`));
}

/** Replaces the editable attributes and definition of a form. */
export async function updateForm(formId: string, payload: FormPayload): Promise<Form> {
  return parseForm(
    await requestJson(`${formsBasePath}/${encodeURIComponent(formId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  );
}

/** Publishes a form. Callers should refetch it to inspect the persisted state. */
export async function publishForm(formId: string): Promise<void> {
  const response = await fetch(`${formsBasePath}/${encodeURIComponent(formId)}/publish`, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Forms request failed (HTTP ${response.status}).`);
  }
}

/** Lists persisted versions for one form. */
export async function getFormVersions(formId: string): Promise<FormVersion[]> {
  return parseFormVersions(
    await requestJson(`${formsBasePath}/${encodeURIComponent(formId)}/versions`),
  );
}

/** Creates the initial temporary test definition using the existing builder field schema. */
export function createTestFormDefinition(): FormDefinition {
  return {
    sections: [
      {
        title: "Product details",
        order: 1,
        fields: [
          createField("Product Name", "product_name", "text", true, 1),
          createField("Description", "description", "textarea", false, 2),
          createField("Price", "price", "number", true, 3),
        ],
      },
    ],
  };
}

/** Returns a copy of a definition with the optional SKU test field appended. */
export function addSkuField(definition: FormDefinition): FormDefinition {
  const firstSection = definition.sections[0];

  if (!firstSection) {
    throw new Error("The selected form has no sections to update.");
  }

  return {
    sections: [
      {
        ...firstSection,
        fields: [
          ...firstSection.fields,
          createField("SKU", "sku", "text", false, firstSection.fields.length + 1),
        ],
      },
      ...definition.sections.slice(1),
    ],
  };
}

function createField(
  label: string,
  fieldKey: string,
  fieldType: FormFieldType,
  required: boolean,
  order: number,
): FormField {
  return {
    label,
    field_key: fieldKey,
    field_type: fieldType,
    placeholder: "",
    help_text: "",
    required,
    locked: false,
    visible: true,
    options: [],
    order,
  };
}

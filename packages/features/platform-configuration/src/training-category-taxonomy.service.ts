/** One category or direct subcategory from the backend-owned Training taxonomy. */
export interface TrainingTaxonomyCategory {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string | null;
}

/** Fields accepted when creating a Training category or subcategory. */
export interface TrainingTaxonomyCategoryCreateInput {
  name: string;
  parent_id: string | null;
  description: string | null;
}

/** Fields accepted when renaming or describing a Training taxonomy entry. */
export interface TrainingTaxonomyCategoryUpdateInput {
  name: string;
  description: string | null;
}

export class TrainingTaxonomyApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TrainingTaxonomyApiError";
  }
}

const basePath = "/api/platform-super-admin/training-categories";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

type TrainingTaxonomyCategoryApiRecord = {
  id: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  created_at?: string | null;
};

function isTrainingTaxonomyCategory(value: unknown): value is TrainingTaxonomyCategoryApiRecord {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && (value.parent_id === undefined || isNullableString(value.parent_id))
    && (value.description === undefined || isNullableString(value.description))
    && (value.created_at === undefined || isNullableString(value.created_at));
}

function normalizeTrainingTaxonomyCategory(category: TrainingTaxonomyCategoryApiRecord): TrainingTaxonomyCategory {
  return {
    id: category.id,
    name: category.name,
    parent_id: category.parent_id ?? null,
    description: category.description ?? null,
    created_at: category.created_at ?? null,
  };
}

async function errorFor(response: Response, fallback: string): Promise<TrainingTaxonomyApiError> {
  const body: unknown = await response.json().catch(() => null);
  const message = isRecord(body) && typeof body.detail === "string" ? body.detail : fallback;
  return new TrainingTaxonomyApiError(message, response.status);
}

async function requestCategory(path = "", init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${basePath}${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw await errorFor(response, "Unable to manage Training categories.");
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
}

/** Reads the complete Training taxonomy through the authenticated Super Admin BFF. */
export async function listTrainingTaxonomyCategories(): Promise<readonly TrainingTaxonomyCategory[]> {
  const body = await requestCategory();
  if (!Array.isArray(body) || !body.every(isTrainingTaxonomyCategory)) {
    throw new TrainingTaxonomyApiError("Training Categories returned an invalid taxonomy response.", 200);
  }
  return body.map(normalizeTrainingTaxonomyCategory);
}

/** Adds either a top-level Training category or a direct subcategory. */
export async function createTrainingTaxonomyCategory(input: TrainingTaxonomyCategoryCreateInput): Promise<TrainingTaxonomyCategory> {
  const body = await requestCategory("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!isTrainingTaxonomyCategory(body)) throw new TrainingTaxonomyApiError("Training Categories returned an invalid created category.", 201);
  return normalizeTrainingTaxonomyCategory(body);
}

/** Renames or updates the description without changing the immutable parent relationship. */
export async function updateTrainingTaxonomyCategory(
  categoryId: string,
  input: TrainingTaxonomyCategoryUpdateInput,
): Promise<TrainingTaxonomyCategory> {
  const body = await requestCategory(`/${encodeURIComponent(categoryId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!isTrainingTaxonomyCategory(body)) throw new TrainingTaxonomyApiError("Training Categories returned an invalid updated category.", 200);
  return normalizeTrainingTaxonomyCategory(body);
}

/** Deletes one Training category or subcategory using the backend's dependency rules. */
export async function deleteTrainingTaxonomyCategory(categoryId: string): Promise<void> {
  await requestCategory(`/${encodeURIComponent(categoryId)}`, { method: "DELETE" });
}

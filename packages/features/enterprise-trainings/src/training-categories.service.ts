import { authenticatedFetch } from "@ihp/auth";

/** One backend-owned Training category or direct subcategory. */
export interface TrainingCategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string | null;
}

/** Error returned while loading the backend-owned Training taxonomy. */
export class TrainingCategoriesApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TrainingCategoriesApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

type TrainingCategoryApiRecord = {
  id: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  created_at?: string | null;
};

function isTrainingCategoryApiRecord(value: unknown): value is TrainingCategoryApiRecord {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && (value.parent_id === undefined || isNullableString(value.parent_id))
    && (value.description === undefined || isNullableString(value.description))
    && (value.created_at === undefined || isNullableString(value.created_at));
}

async function createTrainingCategoriesError(response: Response): Promise<TrainingCategoriesApiError> {
  const body: unknown = await response.json().catch(() => null);
  const message = isRecord(body) && typeof body.detail === "string"
    ? body.detail
    : "Unable to load Training categories.";
  return new TrainingCategoriesApiError(message, response.status);
}

/** Loads and validates the Training taxonomy through the authenticated API proxy. */
export async function getTrainingCategories(): Promise<readonly TrainingCategoryOption[]> {
  const response = await authenticatedFetch("/api/v1/training-categories/", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw await createTrainingCategoriesError(response);

  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isTrainingCategoryApiRecord)) {
    throw new TrainingCategoriesApiError("Training Categories returned an invalid taxonomy response.", response.status);
  }
  return body.map((category) => ({
    id: category.id,
    name: category.name,
    parent_id: category.parent_id ?? null,
    description: category.description ?? null,
    created_at: category.created_at ?? null,
  }));
}

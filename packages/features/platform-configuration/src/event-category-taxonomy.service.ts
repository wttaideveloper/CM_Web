/** One category or direct subcategory from the backend-owned Event taxonomy. */
export interface EventTaxonomyCategory {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
}

export interface EventTaxonomyCategoryInput {
  name: string;
  parent_id: string | null;
  description: string | null;
}

export class EventTaxonomyApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "EventTaxonomyApiError";
  }
}

const basePath = "/api/platform-super-admin/event-categories";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEventTaxonomyCategory(value: unknown): value is EventTaxonomyCategory {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && isNullableString(value.parent_id)
    && isNullableString(value.description)
    && typeof value.created_at === "string";
}

async function errorFor(response: Response, fallback: string): Promise<EventTaxonomyApiError> {
  const body = await response.json().catch(() => null) as unknown;
  const message = isRecord(body) && typeof body.detail === "string" ? body.detail : fallback;
  return new EventTaxonomyApiError(message, response.status);
}

async function requestCategory(path = "", init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${basePath}${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) throw await errorFor(response, "Unable to manage Event categories.");
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
}

/** Reads the complete Event taxonomy through the secure Platform BFF. */
export async function listEventTaxonomyCategories(): Promise<readonly EventTaxonomyCategory[]> {
  const body = await requestCategory();
  if (!Array.isArray(body) || !body.every(isEventTaxonomyCategory)) {
    throw new EventTaxonomyApiError("Event Categories returned an invalid taxonomy response.", 200);
  }
  return body;
}

/** Adds either a top-level category or a direct subcategory. */
export async function createEventTaxonomyCategory(input: EventTaxonomyCategoryInput): Promise<EventTaxonomyCategory> {
  const body = await requestCategory("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!isEventTaxonomyCategory(body)) throw new EventTaxonomyApiError("Event Categories returned an invalid created category.", 201);
  return body;
}

/** Updates a category with its complete supported schema, preserving its current parent relationship. */
export async function updateEventTaxonomyCategory(categoryId: string, input: EventTaxonomyCategoryInput): Promise<EventTaxonomyCategory> {
  const body = await requestCategory(`/${encodeURIComponent(categoryId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!isEventTaxonomyCategory(body)) throw new EventTaxonomyApiError("Event Categories returned an invalid updated category.", 200);
  return body;
}

/** Deletes one category; backend lifecycle rules determine whether a parent with children may be removed. */
export async function deleteEventTaxonomyCategory(categoryId: string): Promise<void> {
  await requestCategory(`/${encodeURIComponent(categoryId)}`, { method: "DELETE" });
}

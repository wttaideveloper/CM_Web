/** JSON values returned by an endpoint whose OpenAPI schema is unconstrained. */
export type CommerceJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly CommerceJsonValue[]
  | { readonly [key: string]: CommerceJsonValue };

/** A JSON object with no schema-defined fields. */
export type CommerceRecord = { readonly [key: string]: CommerceJsonValue };

/** Pagination fields used by the documented Commerce collection endpoints. */
export interface CommercePageParams {
  page?: number;
  page_size?: number;
}

/** Date window shared by the documented report and history endpoints. */
export interface CommerceDateRangeParams {
  date_from?: string;
  date_to?: string;
}

/** A paginated response with an endpoint-specific item type. */
export interface CommercePageResponse<T> {
  items: readonly T[];
  total: number;
  page: number;
  page_size: number;
}

/** Validates identifiers used in UUID path parameters before a request is made. */
export function isCommerceUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

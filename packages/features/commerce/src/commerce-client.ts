import { authenticatedFetch } from "@ihp/auth";
import { API_BASE_URL } from "@ihp/shared";
import { readCommerceResponse } from "./commerce-response";
import { buildCommerceUrl, commercePathSegment } from "./commerce-url";

export type CommerceFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CommerceRequestOptions {
  /** Overrides the default same-origin Commerce API base for an application BFF. */
  baseUrl?: string;
  /** Uses an application-specific transport while retaining shared response handling. */
  fetcher?: CommerceFetcher;
  /** Sets the accepted representation for read-only non-JSON resources. */
  accept?: string;
}

/**
 * Performs an authenticated, read-only Commerce request through the existing
 * cookie-backed application transport.
 */
export function commerceGet<T>(path: string, query?: object, options: CommerceRequestOptions = {}): Promise<T> {
  return commerceGetResponse(path, query, options).then((response) => readCommerceResponse<T>(response));
}

/** Performs an authenticated GET and returns the successful response for non-JSON resources. */
export async function commerceGetResponse(path: string, query?: object, options: CommerceRequestOptions = {}): Promise<Response> {
  const request = options.fetcher ?? authenticatedFetch;
  const response = await request(buildCommerceUrl(path, query, options.baseUrl ?? API_BASE_URL), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: options.accept ?? "application/json" },
  });
  if (!response.ok) await readCommerceResponse<never>(response);
  return response;
}

export { commercePathSegment };

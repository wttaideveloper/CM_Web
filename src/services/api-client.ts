import { API_BASE_URL } from "@/lib/api";
import {
  clearMarketplaceDemoSession,
  getMarketplaceChatToken,
  getMarketplaceDemoSession,
  isMarketplaceTokenNearExpiry,
  refreshMarketplaceDemoToken,
  redirectToMarketplaceLogin,
} from "@/services/marketplace-demo-auth.service";

function createAuthError(message: string) {
  const error = new Error(message) as Error & {
    code?: string;
  };

  error.name = "MarketplaceDemoAuthError";
  error.code = "MARKETPLACE_DEMO_AUTH_ERROR";

  return error;
}

function isAuthError(error: unknown) {
  return error instanceof Error && (error as Error & { code?: string }).code === "MARKETPLACE_DEMO_AUTH_ERROR";
}

function buildHeaders(
  initHeaders?: HeadersInit,
  includeJsonContentType = true,
  token?: string,
): Headers {
  const headers = new Headers(initHeaders);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (includeJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function performFetch(
  path: string,
  init?: RequestInit,
  includeJsonContentType = true,
  token?: string,
) {
  const shouldIncludeJsonContentType =
    includeJsonContentType && !(init?.body instanceof FormData) && !(init?.body instanceof Blob);

  const headers = buildHeaders(
    Object.fromEntries(new Headers(init?.headers).entries()),
    shouldIncludeJsonContentType,
    token,
  );

  if (init?.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}

function handleAuthFailure(): never {
  clearMarketplaceDemoSession();
  redirectToMarketplaceLogin();
  throw createAuthError("Marketplace demo session expired. Please sign in again.");
}

async function resolveToken() {
  try {
    return await getMarketplaceChatToken();
  } catch (error) {
    if (isAuthError(error)) {
      handleAuthFailure();
    }

    throw error;
  }
}

export function toHeaders(
  initHeaders?: HeadersInit,
  includeJsonContentType = true,
  token?: string,
): Headers {
  return buildHeaders(initHeaders, includeJsonContentType, token);
}

export async function requestResponse(
  path: string,
  init?: RequestInit,
  includeJsonContentType = true,
  allowRetry = true,
): Promise<Response> {
  const token = await resolveToken();
  const response = await performFetch(path, init, includeJsonContentType, token);

  if (response.status !== 401) {
    return response;
  }

  if (!allowRetry) {
    handleAuthFailure();
  }

  const session = getMarketplaceDemoSession();

  if (!session) {
    handleAuthFailure();
  }

  if (!isMarketplaceTokenNearExpiry(session.expiresAt)) {
    // Keep the retry flow simple and safe: we refresh once on a 401 even if the
    // token looked healthy, then retry the original request exactly one time.
  }

  try {
    await refreshMarketplaceDemoToken();
  } catch {
    handleAuthFailure();
  }

  const retryToken = await resolveToken();
  const retryResponse = await performFetch(path, init, includeJsonContentType, retryToken);

  if (retryResponse.status === 401) {
    handleAuthFailure();
  }

  return retryResponse;
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  includeJsonContentType = true,
): Promise<T> {
  const response = await requestResponse(path, init, includeJsonContentType);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    if (process.env.NODE_ENV !== "production") {
      console.warn("Chat API request failed", {
        path,
        status: response.status,
        errorText,
      });
    }

    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}
